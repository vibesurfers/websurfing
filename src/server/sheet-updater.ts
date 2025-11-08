import { db } from "@/server/db";
import { sheetUpdates, cells, eventQueue } from "@/server/db/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

export class SheetUpdater {
  async updateSheet(userId: string) {
    console.log('Updating sheet for user:', userId);

    try {
      // Get pending events with row locking to prevent double processing
      const pendingEvents = await db.transaction(async (tx) => {
        // Select pending events with FOR UPDATE to lock them
        const events = await tx
          .select()
          .from(eventQueue)
          .where(and(
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

      const appliedUpdates = [];

      for (const event of pendingEvents) {
        try {
          if (event.eventType === 'cell_update') {
            const payload = event.payload as { rowIndex: number; colIndex: number; content: string };

            // Create a sheet update to put the same content in the cell to the right
            const newUpdate = await this.createSheetUpdate(
              userId,
              payload.rowIndex,
              payload.colIndex + 1, // Cell to the right
              payload.content, // Same content
              'auto_copy'
            );

            appliedUpdates.push({
              id: newUpdate.id,
              rowIndex: newUpdate.rowIndex,
              colIndex: newUpdate.colIndex,
              content: newUpdate.content,
              updateType: newUpdate.updateType,
            });

            console.log(`Created sheet update from event ${event.id}: (${payload.rowIndex}, ${payload.colIndex}) → (${payload.rowIndex}, ${payload.colIndex + 1}) = "${payload.content}"`);
          }

          // Mark event as completed
          await db
            .update(eventQueue)
            .set({
              status: 'completed',
              processedAt: new Date()
            })
            .where(eq(eventQueue.id, event.id));

        } catch (error) {
          console.error(`Failed to process event ${event.id}:`, error);

          // Mark event as failed
          await db
            .update(eventQueue)
            .set({ status: 'failed' })
            .where(eq(eventQueue.id, event.id));
        }
      }

      // Now apply all the pending sheet updates
      const pendingSheetUpdates = await db
        .select()
        .from(sheetUpdates)
        .where(and(
          eq(sheetUpdates.userId, userId),
          isNull(sheetUpdates.appliedAt)
        ))
        .orderBy(sheetUpdates.createdAt);

      console.log(`Applying ${pendingSheetUpdates.length} sheet updates`);

      for (const update of pendingSheetUpdates) {
        try {
          // Apply the update to the cells table
          await db.insert(cells).values({
            userId: update.userId,
            rowIndex: update.rowIndex,
            colIndex: update.colIndex,
            content: update.content,
          }).onConflictDoUpdate({
            target: [cells.userId, cells.rowIndex, cells.colIndex],
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

  async createSheetUpdate(userId: string, rowIndex: number, colIndex: number, content: string, updateType = 'ai_response') {
    try {
      const newUpdate = await db.insert(sheetUpdates).values({
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