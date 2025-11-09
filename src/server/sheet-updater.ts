import { db } from "@/server/db";
import { sheetUpdates, cells, eventQueue, sheets, columns } from "@/server/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { OperatorController } from "@/server/operators/operator-controller";
import type { BaseEvent, SheetContext } from "@/server/operators/operator-controller";
import { getTemplate } from "@/server/templates/column-templates";
import { templates } from "@/server/db/schema";

export class SheetUpdater {
  private operatorController: OperatorController;

  constructor() {
    this.operatorController = new OperatorController();
  }
  async updateSheet(userId: string, sheetId: string) {
    console.log('Updating sheet for user:', userId, 'sheetId:', sheetId);

    try {
      // Get pending events with row locking to prevent double processing
      const pendingEvents = await db.transaction(async (tx) => {
        // Select pending events with FOR UPDATE to lock them
        // Exclude cancelled events
        const events = await tx
          .select()
          .from(eventQueue)
          .where(and(
            eq(eventQueue.sheet_id, sheetId),
            eq(eventQueue.user_id, userId),
            eq(eventQueue.status, 'pending')
          ))
          .orderBy(eventQueue.created_at)
          .limit(10) // Process max 10 events at once
          .for('update');

        // Mark events as processing to prevent double processing
        if (events.length > 0) {
          const eventIds = events.map(e => e.id);
          await tx
            .update(eventQueue)
            .set({ status: 'processing' })
            .where(inArray(eventQueue.id, eventIds));
        }

        return events;
      });

      console.log(`Found ${pendingEvents.length} pending events`);

      const appliedUpdates: any[] = [];

      // Fetch sheet metadata once for all events
      const sheet = await db.select().from(sheets).where(eq(sheets.id, sheetId)).limit(1);
      const sheetData = sheet[0];

      if (!sheetData) {
        console.error('Sheet not found:', sheetId);
        return { success: false, error: 'Sheet not found', appliedUpdates: [], totalApplied: 0 };
      }

      // Fetch columns for this sheet
      const sheetColumns = await db.select().from(columns).where(eq(columns.sheet_id, sheetId)).orderBy(columns.position);

      for (const event of pendingEvents) {
        try {
          // Extract cell position from event payload
          const payload = event.payload as any;
          const rowIndex = payload.rowIndex ?? 0;
          const colIndex = payload.colIndex ?? 0;

          // Check if row is already complete (all columns filled)
          if (colIndex >= sheetColumns.length - 1) {
            console.log(`Row ${rowIndex} already complete, marking event ${event.id} as completed`);
            try {
              await db
                .update(eventQueue)
                .set({
                  status: 'completed',
                  processed_at: new Date()
                })
                .where(eq(eventQueue.id, event.id));
              console.log(`Successfully marked event ${event.id} as completed`);
            } catch (updateError) {
              console.error(`Failed to mark event ${event.id} as completed:`, updateError);
            }
            continue;
          }

          // Fetch existing row data
          const rowCells = await db.select().from(cells).where(
            and(
              eq(cells.sheet_id, sheetId),
              eq(cells.row_index, rowIndex)
            )
          );

          const rowData: Record<number, string> = {};
          rowCells.forEach(cell => {
            rowData[cell.col_index] = cell.content ?? '';
          });

          // Build sheet context
          let systemPrompt: string | undefined;
          try {
            systemPrompt = sheetData.templateType ? getTemplate(sheetData.templateType as any).systemPrompt : undefined;
          } catch (error) {
            // Template not found in hardcoded templates, try loading from database
            if (sheetData.templateId) {
              const [template] = await db.select({ systemPrompt: templates.systemPrompt }).from(templates).where(eq(templates.id, sheetData.templateId)).limit(1);
              systemPrompt = template?.systemPrompt || undefined;
            }
          }

          const sheetContext: SheetContext = {
            sheetId,
            templateType: sheetData.templateType as any,
            systemPrompt,
            columns: sheetColumns.map(col => ({
              id: col.id,
              title: col.title || '',
              position: col.position,
              dataType: col.data_type ?? 'text',
              operatorType: col.operator_type || null,
              operatorConfig: col.operator_config || null,
              prompt: col.prompt || null,
              dependencies: col.dependencies as number[] | null || null,
              isRequired: col.is_required ?? null,
              defaultValue: col.default_value || null,
            })),
            rowIndex,
            currentColumnIndex: colIndex,
            rowData,
          };

          // Dispatch event to operator controller with context
          const baseEvent: BaseEvent = {
            userId: event.user_id,
            eventId: event.id,
            eventType: event.event_type as any,
            timestamp: event.created_at ?? new Date(),
            data: event.payload,
            sheetContext,
          };

          // Process the event through the operator controller
          await this.operatorController.dispatch(baseEvent);

          console.log(`Processed event ${event.id}: ${event.eventType}`);

        } catch (error) {
          console.error(`Failed to process event ${event.id}:`, error);

          // Mark event as failed with error message
          await db
            .update(eventQueue)
            .set({
              status: 'failed',
              last_error: error instanceof Error ? error.message : String(error),
            })
            .where(eq(eventQueue.id, event.id));
        }
      }

      // Now apply all the pending sheet updates
      const pendingSheetUpdates = await db
        .select()
        .from(sheetUpdates)
        .where(and(
          eq(sheetUpdates.sheet_id, sheetId),
          eq(sheetUpdates.user_id, userId),
          isNull(sheetUpdates.applied_at)
        ))
        .orderBy(sheetUpdates.created_at);

      console.log(`Applying ${pendingSheetUpdates.length} sheet updates`);

      for (const update of pendingSheetUpdates) {
        try {
          // Apply the update to the cells table
          await db.insert(cells).values({
            sheet_id: update.sheet_id,
            user_id: update.user_id,
            row_index: update.row_index,
            col_index: update.col_index,
            content: update.content,
          }).onConflictDoUpdate({
            target: [cells.sheet_id, cells.user_id, cells.row_index, cells.col_index],
            set: {
              content: update.content,
              updated_at: new Date(),
            }
          });

          // Mark the update as applied
          await db
            .update(sheetUpdates)
            .set({ applied_at: new Date() })
            .where(eq(sheetUpdates.id, update.id));

          console.log(`Applied sheet update ${update.id}: (${update.row_index}, ${update.col_index}) = "${update.content}"`);

        } catch (error) {
          console.error(`Failed to apply sheet update ${update.id}:`, error);
        }
      }

      return {
        success: true,
        appliedUpdates,
        totalApplied: pendingSheetUpdates.length,
      };

    } catch (error) {
      console.error('Error updating sheet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        appliedUpdates: [],
        totalApplied: 0,
      };
    }
  }

  async createSheetUpdate(sheetId: string, userId: string, rowIndex: number, colIndex: number, content: string, updateType = 'ai_response') {
    try {
      const newUpdate = await db.insert(sheetUpdates).values({
        sheet_id: sheetId,
        user_id: userId,
        row_index: rowIndex,
        col_index: colIndex,
        content,
        update_type: updateType,
      }).returning();

      console.log(`Created sheet update: (${rowIndex}, ${colIndex}) = "${content}" [${updateType}]`);
      return newUpdate[0];

    } catch (error) {
      console.error('Error creating sheet update:', error);
      throw error;
    }
  }
}