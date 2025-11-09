import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getSpreadsheetAgent } from "@/mastra";

/**
 * Spreadsheet Agent Test Router
 *
 * Endpoints to test the spreadsheet agent and its tools
 */
export const spreadsheetAgentTestRouter = createTRPCRouter({
  /**
   * Chat with the spreadsheet agent
   */
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        sheetId: z.string().uuid().optional(),
        threadId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const agent = getSpreadsheetAgent();

        if (!agent) {
          throw new Error("Spreadsheet agent not found");
        }

        console.log("[Spreadsheet Agent Test] Message:", input.message);
        console.log("[Spreadsheet Agent Test] Sheet ID:", input.sheetId);

        // Generate thread ID if not provided
        const threadId = input.threadId || `test-${Date.now()}`;
        const resourceId = input.sheetId || "no-sheet";

        // Build context message with sheet info if provided
        let contextMessage = input.message;
        if (input.sheetId) {
          contextMessage = `Sheet ID: ${input.sheetId}
User ID: ${ctx.session.user.id}

${input.message}`;
        }

        // Call the agent
        const response = await agent.generate(contextMessage, {
          threadId,
          resourceId,
        });

        console.log("[Spreadsheet Agent Test] Response:", response.text);

        return {
          success: true,
          response: response.text,
          threadId,
        };
      } catch (error) {
        console.error("[Spreadsheet Agent Test] Error:", error);
        throw new Error(
          `Failed to call spreadsheet agent: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Test the Sheet Reader tool directly
   */
  testSheetReader: protectedProcedure
    .input(
      z.object({
        sheetId: z.string().uuid(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { sheetReaderTool } = await import("@/mastra/tools");

        console.log("[Test] Reading sheet:", input.sheetId);

        const result = await sheetReaderTool.execute({
          context: {
            sheetId: input.sheetId,
            includeRows: true,
            rowLimit: 10,
          },
        });

        return result;
      } catch (error) {
        console.error("[Test] Sheet Reader error:", error);
        throw new Error(
          `Sheet Reader failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Test Google Maps tool directly
   */
  testGoogleMaps: protectedProcedure
    .input(
      z.object({
        placeType: z.string(),
        location: z.string(),
        maxResults: z.number().optional().default(5),
      })
    )
    .query(async ({ input }) => {
      try {
        const { googleMapsTool } = await import("@/mastra/tools");

        console.log("[Test] Searching maps:", input);

        const result = await googleMapsTool.execute({
          context: input,
        });

        return result;
      } catch (error) {
        console.error("[Test] Google Maps error:", error);
        throw new Error(
          `Google Maps failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Test Google Search tool directly
   */
  testGoogleSearch: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        maxResults: z.number().optional().default(5),
      })
    )
    .query(async ({ input }) => {
      try {
        const { googleSearchTool } = await import("@/mastra/tools");

        console.log("[Test] Searching Google:", input);

        const result = await googleSearchTool.execute({
          context: input,
        });

        return result;
      } catch (error) {
        console.error("[Test] Google Search error:", error);
        throw new Error(
          `Google Search failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Test Sheet Writer in preview mode
   */
  testSheetWriterPreview: protectedProcedure
    .input(
      z.object({
        sheetId: z.string().uuid(),
        sampleRows: z.number().optional().default(3),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { sheetWriterTool } = await import("@/mastra/tools");

        // Create sample rows
        const rows = Array.from({ length: input.sampleRows }, (_, i) => [
          `Test Item ${i + 1}`,
          `123 Test St, San Francisco`,
          `4.${5 + i} stars`,
          `(415) 555-${1000 + i}`,
        ]);

        console.log("[Test] Preview sheet writer:", rows);

        const result = await sheetWriterTool.execute({
          context: {
            sheetId: input.sheetId,
            userId: ctx.session.user.id,
            mode: "preview",
            rows,
          },
        });

        return result;
      } catch (error) {
        console.error("[Test] Sheet Writer preview error:", error);
        throw new Error(
          `Sheet Writer preview failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
