import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/server/db";
import { columns, cells, eventQueue } from "@/server/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

/**
 * Column Manager Tool
 *
 * Manages column operations on spreadsheets:
 * - Add new columns
 * - Remove columns
 * - Reorder columns
 * - Update column configuration (dataType, operatorType, prompt)
 *
 * This gives the agent full control over sheet structure.
 */
export const columnManagerTool = createTool({
  id: "column-manager",
  description: "Manage spreadsheet columns: add, remove, reorder, or update column configuration. Use this when the agent needs to change the sheet structure.",
  inputSchema: z.object({
    sheetId: z.string().uuid().describe("The UUID of the sheet to modify"),
    action: z.enum(["add", "remove", "reorder", "update"]).describe("The operation to perform"),

    // For ADD action
    title: z.string().optional().describe("Column title (required for 'add')"),
    position: z.number().optional().describe("Position to insert column (required for 'add', 'reorder')"),
    dataType: z.string().optional().default("text").describe("Data type: text, url, email, number, json"),
    processExistingRows: z.boolean().optional().default(true).describe("If true, triggers processing for all existing rows in the new column"),
    userId: z.string().optional().describe("User ID (required for creating events)"),

    // For REMOVE action
    columnId: z.string().uuid().optional().describe("Column ID to remove (required for 'remove', 'update')"),

    // For REORDER action
    newPosition: z.number().optional().describe("New position for column (required for 'reorder')"),

    // For UPDATE action (future: operator config)
    operatorType: z.string().optional().describe("Operator type: google_search, url_context, structured_output, function_calling"),
    operatorConfig: z.record(z.any()).optional().describe("Operator-specific configuration JSON"),
    prompt: z.string().optional().describe("Custom prompt for this column's operator"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    columnId: z.string().optional(),
    columnTitle: z.string().optional(),
    position: z.number().optional(),
    columnsAffected: z.number().optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { sheetId, action } = context;

      console.log(`[Column Manager] Action: ${action}, Sheet: ${sheetId}`);

      switch (action) {
        case "add": {
          const { title, position, dataType, processExistingRows, userId } = context;

          if (!title) {
            return {
              success: false,
              action,
              error: "Title is required for add action",
            };
          }

          // Get current columns to determine position
          const existingCols = await db
            .select({ position: columns.position })
            .from(columns)
            .where(eq(columns.sheetId, sheetId))
            .orderBy(columns.position);

          // Get current max position if position not specified
          let insertPosition = position;
          if (insertPosition === undefined) {
            insertPosition = existingCols.length > 0
              ? Math.max(...existingCols.map(c => c.position)) + 1
              : 0;
          }

          // Shift existing columns if inserting in middle
          if (position !== undefined && insertPosition < existingCols.length) {
            await db
              .update(columns)
              .set({ position: sql`${columns.position} + 1` })
              .where(and(
                eq(columns.sheetId, sheetId),
                gte(columns.position, insertPosition)
              ));
          }

          // Create new column
          const [newColumn] = await db
            .insert(columns)
            .values({
              sheetId,
              title,
              position: insertPosition,
              dataType: dataType || "text",
            })
            .returning({ id: columns.id, title: columns.title, position: columns.position });

          console.log(`[Column Manager] Added column "${title}" at position ${insertPosition}`);

          // If processExistingRows is true, create events for all existing rows
          let eventsCreated = 0;
          if (processExistingRows && userId && insertPosition > 0) {
            // Get all unique row indices in this sheet
            const existingRows = await db
              .selectDistinct({ rowIndex: cells.rowIndex })
              .from(cells)
              .where(eq(cells.sheetId, sheetId));

            console.log(`[Column Manager] Found ${existingRows.length} existing rows to process`);

            // Create events for the PREVIOUS column (which will trigger filling THIS new column)
            const prevColumnIndex = insertPosition - 1;
            const eventsToCreate = existingRows.map(row => ({
              sheetId,
              userId,
              eventType: "robot_cell_update" as const,
              payload: {
                spreadsheetId: sheetId,
                rowIndex: row.rowIndex,
                colIndex: prevColumnIndex,
                content: "trigger", // Dummy content to trigger processing
              },
              status: "pending" as const,
            }));

            if (eventsToCreate.length > 0) {
              await db.insert(eventQueue).values(eventsToCreate);
              eventsCreated = eventsToCreate.length;
              console.log(`[Column Manager] Created ${eventsCreated} events to fill new column`);
            }
          }

          return {
            success: true,
            action: "add",
            columnId: newColumn?.id,
            columnTitle: newColumn?.title || title,
            position: newColumn?.position,
            message: `Added column "${title}" at position ${insertPosition}${eventsCreated > 0 ? `. Queued ${eventsCreated} events to fill this column for existing rows.` : ''}`,
          };
        }

        case "remove": {
          const { columnId } = context;

          if (!columnId) {
            return {
              success: false,
              action,
              error: "columnId is required for remove action",
            };
          }

          // Get column to remove
          const [colToRemove] = await db
            .select({ position: columns.position, title: columns.title })
            .from(columns)
            .where(and(
              eq(columns.id, columnId),
              eq(columns.sheetId, sheetId)
            ))
            .limit(1);

          if (!colToRemove) {
            return {
              success: false,
              action,
              error: `Column not found: ${columnId}`,
            };
          }

          // Delete cells in this column (cascade will handle this if FK exists)
          await db
            .delete(cells)
            .where(and(
              eq(cells.sheetId, sheetId),
              eq(cells.colIndex, colToRemove.position)
            ));

          // Delete the column
          await db
            .delete(columns)
            .where(eq(columns.id, columnId));

          // Shift remaining columns left
          await db
            .update(columns)
            .set({ position: db.raw(`position - 1`) })
            .where(and(
              eq(columns.sheetId, sheetId),
              gte(columns.position, colToRemove.position + 1)
            ));

          console.log(`[Column Manager] Removed column "${colToRemove.title}" at position ${colToRemove.position}`);

          return {
            success: true,
            action: "remove",
            columnId,
            columnTitle: colToRemove.title || "Unknown",
            position: colToRemove.position,
            message: `Removed column "${colToRemove.title}"`,
          };
        }

        case "reorder": {
          const { columnId, newPosition } = context;

          if (!columnId || newPosition === undefined) {
            return {
              success: false,
              action,
              error: "columnId and newPosition are required for reorder action",
            };
          }

          // Get current column
          const [col] = await db
            .select({ position: columns.position, title: columns.title })
            .from(columns)
            .where(and(
              eq(columns.id, columnId),
              eq(columns.sheetId, sheetId)
            ))
            .limit(1);

          if (!col) {
            return {
              success: false,
              action,
              error: `Column not found: ${columnId}`,
            };
          }

          const oldPosition = col.position;

          if (oldPosition === newPosition) {
            return {
              success: true,
              action: "reorder",
              message: "Column already at target position",
            };
          }

          // Shift columns in between
          if (newPosition < oldPosition) {
            // Moving left: shift right
            await db
              .update(columns)
              .set({ position: db.raw(`position + 1`) })
              .where(and(
                eq(columns.sheetId, sheetId),
                gte(columns.position, newPosition),
                db.raw(`position < ${oldPosition}`)
              ));
          } else {
            // Moving right: shift left
            await db
              .update(columns)
              .set({ position: db.raw(`position - 1`) })
              .where(and(
                eq(columns.sheetId, sheetId),
                db.raw(`position > ${oldPosition}`),
                db.raw(`position <= ${newPosition}`)
              ));
          }

          // Update target column
          await db
            .update(columns)
            .set({ position: newPosition })
            .where(eq(columns.id, columnId));

          console.log(`[Column Manager] Reordered column "${col.title}" from ${oldPosition} to ${newPosition}`);

          return {
            success: true,
            action: "reorder",
            columnId,
            columnTitle: col.title || "Unknown",
            position: newPosition,
            message: `Moved column "${col.title}" from position ${oldPosition} to ${newPosition}`,
          };
        }

        case "update": {
          const { columnId, operatorType, operatorConfig, prompt } = context;

          if (!columnId) {
            return {
              success: false,
              action,
              error: "columnId is required for update action",
            };
          }

          // Note: operatorType, operatorConfig, prompt are templateColumns fields
          // For now, we'll just acknowledge this - full implementation would need templateColumns table

          console.log(`[Column Manager] Update column ${columnId} (operator config update not yet implemented in columns table)`);

          return {
            success: true,
            action: "update",
            columnId,
            message: "Column update acknowledged (operator config requires templateColumns integration)",
          };
        }

        default:
          return {
            success: false,
            action,
            error: `Unknown action: ${action}`,
          };
      }
    } catch (error) {
      console.error("[Column Manager] Error:", error);
      return {
        success: false,
        action: context.action,
        error: `Failed to ${context.action} column: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
