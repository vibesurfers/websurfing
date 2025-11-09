import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/server/db";
import { cells } from "@/server/db/schema";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";

/**
 * Row Manager Tool
 *
 * Manages row operations on spreadsheets:
 * - Delete specific rows
 * - Delete rows matching criteria (e.g., empty cells)
 * - Clear row content (keep row structure)
 *
 * This gives the agent the ability to clean up and manage spreadsheet data.
 */
export const rowManagerTool = createTool({
  id: "row-manager",
  description: "Manage spreadsheet rows: delete specific rows, delete rows with empty values in certain columns, or clear row content. Use this to clean up data or remove unwanted rows.",
  inputSchema: z.object({
    sheetId: z.string().uuid().describe("The UUID of the sheet to modify"),
    action: z.enum(["delete", "delete_empty", "clear"]).describe("The operation to perform"),

    // For DELETE action
    rowIndices: z.array(z.number()).optional().describe("Specific row indices to delete (for 'delete' action)"),

    // For DELETE_EMPTY action
    columnIndex: z.number().optional().describe("Column index to check for empty values (for 'delete_empty' action)"),
    columnTitle: z.string().optional().describe("Or column title to check (alternative to columnIndex)"),

    // For CLEAR action
    startRow: z.number().optional().describe("Starting row index for clear operation"),
    endRow: z.number().optional().describe("Ending row index for clear operation"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    rowsAffected: z.number(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { sheetId, action } = context;

      console.log(`[Row Manager] Action: ${action}, Sheet: ${sheetId}`);

      switch (action) {
        case "delete": {
          const { rowIndices } = context;

          if (!rowIndices || rowIndices.length === 0) {
            return {
              success: false,
              action,
              rowsAffected: 0,
              error: "rowIndices is required for delete action",
            };
          }

          // Delete cells for these rows
          let totalDeleted = 0;
          for (const rowIndex of rowIndices) {
            const result = await db
              .delete(cells)
              .where(and(
                eq(cells.sheetId, sheetId),
                eq(cells.rowIndex, rowIndex)
              ))
              .returning({ id: cells.id });

            totalDeleted += result.length;
          }

          console.log(`[Row Manager] Deleted ${totalDeleted} cells from ${rowIndices.length} rows`);

          return {
            success: true,
            action: "delete",
            rowsAffected: rowIndices.length,
            message: `Deleted ${rowIndices.length} rows (${totalDeleted} cells)`,
          };
        }

        case "delete_empty": {
          const { columnIndex, columnTitle } = context;

          if (columnIndex === undefined && !columnTitle) {
            return {
              success: false,
              action,
              rowsAffected: 0,
              error: "Either columnIndex or columnTitle is required for delete_empty action",
            };
          }

          // Find column index if title was provided
          let targetColIndex = columnIndex;
          if (columnTitle && targetColIndex === undefined) {
            // Import columns schema
            const { columns: columnsTable } = await import("@/server/db/schema");

            const [column] = await db
              .select({ position: columnsTable.position })
              .from(columnsTable)
              .where(and(
                eq(columnsTable.sheetId, sheetId),
                eq(columnsTable.title, columnTitle)
              ))
              .limit(1);

            targetColIndex = column?.position ?? 0;
            console.log(`[Row Manager] Found column "${columnTitle}" at position ${targetColIndex}`);
          }

          // Find all cells in this sheet for the target column
          const allCells = await db
            .select({ rowIndex: cells.rowIndex, content: cells.content })
            .from(cells)
            .where(and(
              eq(cells.sheetId, sheetId),
              eq(cells.colIndex, targetColIndex ?? 0)
            ));

          console.log(`[Row Manager] Found ${allCells.length} cells in column ${targetColIndex}`);

          // Get all unique row indices for this sheet
          const allRowsWithCells = await db
            .selectDistinct({ rowIndex: cells.rowIndex })
            .from(cells)
            .where(eq(cells.sheetId, sheetId));

          const allRowIndices = allRowsWithCells.map(r => r.rowIndex);

          // Find rows that are either missing from the target column OR have empty content
          const cellsByRow = new Map(allCells.map(cell => [cell.rowIndex, cell.content]));
          const emptyRows = allRowIndices.filter(rowIndex => {
            const content = cellsByRow.get(rowIndex);
            return !content || content.trim() === "";
          });

          console.log(`[Row Manager] Found ${emptyRows.length} rows with empty column ${targetColIndex}`);

          if (emptyRows.length === 0) {
            return {
              success: true,
              action: "delete_empty",
              rowsAffected: 0,
              message: `No empty rows found in "${columnTitle || `column ${targetColIndex}`}"`,
            };
          }

          // Delete all cells for these rows
          let totalDeleted = 0;
          for (const rowIndex of emptyRows) {
            const result = await db
              .delete(cells)
              .where(and(
                eq(cells.sheetId, sheetId),
                eq(cells.rowIndex, rowIndex)
              ))
              .returning({ id: cells.id });

            totalDeleted += result.length;
          }

          console.log(`[Row Manager] Deleted ${emptyRows.length} empty rows (${totalDeleted} cells total)`);

          return {
            success: true,
            action: "delete_empty",
            rowsAffected: emptyRows.length,
            message: `Deleted ${emptyRows.length} rows with empty "${columnTitle || `column ${targetColIndex}`}" (${totalDeleted} cells total)`,
          };
        }

        case "clear": {
          const { startRow, endRow } = context;

          if (startRow === undefined) {
            return {
              success: false,
              action,
              rowsAffected: 0,
              error: "startRow is required for clear action",
            };
          }

          const end = endRow ?? startRow;

          // Clear content but keep cells
          const result = await db
            .update(cells)
            .set({ content: "" })
            .where(and(
              eq(cells.sheetId, sheetId),
              gte(cells.rowIndex, startRow),
              lte(cells.rowIndex, end)
            ))
            .returning({ id: cells.id });

          console.log(`[Row Manager] Cleared ${result.length} cells from rows ${startRow}-${end}`);

          return {
            success: true,
            action: "clear",
            rowsAffected: end - startRow + 1,
            message: `Cleared rows ${startRow} to ${end} (${result.length} cells)`,
          };
        }

        default:
          return {
            success: false,
            action,
            rowsAffected: 0,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      console.error("[Row Manager] Error:", error);
      return {
        success: false,
        action: context.action,
        rowsAffected: 0,
        error: `Failed to ${context.action} rows: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
