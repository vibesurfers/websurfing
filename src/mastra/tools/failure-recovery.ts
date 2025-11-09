import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/server/db";
import { eventQueue, cellProcessingStatus, columns } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Failure Recovery Tool
 *
 * Analyzes failed operations and attempts recovery through:
 * - Retrying with improved prompts
 * - Switching to alternative operators
 * - Adjusting operator parameters
 * - Creating new events with better context
 *
 * This tool enables the supervisor agent to:
 * - Automatically recover from failures
 * - Improve operator performance through prompt engineering
 * - Ensure user satisfaction by providing accurate results
 */
export const failureRecoveryTool = createTool({
  id: "failure-recovery",
  description: "Analyze failed operations and attempt recovery with improved prompts, alternative operators, or adjusted parameters.",
  inputSchema: z.object({
    recoveryAction: z.enum([
      "analyze_failure",
      "retry_with_improvement",
      "switch_operator",
      "enhance_prompt",
      "create_recovery_event"
    ]).describe("Type of recovery action to perform"),
    eventId: z.string().uuid().optional().describe("Specific failed event ID to recover"),
    sheetId: z.string().uuid().describe("Sheet ID containing the failure"),
    rowIndex: z.number().optional().describe("Row index of failed cell"),
    colIndex: z.number().optional().describe("Column index of failed cell"),
    errorAnalysis: z.string().optional().describe("Analysis of what went wrong"),
    improvedPrompt: z.string().optional().describe("Improved prompt to use for retry"),
    alternativeOperator: z.string().optional().describe("Alternative operator to try"),
    userId: z.string().describe("User ID for the operation"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    recoveryAction: z.string(),
    analysisResults: z.object({
      originalError: z.string().optional(),
      failureType: z.string().optional(),
      rootCause: z.string().optional(),
      improvementStrategy: z.string().optional(),
    }).optional(),
    recoveryAttempt: z.object({
      method: z.string(),
      newEventId: z.string().optional(),
      promptChanges: z.string().optional(),
      operatorChanges: z.string().optional(),
      parameterAdjustments: z.record(z.any()).optional(),
    }).optional(),
    recommendations: z.array(z.string()),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    const { recoveryAction, eventId, sheetId, rowIndex, colIndex, errorAnalysis, improvedPrompt, alternativeOperator, userId } = context;

    console.log(`[Failure Recovery] Performing ${recoveryAction} for event ${eventId} or cell (${rowIndex}, ${colIndex})`);

    const results: any = {
      success: false,
      recoveryAction,
      recommendations: [],
      message: "",
    };

    try {
      switch (recoveryAction) {
        case "analyze_failure": {
          if (!eventId) {
            results.message = "Event ID required for failure analysis";
            break;
          }

          // Get the failed event details
          const failedEvent = await db
            .select()
            .from(eventQueue)
            .where(eq(eventQueue.id, eventId))
            .limit(1);

          if (failedEvent.length === 0) {
            results.message = "Failed event not found";
            break;
          }

          const event = failedEvent[0];
          const payload = event.payload as any;

          // Analyze the failure
          const analysis = {
            originalError: event.lastError || "No error message available",
            failureType: this.classifyError(event.lastError || ""),
            rootCause: this.identifyRootCause(event, payload),
            improvementStrategy: this.suggestImprovement(event, payload),
          };

          results.analysisResults = analysis;
          results.success = true;
          results.message = `Analyzed failure: ${analysis.failureType}`;

          // Generate recommendations based on analysis
          if (analysis.failureType === "API_ERROR") {
            results.recommendations.push("Retry with exponential backoff");
            results.recommendations.push("Consider switching to alternative model");
          } else if (analysis.failureType === "VALIDATION_ERROR") {
            results.recommendations.push("Review and improve validation rules");
            results.recommendations.push("Enhance data cleaning before processing");
          } else if (analysis.failureType === "PROMPT_ERROR") {
            results.recommendations.push("Refine prompt with better examples");
            results.recommendations.push("Add more specific instructions");
          }

          break;
        }

        case "retry_with_improvement": {
          if (!eventId && (rowIndex === undefined || colIndex === undefined)) {
            results.message = "Either event ID or cell coordinates required for retry";
            break;
          }

          let targetEvent;
          if (eventId) {
            const events = await db
              .select()
              .from(eventQueue)
              .where(eq(eventQueue.id, eventId))
              .limit(1);
            targetEvent = events[0];
          }

          // Get column configuration for the target cell
          const targetColIndex = colIndex !== undefined ? colIndex : (targetEvent?.payload as any)?.colIndex;

          const columnConfig = await db
            .select()
            .from(columns)
            .where(and(
              eq(columns.sheetId, sheetId),
              eq(columns.position, targetColIndex)
            ))
            .limit(1);

          if (columnConfig.length === 0) {
            results.message = "Column configuration not found";
            break;
          }

          const column = columnConfig[0];

          // Create improved event
          const improvedPayload = targetEvent ? { ...targetEvent.payload } : {
            spreadsheetId: sheetId,
            rowIndex: rowIndex!,
            colIndex: targetColIndex,
            content: "retry_with_improvement",
          };

          // Create new event with retry flag
          const [newEvent] = await db
            .insert(eventQueue)
            .values({
              sheetId,
              userId,
              eventType: 'robot_cell_update',
              payload: {
                ...improvedPayload,
                retryAttempt: true,
                originalEventId: eventId,
                improvementNote: errorAnalysis || "Automated improvement attempt",
              },
              status: 'pending',
              retryCount: 0,
            })
            .returning();

          // If improved prompt provided, update column configuration
          if (improvedPrompt) {
            await db
              .update(columns)
              .set({
                prompt: improvedPrompt,
                updatedAt: new Date(),
              })
              .where(eq(columns.id, column.id));
          }

          results.recoveryAttempt = {
            method: "retry_with_improvement",
            newEventId: newEvent.id,
            promptChanges: improvedPrompt ? "Prompt updated with improvements" : "No prompt changes",
          };

          results.success = true;
          results.message = `Created retry event ${newEvent.id} with improvements`;
          results.recommendations.push("Monitor the retry attempt for success");

          break;
        }

        case "switch_operator": {
          if (colIndex === undefined) {
            results.message = "Column index required for operator switch";
            break;
          }

          if (!alternativeOperator) {
            results.message = "Alternative operator required for switch";
            break;
          }

          // Get current column configuration
          const columnConfig = await db
            .select()
            .from(columns)
            .where(and(
              eq(columns.sheetId, sheetId),
              eq(columns.position, colIndex)
            ))
            .limit(1);

          if (columnConfig.length === 0) {
            results.message = "Column configuration not found";
            break;
          }

          const column = columnConfig[0];
          const originalOperator = column.operatorType;

          // Update column to use alternative operator
          await db
            .update(columns)
            .set({
              operatorType: alternativeOperator,
              updatedAt: new Date(),
            })
            .where(eq(columns.id, column.id));

          // Create new event to reprocess with new operator
          if (rowIndex !== undefined) {
            const [newEvent] = await db
              .insert(eventQueue)
              .values({
                sheetId,
                userId,
                eventType: 'robot_cell_update',
                payload: {
                  spreadsheetId: sheetId,
                  rowIndex,
                  colIndex,
                  content: "operator_switch_retry",
                  originalOperator,
                  newOperator: alternativeOperator,
                },
                status: 'pending',
              })
              .returning();

            results.recoveryAttempt = {
              method: "switch_operator",
              newEventId: newEvent.id,
              operatorChanges: `Switched from ${originalOperator} to ${alternativeOperator}`,
            };
          }

          results.success = true;
          results.message = `Switched column operator from ${originalOperator} to ${alternativeOperator}`;
          results.recommendations.push("Monitor performance with new operator");
          results.recommendations.push("Consider reverting if new operator doesn't improve results");

          break;
        }

        case "enhance_prompt": {
          if (colIndex === undefined) {
            results.message = "Column index required for prompt enhancement";
            break;
          }

          // Get current column configuration
          const columnConfig = await db
            .select()
            .from(columns)
            .where(and(
              eq(columns.sheetId, sheetId),
              eq(columns.position, colIndex)
            ))
            .limit(1);

          if (columnConfig.length === 0) {
            results.message = "Column configuration not found";
            break;
          }

          const column = columnConfig[0];
          const currentPrompt = column.prompt || "";

          // Generate enhanced prompt based on error analysis
          const enhancedPrompt = this.enhancePrompt(currentPrompt, errorAnalysis || "");

          // Update column with enhanced prompt
          await db
            .update(columns)
            .set({
              prompt: enhancedPrompt,
              updatedAt: new Date(),
            })
            .where(eq(columns.id, column.id));

          results.recoveryAttempt = {
            method: "enhance_prompt",
            promptChanges: `Enhanced prompt with better instructions and examples`,
          };

          results.success = true;
          results.message = "Enhanced column prompt with improved instructions";
          results.recommendations.push("Test enhanced prompt with sample inputs");
          results.recommendations.push("Monitor improvement in result quality");

          break;
        }

        case "create_recovery_event": {
          if (rowIndex === undefined || colIndex === undefined) {
            results.message = "Row and column indices required for recovery event";
            break;
          }

          // Create a focused recovery event with detailed context
          const [recoveryEvent] = await db
            .insert(eventQueue)
            .values({
              sheetId,
              userId,
              eventType: 'manual_trigger',
              payload: {
                spreadsheetId: sheetId,
                rowIndex,
                colIndex,
                triggerType: 'recovery_attempt',
                originalError: errorAnalysis,
                recoveryStrategy: 'supervisor_guided',
                priority: 'high',
              },
              status: 'pending',
            })
            .returning();

          results.recoveryAttempt = {
            method: "create_recovery_event",
            newEventId: recoveryEvent.id,
          };

          results.success = true;
          results.message = `Created high-priority recovery event ${recoveryEvent.id}`;
          results.recommendations.push("Prioritize processing of recovery event");
          results.recommendations.push("Apply lessons learned to prevent similar failures");

          break;
        }
      }

      if (!results.success && !results.message) {
        results.message = "Recovery action completed but no specific results";
      }

      console.log(`[Failure Recovery] ${recoveryAction} result: ${results.message}`);
      return results;

    } catch (error) {
      console.error(`[Failure Recovery] Error during ${recoveryAction}:`, error);
      return {
        ...results,
        success: false,
        message: `Recovery action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        recommendations: ["Check failure recovery tool implementation", "Review database connectivity"],
      };
    }
  },

  // Helper methods (these would normally be in a separate utility file)
  classifyError(errorMessage: string): string {
    if (errorMessage.includes('API') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      return 'API_ERROR';
    }
    if (errorMessage.includes('validation') || errorMessage.includes('invalid') || errorMessage.includes('format')) {
      return 'VALIDATION_ERROR';
    }
    if (errorMessage.includes('prompt') || errorMessage.includes('instruction') || errorMessage.includes('parse')) {
      return 'PROMPT_ERROR';
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
      return 'NETWORK_ERROR';
    }
    return 'UNKNOWN_ERROR';
  },

  identifyRootCause(event: any, payload: any): string {
    // Analyze event and payload to identify root cause
    if (event.retryCount > 2) {
      return 'Persistent failure - may require operator or prompt redesign';
    }
    if (payload?.content?.length > 1000) {
      return 'Input too long - may need content preprocessing';
    }
    return 'Single failure - likely transient issue';
  },

  suggestImprovement(event: any, payload: any): string {
    // Suggest improvement strategy based on failure pattern
    if (event.retryCount === 0) {
      return 'Simple retry with same parameters';
    }
    if (event.lastError?.includes('format')) {
      return 'Improve output format instructions in prompt';
    }
    if (event.lastError?.includes('quota')) {
      return 'Implement exponential backoff and queue management';
    }
    return 'Comprehensive prompt and operator review needed';
  },

  enhancePrompt(currentPrompt: string, errorAnalysis: string): string {
    // Enhance prompt based on error analysis
    let enhanced = currentPrompt;

    // Add specific improvements based on error type
    if (errorAnalysis.includes('format')) {
      enhanced += '\n\nIMPORTANT: Provide response in the exact format specified. Follow all formatting guidelines precisely.';
    }

    if (errorAnalysis.includes('validation')) {
      enhanced += '\n\nVALIDATION: Ensure all output meets validation requirements. Double-check data types and constraints.';
    }

    if (errorAnalysis.includes('accuracy')) {
      enhanced += '\n\nACCURACY: Focus on providing factual, verifiable information. Include sources when possible.';
    }

    // Add general improvements
    enhanced += '\n\nQUALITY GUIDELINES:\n- Provide accurate, fact-based information\n- Include relevant details\n- Ensure consistent formatting\n- Validate all outputs before submitting';

    return enhanced;
  },
});