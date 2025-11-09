import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { eventQueue } from "@/server/db/schema";
import { eq, or, and, lt } from "drizzle-orm";

export const adminRouter = createTRPCRouter({
  cleanupStuckEvents: protectedProcedure
    .mutation(async ({ ctx }) => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

      const result = await ctx.db
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

      console.log('[Admin] Cleaned up stuck events');
      return { success: true, message: 'Cleaned up old stuck events' };
    }),

  clearAllPendingEvents: protectedProcedure
    .input(z.object({ sheetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(eventQueue)
        .set({
          status: 'completed',
          processedAt: new Date(),
        })
        .where(
          and(
            eq(eventQueue.sheetId, input.sheetId),
            or(
              eq(eventQueue.status, 'pending'),
              eq(eventQueue.status, 'processing')
            )
          )
        );

      return { success: true };
    }),
});
