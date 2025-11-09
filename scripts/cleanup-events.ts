import { db } from "@/server/db";
import { eventQueue } from "@/server/db/schema";
import { eq, or, and, lt } from "drizzle-orm";

async function cleanupStuckEvents() {
  console.log('Starting event cleanup...');

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

  const stuckEvents = await db
    .select()
    .from(eventQueue)
    .where(
      and(
        or(
          eq(eventQueue.status, 'processing'),
          eq(eventQueue.status, 'pending')
        ),
        lt(eventQueue.createdAt, twoMinutesAgo)
      )
    );

  console.log(`Found ${stuckEvents.length} stuck events`);

  if (stuckEvents.length > 0) {
    await db
      .update(eventQueue)
      .set({
        status: 'completed',
        processedAt: new Date(),
      })
      .where(
        and(
          or(
            eq(eventQueue.status, 'processing'),
            eq(eventQueue.status, 'pending')
          ),
          lt(eventQueue.createdAt, twoMinutesAgo)
        )
      );

    console.log(`Marked ${stuckEvents.length} events as completed`);
  }

  console.log('Cleanup complete!');
  process.exit(0);
}

cleanupStuckEvents().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
