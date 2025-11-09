import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/server/db";
import { cells, columns, eventQueue } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Sheet Writer Tool
 *
 * Writes rows to a spreadsheet in bulk. Supports two modes:
 * - "preview": Returns what will be created without actually writing
 * - "execute": Actually creates the rows in the database
 *
 * This tool is used for bulk row creation from agent queries like
 * "find top 20 pizzas in SF" - the agent can preview the results
 * before the user confirms.
 */
export const sheetWriterTool = createTool({
  id: "sheet-writer",
  description: "Write multiple rows to a spreadsheet at once. Use 'preview' mode to show what will be created, then 'execute' mode after user confirmation. Each row is an array of cell values corresponding to column positions.",
  inputSchema: z.object({
    sheetId: z.string().uuid().describe("The UUID of the sheet to write to"),
    userId: z.string().describe("The user ID who owns this sheet"),
    mode: z.enum(["preview", "execute"]).describe("'preview' to show what will be created, 'execute' to actually create"),
    rows: z.array(
      z.array(z.string()).describe("Array of cell values, one per column")
    ).describe("Array of rows to create. Each row is an array of strings (one per column)."),
    startingRow: z.number().optional().default(0).describe("Starting row index (default: 0 for new rows)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    mode: z.enum(["preview", "execute"]),
    rowsCreated: z.number().optional(),
    rowsPreview: z.array(z.object({
      rowIndex: z.number(),
      cells: z.record(z.number(), z.string()),
    })).optional(),
    sample: z.array(z.object({
      rowIndex: z.number(),
      cells: z.record(z.number(), z.string()),
    })).optional().describe("Sample of first 3 rows for preview"),
    eventsCreated: z.number().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { sheetId, userId, mode, rows: inputRows, startingRow } = context;

      console.log(`[Sheet Writer] Mode: ${mode}, Sheet: ${sheetId}, Rows: ${inputRows.length}`);

      // Validate we have rows to write
      if (inputRows.length === 0) {
        return {
          success: false,
          mode,
          error: "No rows provided to write",
        };
      }

      // Fetch sheet columns to validate structure
      const sheetColumns = await db
        .select({
          id: columns.id,
          position: columns.position,
          title: columns.title,
        })
        .from(columns)
        .where(eq(columns.sheetId, sheetId))
        .orderBy(columns.position);

      if (sheetColumns.length === 0) {
        return {
          success: false,
          mode,
          error: "Sheet has no columns defined. Cannot write rows.",
        };
      }

      console.log(`[Sheet Writer] Sheet has ${sheetColumns.length} columns`);

      // Build rows structure
      const rowsToCreate = inputRows.map((rowCells, idx) => {
        const rowIndex = startingRow + idx;
        const cellsMap: Record<number, string> = {};

        // Map each cell value to its column position
        rowCells.forEach((cellValue, colIdx) => {
          if (colIdx < sheetColumns.length) {
            cellsMap[colIdx] = cellValue;
          }
        });

        return { rowIndex, cells: cellsMap };
      });

      // PREVIEW MODE: Just return what would be created
      if (mode === "preview") {
        const sample = rowsToCreate.slice(0, 3); // First 3 rows as sample

        return {
          success: true,
          mode: "preview",
          rowsPreview: rowsToCreate,
          sample,
          message: `Preview: Will create ${inputRows.length} rows with ${sheetColumns.length} columns each. First column will trigger AI processing for remaining columns.`,
        };
      }

      // EXECUTE MODE: Actually write to database
      console.log(`[Sheet Writer] Executing write of ${inputRows.length} rows`);

      let cellsCreated = 0;
      let eventsCreated = 0;

      // Write rows in batches to avoid overwhelming the database
      const BATCH_SIZE = 100;
      for (let i = 0; i < rowsToCreate.length; i += BATCH_SIZE) {
        const batch = rowsToCreate.slice(i, i + BATCH_SIZE);

        // Create cells for this batch
        const cellsToInsert = batch.flatMap(({ rowIndex, cells: cellsMap }) =>
          Object.entries(cellsMap).map(([colIdx, content]) => ({
            sheetId,
            userId,
            rowIndex,
            colIndex: parseInt(colIdx),
            content,
          }))
        );

        if (cellsToInsert.length > 0) {
          await db.insert(cells).values(cellsToInsert);
          cellsCreated += cellsToInsert.length;
        }

        // Create events ONLY for first column of each row
        // This triggers the existing operator system to fill remaining columns
        const eventsToInsert = batch.map(({ rowIndex, cells: cellsMap }) => ({
          sheetId,
          userId,
          eventType: "user_cell_edit",
          payload: {
            spreadsheetId: sheetId,
            rowIndex,
            columnId: sheetColumns[0]?.id || "unknown",
            colIndex: 0,
            content: cellsMap[0] || "",
          },
          status: "pending",
        }));

        if (eventsToInsert.length > 0) {
          await db.insert(eventQueue).values(eventsToInsert);
          eventsCreated += eventsToInsert.length;
        }

        console.log(`[Sheet Writer] Batch ${i / BATCH_SIZE + 1}: Created ${cellsToInsert.length} cells, ${eventsToInsert.length} events`);
      }

      return {
        success: true,
        mode: "execute",
        rowsCreated: inputRows.length,
        eventsCreated,
        message: `Successfully created ${inputRows.length} rows (${cellsCreated} cells). Queued ${eventsCreated} events for AI processing.`,
      };
    } catch (error) {
      console.error("[Sheet Writer] Error:", error);
      return {
        success: false,
        mode: context.mode,
        error: `Failed to write rows: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
