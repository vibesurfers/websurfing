/**
 * Operator Controller
 *
 * Central dispatch system for routing events to appropriate Gemini operators.
 * Follows the architecture pattern defined in .tribe/PROJECT-ARCHITECTURE.md
 */

import { GoogleSearchGeminiOperator } from "./google-search-operator";
import { URLContextEnrichmentOperator } from "./url-context-operator";
import { StructuredOutputConversionOperator } from "./structured-output-operator";
import { FunctionCallingOperator } from "./function-calling-operator";
import type { BaseOperator, OperatorName } from "@/types/operators";

/**
 * Base event structure (from PROJECT-ARCHITECTURE.md)
 */
export interface BaseEvent<T = unknown> {
  userId: string;
  eventId: string;
  eventType: EventType;
  timestamp: Date;
  data: T;
}

/**
 * Event types
 */
export type EventType =
  | "user_cell_edit"
  | "robot_cell_update"
  | "manual_trigger"
  | "operator_result";

/**
 * Manual trigger data
 */
export interface ManualTriggerData {
  spreadsheetId: string;
  triggerType: string; // e.g., 'search', 'enrich_urls', 'extract_data', 'call_function'
  selectedCells?: {
    rowIndex: number;
    columnId: string;
  }[];
  parameters?: Record<string, unknown>;
}

/**
 * Cell edit data
 */
export interface UpdateCellInput {
  spreadsheetId: string;
  rowIndex: number;
  columnId: string;
  content: string;
}

/**
 * Operator Controller
 *
 * Manages operator registry and event dispatching
 */
export class OperatorController {
  private operators: Map<OperatorName, BaseOperator<unknown, unknown>>;

  constructor() {
    // Register all Gemini operators
    this.operators = new Map<OperatorName, BaseOperator<unknown, unknown>>([
      ["google_search", new GoogleSearchGeminiOperator() as BaseOperator<unknown, unknown>],
      ["url_context", new URLContextEnrichmentOperator() as BaseOperator<unknown, unknown>],
      ["structured_output", new StructuredOutputConversionOperator() as BaseOperator<unknown, unknown>],
      ["function_calling", new FunctionCallingOperator() as BaseOperator<unknown, unknown>],
    ]);
  }

  /**
   * Main dispatch logic
   * Determines which operator to use based on event type and data
   */
  async dispatch(event: BaseEvent): Promise<void> {
    try {
      const operatorName = this.selectOperator(event.eventType, event.data);
      const operator = this.operators.get(operatorName);

      if (!operator) {
        throw new Error(`No operator found for: ${operatorName}`);
      }

      console.log(
        `[OperatorController] Dispatching event ${event.eventId} to ${operatorName}`
      );

      // Prepare input
      const input = this.prepareInput(event, operatorName);

      // Execute operator
      const output = await operator.operation(input);

      // Call next() hook if defined
      if (operator.next) {
        await operator.next(output);
      }

      // Mark event as completed
      await this.completeEvent(event.eventId, output);

      console.log(
        `[OperatorController] Successfully processed event ${event.eventId}`
      );
    } catch (error) {
      console.error(
        `[OperatorController] Error processing event ${event.eventId}:`,
        error
      );

      // Try operator-specific error handler
      const operatorName = this.selectOperator(event.eventType, event.data);
      const operator = this.operators.get(operatorName);

      if (operator?.onError) {
        const input = this.prepareInput(event, operatorName);
        await operator.onError(error as Error, input);
      }

      // Mark event as failed
      await this.failEvent(event.eventId, error as Error);
    }
  }

