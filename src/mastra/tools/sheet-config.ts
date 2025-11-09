import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/server/db";
import { sheets, templates, templateColumns, columns } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Sheet Config Tool
 *
 * Allows the agent to read and modify sheet/template configuration:
 * - System prompts
 * - Column operator types
 * - Column prompts
 * - Operator configs
 *
 * This makes sheets fully customizable through conversation!
 */
export const sheetConfigTool = createTool({
  id: "sheet-config",
  description: "Read or modify sheet configuration including system prompts, column operator types, and column-specific prompts. Use this to customize how the AI processes each column.",
  inputSchema: z.object({
    sheetId: z.string().uuid().describe("The UUID of the sheet"),
    action: z.enum(["read", "update_system_prompt", "update_column_prompt", "update_column_operator"]).describe("The configuration action to perform"),

    // For update_system_prompt
    systemPrompt: z.string().optional().describe("New system prompt for the sheet"),

    // For update_column_prompt or update_column_operator
    columnId: z.string().uuid().optional().describe("Column ID to update"),
    columnTitle: z.string().optional().describe("Or column title (alternative to columnId)"),
    columnPrompt: z.string().optional().describe("Custom prompt for this column's operator"),
    operatorType: z.string().optional().describe("Operator type: google_search, url_context, structured_output, function_calling"),
    operatorConfig: z.record(z.any()).optional().describe("Operator-specific configuration JSON"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    action: z.string(),
    config: z.object({
      systemPrompt: z.string().optional(),
      templateId: z.string().optional(),
      templateType: z.string().optional(),
      columns: z.array(z.object({
        id: z.string(),
        title: z.string(),
        position: z.number(),
        operatorType: z.string().optional(),
        prompt: z.string().optional(),
      })).optional(),
    }).optional(),
    message: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { sheetId, action } = context;

      console.log(`[Sheet Config] Action: ${action}, Sheet: ${sheetId}`);

      // Get sheet info
      const [sheet] = await db
        .select()
        .from(sheets)
        .where(eq(sheets.id, sheetId))
        .limit(1);

      if (!sheet) {
        return {
          success: false,
          action,
          error: `Sheet not found: ${sheetId}`,
        };
      }

      switch (action) {
        case "read": {
          // Load template if exists
          let systemPrompt: string | undefined;
          if (sheet.templateId) {
            const [template] = await db
              .select({ systemPrompt: templates.systemPrompt })
              .from(templates)
              .where(eq(templates.id, sheet.templateId))
              .limit(1);

            systemPrompt = template?.systemPrompt || undefined;

            // Load template columns config
            const templateCols = await db
              .select()
              .from(templateColumns)
              .where(eq(templateColumns.templateId, sheet.templateId))
              .orderBy(templateColumns.position);

            return {
              success: true,
              action: "read",
              config: {
                systemPrompt,
                templateId: sheet.templateId,
                templateType: sheet.templateType || undefined,
                columns: templateCols.map(col => ({
                  id: col.id,
                  title: col.title || '',
                  position: col.position,
                  operatorType: col.operatorType || undefined,
                  prompt: col.prompt || undefined,
                })),
              },
            };
          }

          // No template, return basic info
          const sheetCols = await db
            .select()
            .from(columns)
            .where(eq(columns.sheetId, sheetId))
            .orderBy(columns.position);

          return {
            success: true,
            action: "read",
            config: {
              systemPrompt: undefined,
              templateType: sheet.templateType || undefined,
              columns: sheetCols.map(col => ({
                id: col.id,
                title: col.title || '',
                position: col.position,
                operatorType: undefined,
                prompt: undefined,
              })),
            },
            message: "Sheet has no template. Columns have basic configuration only.",
          };
        }

        case "update_system_prompt": {
          const { systemPrompt: newPrompt } = context;

          if (!newPrompt) {
            return {
              success: false,
              action,
              error: "systemPrompt is required for this action",
            };
          }

          // If sheet has a template, update it
          if (sheet.templateId) {
            await db
              .update(templates)
              .set({ systemPrompt: newPrompt })
              .where(eq(templates.id, sheet.templateId));

            console.log(`[Sheet Config] Updated system prompt for template ${sheet.templateId}`);

            return {
              success: true,
              action: "update_system_prompt",
              message: `Updated system prompt for template`,
            };
          }

          // No template - would need to create one
          return {
            success: false,
            action,
            error: "Sheet has no template. System prompts require a template.",
            message: "To add a system prompt, first convert this sheet to use a template.",
          };
        }

        case "update_column_prompt":
        case "update_column_operator": {
          // These require templateColumns - not yet fully implemented
          console.log(`[Sheet Config] ${action} not yet fully implemented`);

          return {
            success: false,
            action,
            error: `${action} requires templateColumns table integration (Phase 8)`,
            message: "Column operator configuration coming soon!",
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
      console.error("[Sheet Config] Error:", error);
      return {
        success: false,
        action: context.action,
        error: `Failed to ${context.action}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
