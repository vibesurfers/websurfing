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

      // Skip if content is empty or whitespace-only
      const trimmedContent = input.content.trim();
      if (!trimmedContent) {
        console.log(`Skipping empty cell update at (${input.rowIndex}, ${input.colIndex})`);
        return { success: true, skipped: true };
      }

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

  /**
   * Reprocess all rows for a specific column
   * Creates events to re-fill the column using operators
   */
  reprocessColumn: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid(),
      colIndex: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      console.log(`Reprocessing column ${input.colIndex} for sheet ${input.sheetId}`);

      // Get all rows that have REAL content in the FIRST column (skip empty/null rows)
      const allFirstColumnCells = await ctx.db
        .select({ rowIndex: cells.rowIndex, content: cells.content })
        .from(cells)
        .where(and(
          eq(cells.sheetId, input.sheetId),
          eq(cells.colIndex, 0) // First column
        ))
        .orderBy(cells.rowIndex);

      // Filter for rows with actual meaningful content
      const rowsWithData = allFirstColumnCells.filter(cell => {
        const content = cell.content?.trim() || '';
        // Skip if empty, null, or JSON null objects
        if (!content || content === 'null' || content === '{}' || content === '[]') {
          return false;
        }
        // Skip if it's a JSON object with null value
        if (content.includes('"null"') || content.includes(':null')) {
          return false;
        }
        return true;
      });

      console.log(`Found ${rowsWithData.length} rows with real data to reprocess (out of ${allFirstColumnCells.length} total)`);

      // Clear existing content in this column
      await ctx.db
        .delete(cells)
        .where(and(
          eq(cells.sheetId, input.sheetId),
          eq(cells.colIndex, input.colIndex)
        ));

      // Create events for the PREVIOUS column (which will trigger filling THIS column)
      const prevColIndex = input.colIndex - 1;
      if (prevColIndex < 0) {
        return {
          success: false,
          error: "Cannot reprocess first column (no previous column to trigger from)",
        };
      }

      const eventsToCreate = rowsWithData.map(row => ({
        sheetId: input.sheetId,
        userId,
        eventType: "robot_cell_update" as const,
        payload: {
          spreadsheetId: input.sheetId,
          rowIndex: row.rowIndex,
          colIndex: prevColIndex,
          content: "reprocess_trigger",
        },
        status: "pending" as const,
      }));

      await ctx.db.insert(eventQueue).values(eventsToCreate);

      console.log(`Created ${eventsToCreate.length} events to reprocess column ${input.colIndex}`);

      return {
        success: true,
        eventsCreated: eventsToCreate.length,
        message: `Queued ${eventsToCreate.length} rows for reprocessing`,
      };
    }),

  deleteRow: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid(),
      rowIndex: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      console.log(`Deleting row ${input.rowIndex} from sheet ${input.sheetId}`);

      // Delete all cells in this row
      const deleted = await ctx.db
        .delete(cells)
        .where(and(
          eq(cells.sheetId, input.sheetId),
          eq(cells.userId, userId),
          eq(cells.rowIndex, input.rowIndex)
        ))
        .returning();

      // Delete any pending events for this row
      await ctx.db
        .delete(eventQueue)
        .where(and(
          eq(eventQueue.sheetId, input.sheetId),
          eq(eventQueue.userId, userId),
          eq(eventQueue.rowIndex, input.rowIndex)
        ));

      // Delete any processing status for cells in this row
      await ctx.db
        .delete(cellProcessingStatus)
        .where(and(
          eq(cellProcessingStatus.sheetId, input.sheetId),
          eq(cellProcessingStatus.userId, userId),
          eq(cellProcessingStatus.rowIndex, input.rowIndex)
        ));

      console.log(`Deleted ${deleted.length} cells from row ${input.rowIndex}`);

      return {
        success: true,
        cellsDeleted: deleted.length,
        message: `Deleted row ${input.rowIndex}`,
      };
    }),

  reprocessRow: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid(),
      rowIndex: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      console.log(`Reprocessing row ${input.rowIndex} for sheet ${input.sheetId}`);

      // Get all cells in this row
      const rowCells = await ctx.db
        .select()
        .from(cells)
        .where(and(
          eq(cells.sheetId, input.sheetId),
          eq(cells.userId, userId),
          eq(cells.rowIndex, input.rowIndex)
        ))
        .orderBy(cells.colIndex);

      if (rowCells.length === 0) {
        return {
          success: false,
          message: `No cells found in row ${input.rowIndex}`,
        };
      }

      // Check if first column has content
      const firstCell = rowCells.find(c => c.colIndex === 0);
      const firstCellContent = firstCell?.content?.trim() || '';

      if (!firstCellContent || firstCellContent === 'null' || firstCellContent === '{}' || firstCellContent === '[]') {
        return {
          success: false,
          message: `Row ${input.rowIndex} has no content in first column`,
        };
      }

      // Clear all cells except the first column
      await ctx.db
        .delete(cells)
        .where(and(
          eq(cells.sheetId, input.sheetId),
          eq(cells.userId, userId),
          eq(cells.rowIndex, input.rowIndex),
          gt(cells.colIndex, 0)
        ));

      // Create event to reprocess from column 0
      await ctx.db.insert(eventQueue).values({
        sheetId: input.sheetId,
        userId,
        eventType: "robot_cell_update" as const,
        payload: {
          spreadsheetId: input.sheetId,
          rowIndex: input.rowIndex,
          colIndex: 0,
          content: firstCellContent,
        },
        status: "pending" as const,
      });

      console.log(`Created reprocess event for row ${input.rowIndex}`);

      return {
        success: true,
        message: `Row ${input.rowIndex} queued for reprocessing`,
      };
    }),
});