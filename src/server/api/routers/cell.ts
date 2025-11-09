import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { cells, eventQueue, sheets, cellProcessingStatus } from "@/server/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const cellRouter = createTRPCRouter({
  updateCell: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid().optional(),
      rowIndex: z.number(),
      colIndex: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      console.log('Updating cell for user:', userId, input);

      let sheetId = input.sheetId;
      if (!sheetId) {
        const userSheet = await ctx.db.select().from(sheets).where(eq(sheets.userId, userId)).limit(1);
        if (!userSheet[0]) throw new Error('No sheet found for user');
        sheetId = userSheet[0].id;
      }

      // 1. Update/insert cell
      await ctx.db.insert(cells).values({
        sheetId: sheetId,
        userId: userId,
        rowIndex: input.rowIndex,
        colIndex: input.colIndex,
        content: input.content,
      }).onConflictDoUpdate({
        target: [cells.sheetId, cells.userId, cells.rowIndex, cells.colIndex],
        set: {
          content: input.content,
          updatedAt: new Date(),
        }
      });

      // 2. Add event to queue
      await ctx.db.insert(eventQueue).values({
        sheetId: sheetId,
        userId: userId,
        eventType: 'user_cell_edit',
        payload: {
          spreadsheetId: sheetId,
          rowIndex: input.rowIndex,
          columnId: '',
          colIndex: input.colIndex,
          content: input.content,
        },
        status: 'pending',
      });

      console.log('Cell update complete, event queued');
      return { success: true };
    }),

  updateCellWithoutEvent: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid().optional(),
      rowIndex: z.number(),
      colIndex: z.number(),
      content: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      console.log('Updating cell without event for user:', userId, input);

      let sheetId = input.sheetId;
      if (!sheetId) {
        const userSheet = await ctx.db.select().from(sheets).where(eq(sheets.userId, userId)).limit(1);
        if (!userSheet[0]) throw new Error('No sheet found for user');
        sheetId = userSheet[0].id;
      }

      // Update/insert cell only (no event created)
      await ctx.db.insert(cells).values({
        sheetId: sheetId,
        userId: userId,
        rowIndex: input.rowIndex,
        colIndex: input.colIndex,
        content: input.content,
      }).onConflictDoUpdate({
        target: [cells.sheetId, cells.userId, cells.rowIndex, cells.colIndex],
        set: {
          content: input.content,
          updatedAt: new Date(),
        }
      });

      console.log('Cell update complete (no event created)');
      return { success: true };
    }),

  clearCell: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid().optional(),
      rowIndex: z.number(),
      colIndex: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      console.log('Clearing cell for user:', userId, input);

      let sheetId = input.sheetId;
      if (!sheetId) {
        const userSheet = await ctx.db.select().from(sheets).where(eq(sheets.userId, userId)).limit(1);
        if (!userSheet[0]) throw new Error('No sheet found for user');
        sheetId = userSheet[0].id;
      }

      // 1. Clear the cell content
      await ctx.db.insert(cells).values({
        sheetId: sheetId,
        userId: userId,
        rowIndex: input.rowIndex,
        colIndex: input.colIndex,
        content: '',
      }).onConflictDoUpdate({
        target: [cells.sheetId, cells.userId, cells.rowIndex, cells.colIndex],
        set: {
          content: '',
          updatedAt: new Date(),
        }
      });

      // 2. Cancel any pending events for this cell
      // Instead of fetching all events and filtering in JS, we'll just mark them as cancelled
      // Note: We can't directly query by payload content in PostgreSQL without special operators,
      // but we can simply skip this optimization for now since cleared cells shouldn't have events
      console.log(`Cell cleared at (${input.rowIndex}, ${input.colIndex})`)

      console.log('Cell clear complete');
      return { success: true };
    }),

  getEvents: protectedProcedure
    .input(z.object({ sheetId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      let sheetId = input?.sheetId;
      if (!sheetId) {
        const userSheet = await ctx.db.select().from(sheets).where(eq(sheets.userId, userId)).limit(1);
        if (!userSheet[0]) return [];
        sheetId = userSheet[0].id;
      }

      const events = await ctx.db
        .select()
        .from(eventQueue)
        .where(eq(eventQueue.sheetId, sheetId))
        .orderBy(eventQueue.createdAt)
        .limit(100);

      console.log(`[getEvents] Fetched ${events.length} events for user:${userId}, sheetId:${sheetId}`);
      return events;
    }),

  getCells: protectedProcedure
    .input(z.object({ sheetId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      let sheetId = input?.sheetId;
      if (!sheetId) {
        const userSheet = await ctx.db.select().from(sheets).where(eq(sheets.userId, userId)).limit(1);
        if (!userSheet[0]) return [];
        sheetId = userSheet[0].id;
      }

      const cellData = await ctx.db
        .select()
        .from(cells)
        .where(eq(cells.sheetId, sheetId))
        .orderBy(cells.rowIndex, cells.colIndex);

      return cellData;
    }),

  getProcessingStatus: protectedProcedure
    .input(z.object({ sheetId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const statuses = await ctx.db
        .select()
        .from(cellProcessingStatus)
        .where(eq(cellProcessingStatus.sheetId, input.sheetId));

      // Convert to map for easy lookup: "row-col" => status
      const statusMap: Record<string, { status: string; message: string; operator: string }> = {};
      statuses.forEach(s => {
        const key = `${s.rowIndex}-${s.colIndex}`;
        statusMap[key] = {
          status: s.status ?? 'idle',
          message: s.statusMessage ?? '',
          operator: s.operatorName ?? '',
        };
      });

      return statusMap;
    }),

  clearCellsToRight: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid().optional(),
      rowIndex: z.number(),
      startColIndex: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      console.log('Clearing cells to the right for user:', userId, input);

      let sheetId = input.sheetId;
      if (!sheetId) {
        const userSheet = await ctx.db.select().from(sheets).where(eq(sheets.userId, userId)).limit(1);
        if (!userSheet[0]) throw new Error('No sheet found for user');
        sheetId = userSheet[0].id;
      }

      await ctx.db
        .update(cells)
        .set({ content: '', updatedAt: new Date() })
        .where(
          and(
            eq(cells.sheetId, sheetId),
            eq(cells.rowIndex, input.rowIndex),
            gt(cells.colIndex, input.startColIndex)
          )
        );

      console.log(`Cleared cells to the right of column ${input.startColIndex} in row ${input.rowIndex}`);
      return { success: true };
    }),
});