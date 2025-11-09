import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { db } from "@/server/db";
import { eventQueue, cellProcessingStatus, geminiUsageLog } from "@/server/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

/**
 * Event Monitor Tool
 *
 * Monitors the event queue, cell processing status, and Gemini usage logs
 * to detect failures, analyze patterns, and provide insights for improvement.
 *
 * This tool enables the supervisor agent to:
 * - Track failed events and their error patterns
 * - Monitor cell processing failures
 * - Analyze Gemini API errors
 * - Identify recurring issues for proactive improvement
 */
export const eventMonitorTool = createTool({
  id: "event-monitor",
  description: "Monitor events, cell processing status, and API usage to detect failures and analyze patterns for improvement.",
  inputSchema: z.object({
    monitorType: z.enum([
      "failed_events",
      "processing_errors",
      "api_failures",
      "retry_analysis",
      "sheet_health",
      "recent_activity"
    ]).describe("Type of monitoring to perform"),
    sheetId: z.string().uuid().optional().describe("Specific sheet to monitor (optional)"),
    timeWindowHours: z.number().optional().default(24).describe("Time window in hours to look back (default: 24)"),
    limit: z.number().optional().default(50).describe("Maximum number of records to return"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    monitorType: z.string(),
    timeWindow: z.string(),
    summary: z.string(),
    data: z.array(z.object({
      id: z.string().optional(),
      sheetId: z.string().optional(),
      eventType: z.string().optional(),
      status: z.string().optional(),
      error: z.string().optional(),
      retryCount: z.number().optional(),
      timestamp: z.string().optional(),
      details: z.record(z.any()).optional(),
    })),
    insights: z.array(z.string()),
    recommendations: z.array(z.string()),
    errorPatterns: z.record(z.number()).optional(),
  }),
  execute: async ({ context }) => {
    const { monitorType, sheetId, timeWindowHours, limit } = context;

    // Calculate time threshold
    const timeThreshold = new Date();
    timeThreshold.setHours(timeThreshold.getHours() - timeWindowHours);

    console.log(`[Event Monitor] Monitoring ${monitorType} for last ${timeWindowHours} hours`);

    const results: any = {
      success: true,
      monitorType,
      timeWindow: `${timeWindowHours} hours`,
      summary: "",
      data: [],
      insights: [],
      recommendations: [],
    };

    try {
      switch (monitorType) {
        case "failed_events": {
          // Query failed events from event queue
          const whereClause = sheetId
            ? and(eq(eventQueue.status, 'failed'), eq(eventQueue.sheetId, sheetId), gte(eventQueue.createdAt, timeThreshold))
            : and(eq(eventQueue.status, 'failed'), gte(eventQueue.createdAt, timeThreshold));

          const failedEvents = await db
            .select()
            .from(eventQueue)
            .where(whereClause)
            .orderBy(desc(eventQueue.createdAt))
            .limit(limit);

          results.data = failedEvents.map(event => ({
            id: event.id,
            sheetId: event.sheetId,
            eventType: event.eventType,
            status: event.status,
            error: event.lastError || "No error message",
            retryCount: event.retryCount,
            timestamp: event.createdAt?.toISOString(),
            details: {
              payload: event.payload,
              userId: event.userId,
            },
          }));

          // Analyze error patterns
          const errorPatterns: Record<string, number> = {};
          failedEvents.forEach(event => {
            if (event.lastError) {
              // Extract error type from message
              const errorType = event.lastError.split(':')[0] || 'Unknown';
              errorPatterns[errorType] = (errorPatterns[errorType] || 0) + 1;
            }
          });

          results.errorPatterns = errorPatterns;
          results.summary = `Found ${failedEvents.length} failed events in the last ${timeWindowHours} hours`;

          // Generate insights
          if (failedEvents.length > 5) {
            results.insights.push(`High failure rate: ${failedEvents.length} failures detected`);
          }

          const mostCommonError = Object.entries(errorPatterns).sort((a, b) => b[1] - a[1])[0];
          if (mostCommonError) {
            results.insights.push(`Most common error: "${mostCommonError[0]}" (${mostCommonError[1]} occurrences)`);
          }

          // Generate recommendations
          if (failedEvents.some(e => (e.retryCount || 0) === 0)) {
            results.recommendations.push("Some events haven't been retried - consider automatic retry mechanism");
          }

          if (Object.keys(errorPatterns).length > 3) {
            results.recommendations.push("Multiple error types detected - review operator implementations");
          }

          break;
        }

        case "processing_errors": {
          // Query cell processing errors
          const whereClause = sheetId
            ? and(eq(cellProcessingStatus.status, 'error'), eq(cellProcessingStatus.sheetId, sheetId), gte(cellProcessingStatus.updatedAt, timeThreshold))
            : and(eq(cellProcessingStatus.status, 'error'), gte(cellProcessingStatus.updatedAt, timeThreshold));

          const processingErrors = await db
            .select()
            .from(cellProcessingStatus)
            .where(whereClause)
            .orderBy(desc(cellProcessingStatus.updatedAt))
            .limit(limit);

          results.data = processingErrors.map(status => ({
            id: status.id,
            sheetId: status.sheetId,
            status: status.status,
            error: status.statusMessage || "No error message",
            timestamp: status.updatedAt?.toISOString(),
            details: {
              rowIndex: status.rowIndex,
              colIndex: status.colIndex,
              operator: status.operatorName,
            },
          }));

          results.summary = `Found ${processingErrors.length} cell processing errors in the last ${timeWindowHours} hours`;

          // Analyze operator patterns
          const operatorErrors: Record<string, number> = {};
          processingErrors.forEach(error => {
            if (error.operatorName) {
              operatorErrors[error.operatorName] = (operatorErrors[error.operatorName] || 0) + 1;
            }
          });

          if (Object.keys(operatorErrors).length > 0) {
            const topFailingOperator = Object.entries(operatorErrors).sort((a, b) => b[1] - a[1])[0];
            results.insights.push(`Operator "${topFailingOperator[0]}" has ${topFailingOperator[1]} failures`);
            results.recommendations.push(`Review "${topFailingOperator[0]}" operator implementation and prompts`);
          }

          break;
        }

        case "api_failures": {
          // Query Gemini API failures
          const whereClause = sheetId
            ? and(eq(geminiUsageLog.status, 'error'), gte(geminiUsageLog.createdAt, timeThreshold))
            : and(eq(geminiUsageLog.status, 'error'), gte(geminiUsageLog.createdAt, timeThreshold));

          const apiFailures = await db
            .select()
            .from(geminiUsageLog)
            .where(whereClause)
            .orderBy(desc(geminiUsageLog.createdAt))
            .limit(limit);

          results.data = apiFailures.map(log => ({
            id: log.id,
            status: log.status,
            error: log.errorMessage || "No error message",
            timestamp: log.createdAt?.toISOString(),
            details: {
              operator: log.operatorName,
              model: log.model,
              tokens: log.totalTokens,
              cost: log.estimatedCost,
              duration: log.durationMs,
            },
          }));

          results.summary = `Found ${apiFailures.length} API failures in the last ${timeWindowHours} hours`;

          // Analyze model/operator patterns
          const modelErrors: Record<string, number> = {};
          apiFailures.forEach(log => {
            if (log.model) {
              modelErrors[log.model] = (modelErrors[log.model] || 0) + 1;
            }
          });

          if (Object.keys(modelErrors).length > 0) {
            const topFailingModel = Object.entries(modelErrors).sort((a, b) => b[1] - a[1])[0];
            results.insights.push(`Model "${topFailingModel[0]}" has ${topFailingModel[1]} API failures`);
          }

          break;
        }

        case "sheet_health": {
          // Get comprehensive health overview for a specific sheet
          if (!sheetId) {
            results.error = "Sheet ID required for sheet health monitoring";
            results.success = false;
            break;
          }

          // Count events by status
          const eventStats = await db
            .select({
              status: eventQueue.status,
              count: sql<number>`count(*)::integer`,
            })
            .from(eventQueue)
            .where(and(eq(eventQueue.sheetId, sheetId), gte(eventQueue.createdAt, timeThreshold)))
            .groupBy(eventQueue.status);

          // Count processing statuses
          const processStats = await db
            .select({
              status: cellProcessingStatus.status,
              count: sql<number>`count(*)::integer`,
            })
            .from(cellProcessingStatus)
            .where(and(eq(cellProcessingStatus.sheetId, sheetId), gte(cellProcessingStatus.updatedAt, timeThreshold)))
            .groupBy(cellProcessingStatus.status);

          const healthData = {
            eventStats: eventStats.reduce((acc, stat) => {
              acc[stat.status || 'unknown'] = stat.count;
              return acc;
            }, {} as Record<string, number>),
            processStats: processStats.reduce((acc, stat) => {
              acc[stat.status || 'unknown'] = stat.count;
              return acc;
            }, {} as Record<string, number>),
          };

          results.data = [{
            sheetId,
            timestamp: new Date().toISOString(),
            details: healthData,
          }];

          const totalEvents = Object.values(healthData.eventStats).reduce((sum, count) => sum + count, 0);
          const failedEvents = healthData.eventStats.failed || 0;
          const errorRate = totalEvents > 0 ? (failedEvents / totalEvents * 100).toFixed(2) : 0;

          results.summary = `Sheet health: ${totalEvents} events, ${errorRate}% error rate`;

          if (parseFloat(errorRate.toString()) > 10) {
            results.insights.push(`High error rate: ${errorRate}% of events are failing`);
            results.recommendations.push("Investigate failing operations and improve error handling");
          }

          if (healthData.processStats.error > 0) {
            results.recommendations.push("Address cell processing errors to improve user experience");
          }

          break;
        }

        case "recent_activity": {
          // Get recent activity across all monitored systems
          const recentEvents = await db
            .select()
            .from(eventQueue)
            .where(gte(eventQueue.createdAt, timeThreshold))
            .orderBy(desc(eventQueue.createdAt))
            .limit(limit);

          results.data = recentEvents.map(event => ({
            id: event.id,
            sheetId: event.sheetId,
            eventType: event.eventType,
            status: event.status,
            timestamp: event.createdAt?.toISOString(),
            retryCount: event.retryCount,
            error: event.lastError,
          }));

          const statusCounts = recentEvents.reduce((acc, event) => {
            acc[event.status || 'unknown'] = (acc[event.status || 'unknown'] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          results.summary = `Recent activity: ${recentEvents.length} events (${statusCounts.completed || 0} completed, ${statusCounts.failed || 0} failed, ${statusCounts.pending || 0} pending)`;

          if (statusCounts.pending > statusCounts.completed) {
            results.insights.push("High number of pending events - processing may be slow");
            results.recommendations.push("Check event processing pipeline performance");
          }

          break;
        }
      }

      console.log(`[Event Monitor] ${monitorType} completed: ${results.summary}`);
      return results;

    } catch (error) {
      console.error(`[Event Monitor] Error during ${monitorType}:`, error);
      return {
        ...results,
        success: false,
        summary: `Error monitoring ${monitorType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        insights: ["Monitoring system encountered an error"],
        recommendations: ["Check event monitor tool implementation and database connectivity"],
      };
    }
  },
});