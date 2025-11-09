import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getSpreadsheetAgent } from "@/mastra";

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
        const agent = getSpreadsheetAgent();

        if (!agent) {
          throw new Error("Spreadsheet agent not available");
        }

        console.log("[Agent] Message:", input.message);
        console.log("[Agent] Sheet:", input.sheetId);

        // Generate thread ID if not provided
        const threadId = input.threadId || `sheet-${input.sheetId}-${Date.now()}`;
        const resourceId = input.sheetId;

        // Build context message with sheet info
        const contextMessage = `Sheet ID: ${input.sheetId}
User ID: ${ctx.session.user.id}

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
});
