import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { cells, eventQueue } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const cellRouter = createTRPCRouter({
  updateCell: protectedProcedure
    .input(z.object({
      rowIndex: z.number(),
      colIndex: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      console.log('Updating cell for user:', userId, input);

      // 1. Update/insert cell
      await ctx.db.insert(cells).values({
        userId,
        rowIndex: input.rowIndex,
        colIndex: input.colIndex,
        content: input.content,
      }).onConflictDoUpdate({
        target: [cells.userId, cells.rowIndex, cells.colIndex],
        set: {
          content: input.content,
          updatedAt: new Date(),
        }
      });

      // 2. Add event to queue
      await ctx.db.insert(eventQueue).values({
        userId,
        eventType: 'cell_update',
        payload: input,
        status: 'pending',
      });

      console.log('Cell update complete, event queued');
      return { success: true };
    }),

  getEvents: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const events = await ctx.db
        .select()
        .from(eventQueue)
        .where(eq(eventQueue.userId, userId))
        .orderBy(eventQueue.createdAt);

      console.log('Fetched events for user:', userId, events.length);
      return events;
    }),

  getCells: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const cellData = await ctx.db
        .select()
        .from(cells)
        .where(eq(cells.userId, userId))
        .orderBy(cells.rowIndex, cells.colIndex);

      return cellData;
    }),
});