import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/server/db";
import { sheets, columns, cells, templates } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Sheet Reader Tool
 *
 * Reads the complete state of a spreadsheet including:
 * - Sheet metadata (name, template, system prompt)
 * - All columns (title, position, dataType, operatorType, etc.)
 * - All cells (optionally filtered by row)
 *
 * This gives the agent full context about the sheet structure and content.
 */
export const sheetReaderTool = createTool({
  id: "sheet-reader",
  description: "Read the complete state of a spreadsheet including metadata, columns, and cell content. Use this to understand what's in a sheet before making changes.",
  inputSchema: z.object({
    sheetId: z.string().uuid().describe("The UUID of the sheet to read"),
    includeRows: z.boolean().optional().default(true).describe("Whether to include row data (cell contents)"),
    rowLimit: z.number().optional().default(100).describe("Maximum number of rows to return (default: 100)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    sheet: z.object({
      id: z.string(),
      name: z.string(),
      templateType: z.string().nullable(),
      templateId: z.string().nullable(),
      systemPrompt: z.string().nullable(),
      isAutonomous: z.boolean().nullable(),
      createdAt: z.date(),
    }).optional(),
    columns: z.array(z.object({
      id: z.string(),
      title: z.string(),
      position: z.number(),
      dataType: z.string(),
    })),
    rows: z.array(z.object({
      rowIndex: z.number(),
      cells: z.record(z.number(), z.string()), // colIndex -> content
    })).optional(),
    rowCount: z.number(),
    columnCount: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { sheetId, includeRows, rowLimit } = context;

      console.log(`[Sheet Reader] Reading sheet ${sheetId}, includeRows=${includeRows}, limit=${rowLimit}`);

      // 1. Fetch sheet metadata
      const [sheet] = await db
        .select({
          id: sheets.id,
          name: sheets.name,
          templateType: sheets.templateType,
          templateId: sheets.templateId,
          isAutonomous: sheets.isAutonomous,
          createdAt: sheets.createdAt,
        })
        .from(sheets)
        .where(eq(sheets.id, sheetId))
        .limit(1);

      if (!sheet) {
        return {
          success: false,
          columns: [],
          rowCount: 0,
          columnCount: 0,
          error: `Sheet not found: ${sheetId}`,
        };
      }

      // 2. Fetch template system prompt if available
      let systemPrompt: string | null = null;
      if (sheet.templateId) {
        const [template] = await db
          .select({ systemPrompt: templates.systemPrompt })
          .from(templates)
          .where(eq(templates.id, sheet.templateId))
          .limit(1);

        if (template) {
          systemPrompt = template.systemPrompt;
        }
      }

      // 3. Fetch all columns for this sheet
      const sheetColumns = await db
        .select({
          id: columns.id,
          title: columns.title,
          position: columns.position,
          dataType: columns.dataType,
        })
        .from(columns)
        .where(eq(columns.sheetId, sheetId))
        .orderBy(columns.position);

      console.log(`[Sheet Reader] Found ${sheetColumns.length} columns`);

      // 4. Optionally fetch cell data
      let rows: Array<{ rowIndex: number; cells: Record<number, string> }> = [];
      let rowCount = 0;

      if (includeRows) {
        // Fetch all cells for this sheet
        const allCells = await db
          .select({
            rowIndex: cells.rowIndex,
            colIndex: cells.colIndex,
            content: cells.content,
          })
          .from(cells)
          .where(eq(cells.sheetId, sheetId))
          .orderBy(cells.rowIndex, cells.colIndex);

        console.log(`[Sheet Reader] Found ${allCells.length} cells`);

        // Group cells by row
        const rowMap = new Map<number, Record<number, string>>();
        for (const cell of allCells) {
          if (!rowMap.has(cell.rowIndex)) {
            rowMap.set(cell.rowIndex, {});
          }
          const row = rowMap.get(cell.rowIndex)!;
          row[cell.colIndex] = cell.content || "";
        }

        // Convert to array and limit
        const allRows = Array.from(rowMap.entries())
          .map(([rowIndex, cells]) => ({ rowIndex, cells }))
          .sort((a, b) => a.rowIndex - b.rowIndex);

        rowCount = allRows.length;
        rows = allRows.slice(0, rowLimit);

        console.log(`[Sheet Reader] Returning ${rows.length} rows (total: ${rowCount})`);
      }

      return {
        success: true,
        sheet: {
          ...sheet,
          systemPrompt,
        },
        columns: sheetColumns.map(col => ({
          id: col.id,
          title: col.title || `Column ${col.position}`,
          position: col.position,
          dataType: col.dataType || 'text',
        })),
        rows: includeRows ? rows : undefined,
        rowCount,
        columnCount: sheetColumns.length,
      };
    } catch (error) {
      console.error("[Sheet Reader] Error reading sheet:", error);
      return {
        success: false,
        columns: [],
        rowCount: 0,
        columnCount: 0,
        error: `Failed to read sheet: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
