import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { PostgresStore } from "@mastra/pg";
import { env } from "@/env";

// Import agents
import { testAgent } from "./agents/test-agent";
import { spreadsheetAgent } from "./agents/spreadsheet-agent";
import { scientificAgent } from "./agents/scientific-agent";

/**
 * VibeSurfers Mastra Instance
 * Orchestrates AI agents and tools for intelligent spreadsheet operations
 */
export const mastra = new Mastra({
  agents: {
    testAgent,
    spreadsheetAgent,
    scientificAgent,
  },
  // PostgreSQL storage for memory persistence
  storage: new PostgresStore({
    connectionString: env.DATABASE_URL,
  }),
  logger: new PinoLogger({
    name: "VibeSurfers",
    level: "info",
  }),
  telemetry: {
    enabled: false,
  },
  observability: {
    default: { enabled: false },
  },
});

// Export convenience functions for agent access
export function getTestAgent() {
  return mastra.getAgent("testAgent");
}

export function getSpreadsheetAgent() {
  return mastra.getAgent("spreadsheetAgent");
}

export function getScientificAgent() {
  return mastra.getAgent("scientificAgent");
}
