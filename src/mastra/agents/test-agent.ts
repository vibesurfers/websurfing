import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { vertex } from "../lib/vertex";

/**
 * Test Agent
 * Simple agent to verify Mastra setup is working
 *
 * Uses Google Vertex AI with application default credentials
 * Requires: GOOGLE_VERTEX_PROJECT and GOOGLE_VERTEX_LOCATION env vars
 */
export const testAgent = new Agent({
  name: "Test Agent",
  description: "A simple test agent to verify Mastra integration",
  instructions: `You are a friendly test agent for VibeSurfers, an intelligent spreadsheet application.

Your purpose is to verify that the Mastra integration is working correctly.

When users greet you, respond warmly and let them know you're ready to help with spreadsheet operations.

Keep responses short and friendly. Add a surfing emoji 🏄‍♂️ to show the good vibes!`,
  model: vertex("gemini-2.5-flash"),
  memory: new Memory({
    options: {
      lastMessages: 10,
      semanticRecall: false,
    },
  }),
});
