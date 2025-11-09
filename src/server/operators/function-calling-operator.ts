/**
 * Function Calling Gemini Operator
 *
 * Enables Gemini to call external functions and APIs based on natural language.
 * Bridges user intent to executable actions and data retrieval.
 *
 * Reference: .tribe/snippets/GEMINI-FUNCTION_CALLING.md
 */

import { getGeminiClient } from "@/server/gemini/client";
import { DEFAULT_MODEL, FUNCTION_CALLING_MODES } from "@/server/gemini/config";
import type {
  FunctionCallInput,
  FunctionCallOutput,
  FunctionCall,
  FunctionDeclaration,
  BaseOperator,
} from "@/types/operators";

export class FunctionCallingOperator
  implements BaseOperator<FunctionCallInput, FunctionCallOutput>
{
  readonly name = "function_calling";
  readonly inputType = "FunctionCallInput";
  readonly outputType = "FunctionCallOutput";

  /**
   * Execute function calling via Gemini
   */
  async operation(input: FunctionCallInput): Promise<FunctionCallOutput> {
    const client = getGeminiClient();

    try {
      // Validate function declarations
      if (!input.availableFunctions || input.availableFunctions.length === 0) {
        throw new Error("At least one function declaration must be provided");
      }

      // Configure function calling tool
      const config = {
        tools: [
          {
            functionDeclarations: input.availableFunctions,
          },
        ],
        toolConfig: input.toolConfig ?? {
          functionCallingConfig: {
            mode: FUNCTION_CALLING_MODES.AUTO,
          },
        },
      };

      // Call Gemini with function declarations
      const response = await client.models.generateContent({
        model: DEFAULT_MODEL,
        contents: input.prompt,
        config: config as any,
      });

      // Extract function calls from response
      const functionCalls: FunctionCall[] = [];

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const call of response.functionCalls) {
          if (call.name && call.args) {
            functionCalls.push({
              name: call.name,
              args: call.args as Record<string, unknown>,
            });
          }
        }
      }

      return {
        functionCalls,
        response: response.text ?? undefined,
        requiresExecution: functionCalls.length > 0,
      };
    } catch (error) {
      throw new Error(
        `Function Calling operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Optional: Execute the function calls and generate final response
   */
  async next?(output: FunctionCallOutput): Promise<void> {
    if (!output.requiresExecution) {
      console.log(`[FunctionCallingOperator] No function calls to execute`);
      return;
    }

    console.log(
      `[FunctionCallingOperator] Detected ${output.functionCalls.length} function call(s)`
    );

    for (const call of output.functionCalls) {
      console.log(`  - ${call.name}(${JSON.stringify(call.args)})`);
    }

    // TODO: Implement function execution logic
    // This would:
    // 1. Match function names to actual implementations
    // 2. Execute functions with provided arguments
    // 3. Collect results
    // 4. Send results back to Gemini for final response
    // 5. Update spreadsheet with results
  }

  /**
   * Error handling
   */
  async onError?(error: Error, _input: FunctionCallInput): Promise<void> {
    console.error(`[FunctionCallingOperator] Error:`, error);

    // TODO: Could retry with different function declarations or notify user
  }
}

/**
 * Function executor registry
 * Maps function names to actual implementations
 */
export class FunctionRegistry {
  private functions = new Map<
    string,
    (args: Record<string, unknown>) => Promise<unknown>
  >();

  /**
   * Register a function implementation
   */
  register(
    name: string,
    implementation: (args: Record<string, unknown>) => Promise<unknown>
  ): void {
    this.functions.set(name, implementation);
  }

  /**
   * Execute a function by name
   */
  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const fn = this.functions.get(name);
    if (!fn) {
      throw new Error(`Function not found: ${name}`);
    }

    try {
      return await fn(args);
    } catch (error) {
      throw new Error(
        `Function execution failed for ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if a function is registered
   */
  has(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Get all registered function names
   */
  getRegisteredFunctions(): string[] {
    return Array.from(this.functions.keys());
  }
}

/**
 * Helper: Execute function calls and generate final response
 */
export async function executeFunctionCalls(
  operator: FunctionCallingOperator,
  input: FunctionCallInput,
  registry: FunctionRegistry
): Promise<{ results: unknown[]; finalResponse?: string }> {
  // First, get function calls from Gemini
  const output = await operator.operation(input);

  if (!output.requiresExecution) {
    return {
      results: [],
      finalResponse: output.response,
    };
  }

  // Execute each function call
  const results: unknown[] = [];
  for (const call of output.functionCalls) {
    if (registry.has(call.name)) {
      const result = await registry.execute(call.name, call.args);
      results.push(result);
    } else {
      console.warn(`Function ${call.name} not found in registry`);
    }
  }

  // TODO: Send results back to Gemini for final user-friendly response
  // This would involve another generateContent call with function results

  return {
    results,
    finalResponse: output.response,
  };
}

/**
 * Common function declarations for reuse
 */
export const CommonFunctionDeclarations: Record<string, FunctionDeclaration> = {
  /**
   * Get current time
   */
  getCurrentTime: {
    name: "get_current_time",
    description: "Gets the current time in a specific timezone",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description: "Timezone identifier (e.g., 'America/New_York', 'UTC')",
        },
      },
      required: ["timezone"],
    },
  },

  /**
   * Send email
   */
  sendEmail: {
    name: "send_email",
    description: "Sends an email to specified recipients",
    parameters: {
      type: "object",
      properties: {
        to: {
          type: "string",
          description: "Email address of the recipient",
        },
        subject: {
          type: "string",
          description: "Subject line of the email",
        },
        body: {
          type: "string",
          description: "Body content of the email",
        },
      },
      required: ["to", "subject", "body"],
    },
  },

  /**
   * Schedule meeting
   */
  scheduleMeeting: {
    name: "schedule_meeting",
    description: "Schedules a meeting with specified attendees",
    parameters: {
      type: "object",
      properties: {
        attendees: {
          type: "string",
          description: "Comma-separated list of attendee emails",
        },
        date: {
          type: "string",
          description: "Date of the meeting (YYYY-MM-DD)",
        },
        time: {
          type: "string",
          description: "Time of the meeting (HH:MM)",
        },
        topic: {
          type: "string",
          description: "Subject or topic of the meeting",
        },
      },
      required: ["attendees", "date", "time", "topic"],
    },
  },

  /**
   * Database query
   */
  queryDatabase: {
    name: "query_database",
    description: "Queries the database for information",
    parameters: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Name of the database table to query",
        },
        filter: {
          type: "string",
          description: "SQL-like filter conditions",
        },
        limit: {
          type: "string",
          description: "Maximum number of results to return",
        },
      },
      required: ["table"],
    },
  },
};
