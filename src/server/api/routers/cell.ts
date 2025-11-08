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

      // 1. Update/insert cell (temporarily without userId until DB migration)
      await ctx.db.insert(cells).values({
        rowIndex: input.rowIndex,
        colIndex: input.colIndex,
        content: input.content,
      }).onConflictDoUpdate({
        target: [cells.rowIndex, cells.colIndex],
        set: {
          content: input.content,
          updatedAt: new Date(),
        }
      });

      // 2. Add event to queue (temporarily without userId until DB migration)
      await ctx.db.insert(eventQueue).values({
        eventType: 'cell_update',
        payload: input,
        status: 'pending',
      });

      console.log('Cell update complete, event queued');
      return { success: true };
    }),

  getEvents: protectedProcedure
    .query(async ({ ctx }) => {
      // Temporarily fetch all events until DB migration completes
      const events = await ctx.db
        .select()
        .from(eventQueue)
        .orderBy(eventQueue.createdAt);

      console.log('Fetched events:', events.length);
      return events;
    }),

  getCells: protectedProcedure
    .query(async ({ ctx }) => {
      // Temporarily fetch all cells until DB migration completes
      const cellData = await ctx.db
        .select()
        .from(cells)
        .orderBy(cells.rowIndex, cells.colIndex);

      return cellData;
    }),
});