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
  async updateSheet(userId: string, sheetId: string): Promise<{ success: boolean; error?: string; appliedUpdates: any[]; totalApplied: number }> {
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
            eq(eventQueue.sheetId, sheetId),
            eq(eventQueue.userId, userId),
            eq(eventQueue.status, 'pending')
          ))
          .orderBy(eventQueue.createdAt)
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
      const sheetColumns = await db.select().from(columns).where(eq(columns.sheetId, sheetId)).orderBy(columns.position);

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
                  processedAt: new Date()
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
              eq(cells.sheetId, sheetId),
              eq(cells.rowIndex, rowIndex)
            )
          );

          const rowData: Record<number, string> = {};
          rowCells.forEach(cell => {
            rowData[cell.colIndex] = cell.content ?? '';
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
              dataType: col.dataType ?? 'text',
              operatorType: col.operatorType || null,
              operatorConfig: col.operatorConfig || null,
              prompt: col.prompt || null,
              dependencies: col.dependencies as number[] | null || null,
              isRequired: col.isRequired ?? null,
              defaultValue: col.defaultValue || null,
            })),
            rowIndex,
            currentColumnIndex: colIndex,
            rowData,
          };

          // Dispatch event to operator controller with context
          const baseEvent: BaseEvent = {
            userId: event.userId,
            eventId: event.id,
            eventType: event.eventType as any,
            timestamp: event.createdAt ?? new Date(),
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
              lastError: error instanceof Error ? error.message : String(error),
            })
            .where(eq(eventQueue.id, event.id));
        }
      }

      // Now apply all the pending sheet updates
      const pendingSheetUpdates = await db
        .select()
        .from(sheetUpdates)
        .where(and(
          eq(sheetUpdates.sheetId, sheetId),
          eq(sheetUpdates.userId, userId),
          isNull(sheetUpdates.appliedAt)
        ))
        .orderBy(sheetUpdates.createdAt);

      console.log(`Applying ${pendingSheetUpdates.length} sheet updates`);

      for (const update of pendingSheetUpdates) {
        try {
          // Apply the update to the cells table
          await db.insert(cells).values({
            sheetId: update.sheetId,
            userId: update.userId,
            rowIndex: update.rowIndex,
            colIndex: update.colIndex,
            content: update.content,
          }).onConflictDoUpdate({
            target: [cells.sheetId, cells.userId, cells.rowIndex, cells.colIndex],
            set: {
              content: update.content,
              updatedAt: new Date(),
            }
          });

          // Mark the update as applied
          await db
            .update(sheetUpdates)
            .set({ appliedAt: new Date() })
            .where(eq(sheetUpdates.id, update.id));

          console.log(`Applied sheet update ${update.id}: (${update.rowIndex}, ${update.colIndex}) = "${update.content}"`);

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

  async createSheetUpdate(sheetId: string, userId: string, rowIndex: number, colIndex: number, content: string, updateType = 'ai_response'): Promise<any> {
    try {
      const newUpdate = await db.insert(sheetUpdates).values({
        sheetId: sheetId,
        userId: userId,
        rowIndex: rowIndex,
        colIndex: colIndex,
        content,
        updateType: updateType,
      }).returning();

      console.log(`Created sheet update: (${rowIndex}, ${colIndex}) = "${content}" [${updateType}]`);
      return newUpdate[0];

    } catch (error) {
      console.error('Error creating sheet update:', error);
      throw error;
    }
  }
}