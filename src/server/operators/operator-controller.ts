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
import { SimilarityExpansionOperator } from "./similarity-operator";
import { AcademicPDFSearchOperator } from "./academic-search-operator";
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
  columns: Array<{
    id: string;
    title: string;
    position: number;
    dataType: string;
    maxLength?: number;
    minLength?: number;
    required?: boolean;
    validationPattern?: string;
    examples?: string[];
    description?: string;
  }>;
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
      ["similarity_expansion", new SimilarityExpansionOperator() as BaseOperator<unknown, unknown>],
      ["academic_search", new AcademicPDFSearchOperator() as BaseOperator<unknown, unknown>],
    ]);
  }

  /**
   * Main dispatch logic
   * Determines which operator to use based on event type and data
   */
  async dispatch(event: BaseEvent): Promise<void> {
    try {
      const operatorName = this.selectOperator(event.eventType, event.data, event.sheetContext);
      const operator = this.operators.get(operatorName);

      if (!operator) {
        throw new Error(`No operator found for: ${operatorName}`);
      }

      console.log(
        `[OperatorController] Dispatching event ${event.eventId} to ${operatorName}`
      );

      // Set status to processing for next column
      if (event.sheetContext) {
        const targetColIndex = event.sheetContext.currentColumnIndex + 1;
        const statusMessages: Record<string, string> = {
          'google_search': 'Searching Google...',
          'url_context': 'Analyzing URL...',
          'structured_output': 'Extracting data...',
          'function_calling': 'Calling function...',
          'similarity_expansion': 'Finding similar concepts...',
          'academic_search': 'Searching academic papers...',
        };

        await ColumnAwareWrapper.updateCellStatus(
          event.sheetContext,
          event.userId,
          targetColIndex,
          'processing',
          operatorName,
          statusMessages[operatorName] || 'Processing...'
        );
      }

      // Prepare input
      const input = this.prepareInput(event, operatorName);

      // Execute operator
      const output = await operator.operation(input);

      console.log(`[OperatorController] Operator returned:`, output);

      // Write result to next column in the row
      if (event.sheetContext) {
        const writeResult = await ColumnAwareWrapper.writeToNextColumn(
          event.sheetContext,
          event.userId,
          event.eventId,
          output,
          operatorName
        );

        console.log(`[OperatorController] Write result:`, {
          success: writeResult.success,
          needsRetry: writeResult.needsRetry,
          issues: writeResult.validationIssues
        });

        // Handle retry if needed and not already attempted
        const retryCount = await this.getRetryCount(event.eventId);
        const maxRetries = 2;

        if (writeResult.needsRetry && retryCount < maxRetries && writeResult.retryPrompt) {
          console.log(`[OperatorController] Retrying with improved prompt (attempt ${retryCount + 1}/${maxRetries})`);

          // Update retry count
          await this.incrementRetryCount(event.eventId);

          // Update cell status to show retry
          const targetColIndex = event.sheetContext.currentColumnIndex + 1;
          await ColumnAwareWrapper.updateCellStatus(
            event.sheetContext,
            event.userId,
            targetColIndex,
            'processing',
            operatorName,
            `Retrying... (${retryCount + 1}/${maxRetries})`
          );

          // Prepare improved input based on validation feedback
          const improvedInput = this.prepareImprovedInput(event, operatorName, writeResult.retryPrompt);

          try {
            // Retry with improved prompt
            const retryOutput = await operator.operation(improvedInput);
            console.log(`[OperatorController] Retry output:`, retryOutput);

            // Write retry result
            const retryWriteResult = await ColumnAwareWrapper.writeToNextColumn(
              event.sheetContext,
              event.userId,
              event.eventId,
              retryOutput,
              operatorName
            );

            if (retryWriteResult.success) {
              console.log(`[OperatorController] Retry successful`);
            } else {
              console.warn(`[OperatorController] Retry failed, using original result`);
            }

          } catch (retryError) {
            console.error(`[OperatorController] Retry failed:`, retryError);
            // Continue with original result
          }
        }

        // Mark as completed
        const targetColIndex = event.sheetContext.currentColumnIndex + 1;
        await ColumnAwareWrapper.updateCellStatus(
          event.sheetContext,
          event.userId,
          targetColIndex,
          writeResult.success ? 'completed' : 'error',
          operatorName,
          writeResult.success ? undefined : writeResult.validationIssues?.join(', ')
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
      const operatorName = this.selectOperator(event.eventType, event.data, event.sheetContext);
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
  private selectOperator(eventType: EventType, data: unknown, sheetContext?: SheetContext): OperatorName {
    switch (eventType) {
      case "user_cell_edit":
      case "robot_cell_update": {
        const cellData = data as UpdateCellInput;
        const content = cellData.content.toLowerCase().trim();

        // Priority 1: Check if this is a scientific template - always use academic search for search queries
        if (sheetContext?.templateType === 'scientific') {
          // For scientific templates, prioritize academic search for any search-like content
          if (this.isSearchQuery(content) || this.isAcademicSearch(content)) {
            console.log('[OperatorController] Scientific template detected - using academic_search');
            return "academic_search";
          }

          // For URLs in scientific context, still use url_context but could be enhanced later
          if (this.containsUrls(content)) {
            return "url_context";
          }

          // Default for scientific templates: structured output for data extraction
          return "structured_output";
        }

        // Priority 2: General academic/scientific search queries (for non-scientific templates)
        if (this.isAcademicSearch(content)) {
          return "academic_search";
        }

        // Priority 3: Regular search queries
        if (this.isSearchQuery(content)) {
          return "google_search";
        }

        // Priority 4: URLs
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

          case "academic_search":
          case "research":
            return "academic_search";

          case "enrich_urls":
          case "url_context":
            return "url_context";

          case "call_function":
          case "function_calling":
            return "function_calling";

          case "extract_data":
          case "structured_output":
            return "structured_output";

          case "similarity_expansion":
          case "find_similar":
            return "similarity_expansion";

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
            const contextPrompt = ColumnAwareWrapper.buildContextualPromptWithFormat(ctx, nextCol.title, operatorName);
            // Build a focused query that includes the column goal
            query = `${contextPrompt}\n\nSearch query: Find information for "${nextCol.title}" based on: ${query}`;
            console.log('[OperatorController] Context-aware search query:\n', query);
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

        let extractionPrompt = (cellData as ManualTriggerData).parameters?.extractionPrompt as string | undefined;

        // Build context-aware extraction prompt if sheet context is available
        if (event.sheetContext) {
          const ctx = event.sheetContext;
          const nextCol = ctx.columns[ctx.currentColumnIndex + 1];
          if (nextCol) {
            const contextPrompt = ColumnAwareWrapper.buildContextualPromptWithFormat(ctx, nextCol.title, operatorName);
            extractionPrompt = contextPrompt + (extractionPrompt ? `\n\nAdditional instructions: ${extractionPrompt}` : '');
            console.log('[OperatorController] Context-aware URL extraction prompt:\n', extractionPrompt);
          }
        }

        return {
          urls,
          extractionPrompt,
        };
      }

      case "structured_output": {
        const cellData = event.data as UpdateCellInput | ManualTriggerData;

        // Use row data as rawData if available, otherwise fall back to cell content
        let rawData = "";
        if (event.sheetContext) {
          // Concatenate all row data for context
          const rowDataArray = Object.entries(event.sheetContext.rowData)
            .filter(([_, value]) => value && value.trim())
            .map(([colIdx, value]) => {
              const colTitle = event.sheetContext!.columns[parseInt(colIdx)]?.title || `Column ${colIdx}`;
              return `${colTitle}: ${value}`;
            });
          rawData = rowDataArray.join('\n');
        }

        // Fall back to cell content if no row data
        if (!rawData) {
          rawData = "content" in cellData
            ? cellData.content
            : (cellData.parameters?.rawData as string) || "";
        }

        let prompt = (cellData as ManualTriggerData).parameters?.prompt as string | undefined;

        // Build context-aware prompt if sheet context is available
        if (event.sheetContext) {
          const ctx = event.sheetContext;
          const nextCol = ctx.columns[ctx.currentColumnIndex + 1];
          if (nextCol) {
            const contextPrompt = ColumnAwareWrapper.buildContextualPromptWithFormat(ctx, nextCol.title, operatorName);
            prompt = contextPrompt + (prompt ? `\n\nAdditional instructions: ${prompt}` : '');
            console.log('[OperatorController] Context-aware structured output prompt:\n', prompt);
            console.log('[OperatorController] Raw data for processing:\n', rawData);
          }
        }

        return {
          rawData,
          outputSchema:
            (cellData as ManualTriggerData).parameters?.schema || {},
          prompt,
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

      case "academic_search": {
        const cellData = event.data as UpdateCellInput | ManualTriggerData;

        let topic =
          "content" in cellData
            ? cellData.content.replace(/^(search:|find:|query:|research:)/i, "").trim()
            : (cellData.parameters?.topic as string) || "";

        // Extract research field and other parameters
        const researchField = (cellData as ManualTriggerData).parameters?.researchField as string;
        const yearRange = (cellData as ManualTriggerData).parameters?.yearRange as { start?: number; end?: number };
        const minCitations = (cellData as ManualTriggerData).parameters?.minCitations as number;

        if (event.sheetContext) {
          const ctx = event.sheetContext;
          const nextCol = ctx.columns[ctx.currentColumnIndex + 1];
          if (nextCol) {
            const contextPrompt = ColumnAwareWrapper.buildContextualPromptWithFormat(ctx, nextCol.title, operatorName);
            // Enhance topic with academic context
            topic = `${topic} (Academic research focus: ${nextCol.title})`;
            console.log('[OperatorController] Context-aware academic search topic:\n', topic);
          }
        }

        return {
          topic,
          query: topic, // Also provide as query for base interface compatibility
          researchField,
          yearRange,
          minCitations,
          maxResults: 15,
          includeReviews: true,
        };
      }

      default:
        return event.data;
    }
  }

  private isAcademicSearch(content: string): boolean {
    const academicKeywords = [
      // Research terms
      'research', 'paper', 'papers', 'study', 'studies', 'publication', 'journal',
      'article', 'academic', 'scholar', 'citation', 'literature', 'peer review',
      'peer-reviewed', 'manuscript', 'thesis', 'dissertation',

      // File formats
      'pdf', 'doi', 'arxiv', 'pubmed',

      // Scientific fields
      'science', 'scientific', 'biology', 'physics', 'chemistry', 'mathematics',
      'medicine', 'engineering', 'computer science', 'machine learning', 'ai',
      'psychology', 'neuroscience', 'genomics', 'bioinformatics',

      // Research indicators
      'highly cited', 'impact factor', 'breakthrough', 'seminal',
      'cutting edge', 'state of the art', 'systematic review'
    ];

    // Check for academic keywords
    const keywordMatches = academicKeywords.filter(keyword =>
      content.includes(keyword)
    ).length;

    // Also check for research-specific prefixes
    const researchPrefixes = /^(research:|find papers|find research|academic search|literature review)/i;

    return keywordMatches >= 1 || researchPrefixes.test(content);
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

  /**
   * Get retry count for an event
   */
  private async getRetryCount(eventId: string): Promise<number> {
    try {
      const event = await db.select({ retryCount: eventQueue.retryCount })
        .from(eventQueue)
        .where(eq(eventQueue.id, eventId))
        .limit(1);

      return event[0]?.retryCount || 0;
    } catch (error) {
      console.error(`[OperatorController] Error getting retry count for ${eventId}:`, error);
      return 0;
    }
  }

  /**
   * Increment retry count for an event
   */
  private async incrementRetryCount(eventId: string): Promise<void> {
    try {
      const currentCount = await this.getRetryCount(eventId);
      await db.update(eventQueue)
        .set({ retryCount: currentCount + 1 })
        .where(eq(eventQueue.id, eventId));
    } catch (error) {
      console.error(`[OperatorController] Error incrementing retry count for ${eventId}:`, error);
    }
  }

  /**
   * Prepare improved input based on validation feedback
   */
  private prepareImprovedInput(event: BaseEvent, operatorName: OperatorName, retryPrompt: string): unknown {
    const originalInput = this.prepareInput(event, operatorName);

    switch (operatorName) {
      case "google_search": {
        const googleInput = originalInput as { query: string; maxResults: number };
        return {
          ...googleInput,
          query: retryPrompt
        };
      }

      case "url_context": {
        const urlInput = originalInput as { urls: string[]; extractionPrompt?: string };
        return {
          ...urlInput,
          extractionPrompt: retryPrompt
        };
      }

      case "structured_output": {
        const structuredInput = originalInput as { rawData: string; outputSchema?: unknown; prompt?: string };
        return {
          ...structuredInput,
          prompt: retryPrompt
        };
      }

      case "academic_search": {
        const academicInput = originalInput as { topic: string; query: string; [key: string]: unknown };
        return {
          ...academicInput,
          topic: retryPrompt,
          query: retryPrompt
        };
      }

      case "similarity_expansion": {
        const similarityInput = originalInput as { concept: string; [key: string]: unknown };
        // Extract just the concept from the improved prompt
        const conceptMatch = retryPrompt.match(/concept[:\s]+["']?([^"'\n]+)["']?/i);
        const improvedConcept = conceptMatch ? conceptMatch[1] : retryPrompt;

        return {
          ...similarityInput,
          concept: improvedConcept,
          context: retryPrompt
        };
      }

      default:
        return originalInput;
    }
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
