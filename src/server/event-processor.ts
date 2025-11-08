import { db } from "@/server/db";
import { eventQueue, cells } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export class EventProcessor {
  async processPendingEvents() {
    console.log('Processing pending events...');

    const pendingEvents = await db
      .select()
      .from(eventQueue)
      .where(eq(eventQueue.status, 'pending'))
      .limit(10);

    console.log(`Found ${pendingEvents.length} pending events`);

    for (const event of pendingEvents) {
      await this.processEvent(event);
    }

    return { processed: pendingEvents.length };
  }

  private async processEvent(event: { id: string; userId: string; eventType: string; payload: unknown }) {
    try {
      console.log('Processing event:', event.id, event.eventType, 'for user:', event.userId);

      // Mock processing based on event type
      if (event.eventType === 'cell_update') {
        const payload = event.payload as { rowIndex: number, colIndex: number, content: string };

        // Mock "Google search" - just append " (processed by AI)" to content
        const processedContent = `${payload.content} → AI: Weather in NYC is 72°F and sunny`;

        // Update adjacent cell (colIndex + 1) for the same user
        await db.insert(cells).values({
          userId: event.userId,
          rowIndex: payload.rowIndex,
          colIndex: payload.colIndex + 1,
          content: processedContent,
        }).onConflictDoUpdate({
          target: [cells.userId, cells.rowIndex, cells.colIndex],
          set: {
            content: processedContent,
            updatedAt: new Date(),
          }
        });

        console.log(`Processed cell for user ${event.userId}: (${payload.rowIndex}, ${payload.colIndex}) → (${payload.rowIndex}, ${payload.colIndex + 1})`);
      }

      // Mark event as processed
      await db
        .update(eventQueue)
        .set({
          status: 'completed',
          processedAt: new Date(),
        })
        .where(eq(eventQueue.id, event.id));

      console.log('Event marked as completed:', event.id);

    } catch (error) {
      console.error('Error processing event:', event.id, error);

      await db
        .update(eventQueue)
        .set({ status: 'failed' })
        .where(eq(eventQueue.id, event.id));
    }
  }
}