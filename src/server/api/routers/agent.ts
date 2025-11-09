import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getSpreadsheetAgent, getScientificAgent } from "@/mastra";
import { sheets } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Production Agent Router
 *
 * Main endpoints for Mastra spreadsheet agent in production
 */
export const agentRouter = createTRPCRouter({
  /**
   * Send message to spreadsheet agent
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        sheetId: z.string().uuid(),
        threadId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Get sheet information to determine template type
        const sheet = await ctx.db.query.sheets.findFirst({
          where: eq(sheets.id, input.sheetId),
        });

        if (!sheet) {
          throw new Error("Sheet not found");
        }

        // Route to appropriate agent based on template type
        let agent;
        let agentType;

        if (sheet.templateType === "scientific") {
          agent = getScientificAgent();
          agentType = "scientific";
        } else {
          agent = getSpreadsheetAgent();
          agentType = "spreadsheet";
        }

        if (!agent) {
          throw new Error(`${agentType} agent not available`);
        }

        console.log("[Agent] Message:", input.message);
        console.log("[Agent] Sheet:", input.sheetId);
        console.log("[Agent] Template:", sheet.templateType);
        console.log("[Agent] Using agent:", agentType);

        // Generate thread ID if not provided
        const threadId = input.threadId || `${sheet.templateType || 'sheet'}-${input.sheetId}-${Date.now()}`;
        const resourceId = input.sheetId;

        // Build context message with sheet info
        const contextMessage = `Sheet ID: ${input.sheetId}
User ID: ${ctx.session.user.id}
Template Type: ${sheet.templateType || 'general'}
Sheet Name: ${sheet.name}

User message: ${input.message}`;

        // Call the agent
        const response = await agent.generate(contextMessage, {
          threadId,
          resourceId,
        });

        console.log("[Agent] Response:", response.text);

        // Return response
        return {
          success: true,
          response: response.text,
          threadId,
          agentType,
        };
      } catch (error) {
        console.error("[Agent] Error:", error);
        throw new Error(
          `Agent error: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get conversation history for a sheet
   */
  getConversation: protectedProcedure
    .input(
      z.object({
        sheetId: z.string().uuid(),
        threadId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      // TODO: Load from Mastra storage
      // For now, return empty
      return {
        messages: [],
        threadId: input.threadId || null,
      };
    }),

  /**
   * Upload CSV data for import
   */
  uploadCSV: protectedProcedure
    .input(
      z.object({
        sheetId: z.string().uuid(),
        csvData: z.object({
          filename: z.string(),
          headers: z.array(z.string()),
          rows: z.array(z.record(z.string(), z.string())),
        }),
        threadId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const agent = getSpreadsheetAgent();

        if (!agent) {
          throw new Error("Spreadsheet agent not available");
        }

        console.log("[Agent] CSV Upload:", input.csvData.filename);
        console.log("[Agent] Rows:", input.csvData.rows.length);
        console.log("[Agent] Headers:", input.csvData.headers.join(", "));

        // Generate thread ID
        const threadId = input.threadId || `csv-${input.sheetId}-${Date.now()}`;
        const resourceId = input.sheetId;

        // Build context message with CSV data
        const contextMessage = `Sheet ID: ${input.sheetId}
User ID: ${ctx.session.user.id}

User uploaded CSV file: ${input.csvData.filename}
Headers: ${input.csvData.headers.join(", ")}
Total rows: ${input.csvData.rows.length}
Sample rows (first 5):
${JSON.stringify(input.csvData.rows.slice(0, 5), null, 2)}

Please analyze this CSV and present an import preview to the user.`;

        // Call the agent
        const response = await agent.generate(contextMessage, {
          threadId,
          resourceId,
        });

        console.log("[Agent] CSV Analysis Response:", response.text);

        return {
          success: true,
          response: response.text,
          threadId,
        };
      } catch (error) {
        console.error("[Agent] CSV Upload error:", error);
        throw new Error(
          `CSV upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