  /**
   * Select appropriate operator based on event type and data
   *
   * This implements the hardcoded processing directions from the architecture
   */
  private selectOperator(eventType: EventType, data: unknown): OperatorName {
    switch (eventType) {
      case "user_cell_edit": {
        const cellData = data as UpdateCellInput;
        const content = cellData.content.toLowerCase().trim();

        // Detect search queries
        if (this.isSearchQuery(content)) {
          return "google_search";
        }

        // Detect URLs
        if (this.containsUrls(content)) {
          return "url_context";
        }

        // Default: structured output for data extraction
        return "structured_output";
      }

      case "manual_trigger": {
        const trigger = data as ManualTriggerData;

        switch (trigger.triggerType) {
          case "search":
          case "google_search":
            return "google_search";

          case "enrich_urls":
          case "url_context":
            return "url_context";

          case "call_function":
          case "function_calling":
            return "function_calling";

          case "extract_data":
          case "structured_output":
            return "structured_output";

          default:
            // Default to structured output
            return "structured_output";
        }
      }

      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }

  /**
   * Prepare input for specific operator
   */
  private prepareInput(event: BaseEvent, operatorName: OperatorName): unknown {
    switch (operatorName) {
      case "google_search": {
        const cellData = event.data as UpdateCellInput | ManualTriggerData;

        // Extract query from cell content or trigger parameters
        const query =
          "content" in cellData
            ? cellData.content.replace(/^(search:|find:|query:)/i, "").trim()
            : (cellData.parameters?.query as string) || "";

        return {
          query,
          maxResults: 10,
        };
      }

      case "url_context": {
        const cellData = event.data as UpdateCellInput | ManualTriggerData;

        // Extract URLs from content or parameters
        const urls =
          "content" in cellData
            ? this.extractUrls(cellData.content)
            : (cellData.parameters?.urls as string[]) || [];

        return {
          urls,
          extractionPrompt: (cellData as ManualTriggerData).parameters
            ?.extractionPrompt as string | undefined,
        };
      }

      case "structured_output": {
        const cellData = event.data as UpdateCellInput | ManualTriggerData;

        const rawData =
          "content" in cellData
            ? cellData.content
            : (cellData.parameters?.rawData as string) || "";

        return {
          rawData,
          outputSchema:
            (cellData as ManualTriggerData).parameters?.schema || {},
          prompt: (cellData as ManualTriggerData).parameters?.prompt as
            | string
            | undefined,
        };
      }

      case "function_calling": {
        const trigger = event.data as ManualTriggerData;

        return {
          prompt: (trigger.parameters?.prompt as string) || "",
          availableFunctions:
            (trigger.parameters?.functions as unknown[]) || [],
          toolConfig: trigger.parameters?.toolConfig,
        };
      }

      default:
        return event.data;
    }
  }

  /**
   * Detect if content is a search query
   */
  private isSearchQuery(content: string): boolean {
    // Check for search prefixes
    const searchPrefixes = /^(search:|find:|query:|what is|who is|where is|when is|how to)/i;
    if (searchPrefixes.test(content)) {
      return true;
    }

    // Check for question marks (likely a question)
    if (content.includes("?") && content.length < 200) {
      return true;
    }

    return false;
  }

  /**
   * Check if content contains URLs
   */
  private containsUrls(content: string): boolean {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    return urlPattern.test(content);
  }

  /**
   * Extract URLs from text
   */
  private extractUrls(content: string): string[] {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    return content.match(urlPattern) || [];
  }

  /**
   * Mark event as completed in database
   */
  private async completeEvent(_eventId: string, _output: unknown): Promise<void> {
    // TODO: Update event_queue table
    // - status = 'completed'
    // - completedAt = now
    // - Store output in appropriate field
    console.log(`[OperatorController] Event completed (DB update not implemented)`);
  }

  /**
   * Mark event as failed in database
   */
  private async failEvent(_eventId: string, error: Error): Promise<void> {
    // TODO: Update event_queue table
    // - status = 'failed'
    // - error = error.message
    // - Increment retryCount
    console.error(`[OperatorController] Event failed:`, error.message);
  }

  /**
   * Get operator by name
   */
  getOperator(name: OperatorName): BaseOperator<unknown, unknown> | undefined {
    return this.operators.get(name);
  }

  /**
   * Get all registered operators
   */
  getRegisteredOperators(): OperatorName[] {
    return Array.from(this.operators.keys());
  }
}

/**
 * Singleton instance for global access
 */
let controllerInstance: OperatorController | null = null;

/**
 * Get the global operator controller instance
 */
export function getOperatorController(): OperatorController {
  if (!controllerInstance) {
    controllerInstance = new OperatorController();
  }
  return controllerInstance;
}

/**
 * Reset the controller instance (useful for testing)
 */
export function resetOperatorController(): void {
  controllerInstance = null;
}
