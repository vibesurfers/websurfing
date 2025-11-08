import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { cells, eventQueue } from "@/server/db/schema";

export const cellRouter = createTRPCRouter({
  updateCell: publicProcedure
    .input(z.object({
      rowIndex: z.number(),
      colIndex: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('Updating cell:', input);

      // 1. Update/insert cell
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

      // 2. Add event to queue
      await ctx.db.insert(eventQueue).values({
        eventType: 'cell_update',
        payload: input,
        status: 'pending',
      });

      console.log('Cell update complete, event queued');
      return { success: true };
    }),

  getEvents: publicProcedure
    .query(async ({ ctx }) => {
      const events = await ctx.db
        .select()
        .from(eventQueue)
        .orderBy(eventQueue.createdAt);

      console.log('Fetched events:', events.length);
      return events;
    }),

  getCells: publicProcedure
    .query(async ({ ctx }) => {
      const cellData = await ctx.db
        .select()
        .from(cells)
        .orderBy(cells.rowIndex, cells.colIndex);

      return cellData;
    }),
});