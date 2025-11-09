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
import { db } from "@/server/db";
import { eventQueue } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ColumnAwareWrapper } from "./column-aware-wrapper";

/**
 * Sheet context for operators
 */
export interface SheetContext {
  sheetId: string;
  templateType: 'lucky' | 'marketing' | 'scientific' | null;
  systemPrompt?: string;
  columns: Array<{ id: string; title: string; position: number; dataType: string }>;
  rowIndex: number;
  currentColumnIndex: number;
  rowData: Record<number, string>;
}

/**
 * Base event structure (from PROJECT-ARCHITECTURE.md)
 */
export interface BaseEvent<T = unknown> {
  userId: string;
  eventId: string;
  eventType: EventType;
  timestamp: Date;
  data: T;
  sheetContext?: SheetContext;
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

      console.log(`[OperatorController] Operator returned:`, output);

      // Write result to next column in the row
      if (event.sheetContext) {
        await ColumnAwareWrapper.writeToNextColumn(
          event.sheetContext,
          event.userId,
          event.eventId,
          output,
          operatorName
        );
      }

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
      case "user_cell_edit":
      case "robot_cell_update": {
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

        let query =
          "content" in cellData
            ? cellData.content.replace(/^(search:|find:|query:)/i, "").trim()
            : (cellData.parameters?.query as string) || "";

        if (event.sheetContext) {
          const ctx = event.sheetContext;
          const nextCol = ctx.columns[ctx.currentColumnIndex + 1];
          if (nextCol) {
            const contextPrompt = ColumnAwareWrapper.buildContextualPrompt(ctx, nextCol.title);
            query = `${query} ${nextCol.title}`.trim();
            console.log('[OperatorController] Context-aware search query:', query);
            console.log('[OperatorController] Full context:\n', contextPrompt);
          }
        }

        return {
          query,
          maxResults: 10,
        };
      }

      case "url_context": {
        const cellData = event.data as UpdateCellInput | ManualTriggerData;

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
  private async completeEvent(eventId: string, _output: unknown): Promise<void> {
    await db
      .update(eventQueue)
      .set({
        status: 'completed',
        processedAt: new Date(),
      })
      .where(eq(eventQueue.id, eventId));

    console.log(`[OperatorController] Event ${eventId} marked as completed`);
  }

  /**
   * Mark event as failed in database
   */
  private async failEvent(eventId: string, error: Error): Promise<void> {
    await db
      .update(eventQueue)
      .set({
        status: 'failed',
      })
      .where(eq(eventQueue.id, eventId));

    console.error(`[OperatorController] Event ${eventId} failed:`, error.message);
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
