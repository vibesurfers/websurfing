import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getTestAgent } from "@/mastra";

/**
 * Test Router for Mastra Integration
 * Simple endpoint to verify Mastra setup is working
 */
export const mastraTestRouter = createTRPCRouter({
  /**
   * Test the Mastra agent with a simple message
   */
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1),
        threadId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const agent = getTestAgent();

        if (!agent) {
          throw new Error("Test agent not found");
        }

        console.log("[Mastra Test] Sending message to agent:", input.message);

        // Generate thread ID if not provided
        const threadId = input.threadId || `test-${Date.now()}`;

        // Call the agent
        const response = await agent.generate(input.message, {
          threadId,
          resourceId: "test-resource",
        });

        console.log("[Mastra Test] Agent response:", response.text);

        return {
          success: true,
          response: response.text,
          threadId,
        };
      } catch (error) {
        console.error("[Mastra Test] Error calling agent:", error);
        throw new Error(
          `Failed to call test agent: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Simple health check
   */
  ping: protectedProcedure.query(() => {
    return {
      success: true,
      message: "Mastra integration is ready! 🏄‍♂️",
      timestamp: new Date().toISOString(),
    };
  }),
});
