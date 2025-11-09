import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getSupervisorAgent } from "@/mastra";

/**
 * Supervisor Agent Router
 *
 * API endpoints for the system monitoring and recovery agent.
 *
 * The supervisor agent continuously monitors table operations,
 * analyzes failures, and implements recovery strategies to ensure
 * maximum user satisfaction through factual accuracy and reliability.
 */
export const supervisorRouter = createTRPCRouter({
  /**
   * Perform system health monitoring
   */
  monitorSystem: protectedProcedure
    .input(
      z.object({
        sheetId: z.string().uuid().optional(),
        monitorType: z.enum([
          "health_check",
          "failure_analysis",
          "performance_review",
          "proactive_optimization"
        ]).default("health_check"),
        priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const agent = getSupervisorAgent();

        if (!agent) {
          throw new Error("Supervisor agent not available");
        }

        console.log("[Supervisor] Starting monitoring:", input.monitorType);

        // Build context message
        const contextMessage = `System Monitoring Request
Monitor Type: ${input.monitorType}
Priority: ${input.priority}
${input.sheetId ? `Target Sheet: ${input.sheetId}` : 'System-wide monitoring'}
User ID: ${ctx.session.user.id}

Please perform ${input.monitorType} and provide detailed analysis with actionable recommendations.

Instructions based on monitor type:

${input.monitorType === 'health_check' ? `
HEALTH CHECK PROTOCOL:
1. Check recent failed events (last 1 hour)
2. Monitor cell processing errors
3. Review API failure rates
4. Assess overall system performance
5. Identify immediate issues requiring attention
6. Provide health score and priority actions
` : ''}

${input.monitorType === 'failure_analysis' ? `
FAILURE ANALYSIS PROTOCOL:
1. Deep dive into recent failures (last 24 hours)
2. Identify failure patterns and root causes
3. Analyze operator performance and error rates
4. Review prompt effectiveness
5. Recommend specific improvements
6. Prioritize fixes by impact and effort
` : ''}

${input.monitorType === 'performance_review' ? `
PERFORMANCE REVIEW PROTOCOL:
1. Analyze success rates by operator and sheet type
2. Review response times and user satisfaction metrics
3. Compare current performance to historical baselines
4. Identify optimization opportunities
5. Track improvement trends over time
6. Generate performance scorecard with insights
` : ''}

${input.monitorType === 'proactive_optimization' ? `
PROACTIVE OPTIMIZATION PROTOCOL:
1. Look for optimization opportunities before problems occur
2. Analyze successful patterns to enhance prompts
3. Identify underperforming operators for improvement
4. Review system configurations for efficiency gains
5. Recommend preventive measures for common failure modes
6. Focus on user satisfaction and factual accuracy improvements
` : ''}

Focus Areas:
- Factual accuracy and source validation
- User satisfaction and experience quality
- System reliability and error reduction
- Continuous learning and improvement opportunities`;

        // Generate thread ID for tracking
        const threadId = `supervisor-${input.monitorType}-${Date.now()}`;
        const resourceId = input.sheetId || 'system-wide';

        // Call the supervisor agent
        const response = await agent.generate(contextMessage, {
          threadId,
          resourceId,
        });

        console.log("[Supervisor] Monitoring complete:", response.text.slice(0, 200) + "...");

        return {
          success: true,
          monitorType: input.monitorType,
          analysis: response.text,
          threadId,
          timestamp: new Date().toISOString(),
        };

      } catch (error) {
        console.error("[Supervisor] Monitoring error:", error);
        throw new Error(
          `Supervisor monitoring failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Request immediate recovery action for a specific failure
   */
  recoverFailure: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid().optional(),
        sheetId: z.string().uuid(),
        rowIndex: z.number().optional(),
        colIndex: z.number().optional(),
        errorDescription: z.string(),
        recoveryStrategy: z.enum([
          "auto_retry",
          "prompt_improvement",
          "operator_switch",
          "manual_intervention"
        ]).default("auto_retry"),
        urgency: z.enum(["low", "normal", "high", "critical"]).default("normal"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const agent = getSupervisorAgent();

        if (!agent) {
          throw new Error("Supervisor agent not available");
        }

        console.log("[Supervisor] Starting recovery:", input.recoveryStrategy);

        // Build recovery context
        const recoveryContext = `Failure Recovery Request
Recovery Strategy: ${input.recoveryStrategy}
Urgency: ${input.urgency}
Sheet ID: ${input.sheetId}
${input.eventId ? `Failed Event: ${input.eventId}` : ''}
${input.rowIndex !== undefined && input.colIndex !== undefined ? `Cell Position: (${input.rowIndex}, ${input.colIndex})` : ''}
User ID: ${ctx.session.user.id}
Error Description: ${input.errorDescription}

IMMEDIATE RECOVERY REQUIRED!

Please analyze this failure and implement the requested recovery strategy:

${input.recoveryStrategy === 'auto_retry' ? `
AUTO RETRY PROTOCOL:
1. Analyze the failure using failureRecoveryTool
2. Determine if retry is likely to succeed
3. Enhance the prompt or parameters based on error analysis
4. Create improved retry event with better context
5. Monitor the retry attempt for success
6. Report outcome and lessons learned
` : ''}

${input.recoveryStrategy === 'prompt_improvement' ? `
PROMPT IMPROVEMENT PROTOCOL:
1. Analyze current prompt and failure pattern
2. Identify specific prompt deficiencies
3. Design enhanced prompt with better instructions
4. Apply improved prompt to column configuration
5. Test with sample data if possible
6. Create retry event with enhanced prompt
` : ''}

${input.recoveryStrategy === 'operator_switch' ? `
OPERATOR SWITCH PROTOCOL:
1. Analyze why current operator failed
2. Identify best alternative operator for this use case
3. Switch column configuration to new operator
4. Create retry event with new operator
5. Monitor performance improvement
6. Document switch reasoning for future reference
` : ''}

${input.recoveryStrategy === 'manual_intervention' ? `
MANUAL INTERVENTION PROTOCOL:
1. Document detailed failure analysis
2. Provide specific guidance for manual resolution
3. Suggest configuration changes needed
4. Create high-priority event for human review
5. Recommend system improvements to prevent recurrence
6. Track manual intervention for learning purposes
` : ''}

Critical Success Factors:
- Ensure factual accuracy in any recovery attempt
- Validate all URLs and sources if applicable
- Prioritize user satisfaction and result quality
- Learn from this failure to prevent similar issues
- Document all actions for system improvement

Take immediate action to resolve this failure!`;

        // Generate thread ID for tracking
        const threadId = `recovery-${input.recoveryStrategy}-${Date.now()}`;
        const resourceId = input.sheetId;

        // Call the supervisor agent
        const response = await agent.generate(recoveryContext, {
          threadId,
          resourceId,
        });

        console.log("[Supervisor] Recovery complete:", response.text.slice(0, 200) + "...");

        return {
          success: true,
          recoveryStrategy: input.recoveryStrategy,
          analysis: response.text,
          threadId,
          timestamp: new Date().toISOString(),
        };

      } catch (error) {
        console.error("[Supervisor] Recovery error:", error);
        throw new Error(
          `Supervisor recovery failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get supervisor monitoring history and insights
   */
  getMonitoringHistory: protectedProcedure
    .input(
      z.object({
        sheetId: z.string().uuid().optional(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const agent = getSupervisorAgent();

        if (!agent) {
          return {
            success: false,
            error: "Supervisor agent not available",
            history: [],
          };
        }

        // Request monitoring summary from agent
        const summaryRequest = `Monitoring History Summary
${input.sheetId ? `Sheet ID: ${input.sheetId}` : 'System-wide'}
User ID: ${ctx.session.user.id}

Please provide a summary of recent monitoring activities and key insights:

1. Recent monitoring sessions and their outcomes
2. Key failure patterns discovered
3. Recovery actions taken and their success rates
4. System health trends over time
5. Major improvements implemented
6. Current focus areas and recommendations

Focus on actionable insights that demonstrate system learning and improvement over time.`;

        const threadId = `history-${Date.now()}`;
        const resourceId = input.sheetId || 'system-wide';

        const response = await agent.generate(summaryRequest, {
          threadId,
          resourceId,
        });

        return {
          success: true,
          summary: response.text,
          timestamp: new Date().toISOString(),
          // Note: In a production system, you'd query actual monitoring logs
          // from a dedicated monitoring table or log storage system
        };

      } catch (error) {
        console.error("[Supervisor] History query error:", error);
        return {
          success: false,
          error: `Failed to get monitoring history: ${error instanceof Error ? error.message : "Unknown error"}`,
          summary: "",
        };
      }
    }),

  /**
   * Trigger proactive system optimization
   */
  optimizeSystem: protectedProcedure
    .input(
      z.object({
        sheetId: z.string().uuid().optional(),
        optimizationType: z.enum([
          "performance",
          "accuracy",
          "reliability",
          "user_experience",
          "comprehensive"
        ]).default("comprehensive"),
        aggressiveness: z.enum(["conservative", "moderate", "aggressive"]).default("moderate"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const agent = getSupervisorAgent();

        if (!agent) {
          throw new Error("Supervisor agent not available");
        }

        console.log("[Supervisor] Starting optimization:", input.optimizationType);

        const optimizationRequest = `Proactive System Optimization Request
Optimization Type: ${input.optimizationType}
Aggressiveness Level: ${input.aggressiveness}
${input.sheetId ? `Target Sheet: ${input.sheetId}` : 'System-wide optimization'}
User ID: ${ctx.session.user.id}

Please perform proactive optimization to improve system performance BEFORE problems occur:

${input.optimizationType === 'performance' ? `
PERFORMANCE OPTIMIZATION:
- Analyze response times and throughput
- Identify bottlenecks and slow operations
- Optimize operator configurations
- Improve prompt efficiency
- Enhance caching and data access patterns
` : ''}

${input.optimizationType === 'accuracy' ? `
ACCURACY OPTIMIZATION:
- Review factual correctness of outputs
- Enhance source validation and URL checking
- Improve prompt specificity for better results
- Optimize operator selection for accuracy
- Implement better validation and quality checks
` : ''}

${input.optimizationType === 'reliability' ? `
RELIABILITY OPTIMIZATION:
- Identify potential failure modes
- Strengthen error handling and recovery
- Improve retry mechanisms and backoff strategies
- Enhance monitoring and early warning systems
- Optimize for consistent successful outcomes
` : ''}

${input.optimizationType === 'user_experience' ? `
USER EXPERIENCE OPTIMIZATION:
- Analyze user interaction patterns
- Improve response quality and relevance
- Enhance error messages and feedback
- Optimize for user satisfaction metrics
- Reduce friction and increase success rates
` : ''}

${input.optimizationType === 'comprehensive' ? `
COMPREHENSIVE OPTIMIZATION:
- Holistic analysis across all system dimensions
- Balance performance, accuracy, reliability, and UX
- Identify highest-impact improvements
- Coordinate cross-system optimizations
- Focus on maximum user happiness and satisfaction
` : ''}

Aggressiveness Guidelines:
- Conservative: Safe, incremental improvements with minimal risk
- Moderate: Balanced approach with measured improvements
- Aggressive: Bold optimizations with higher potential impact

Focus on measurable improvements that enhance user satisfaction through better accuracy, reliability, and performance.`;

        const threadId = `optimize-${input.optimizationType}-${Date.now()}`;
        const resourceId = input.sheetId || 'system-wide';

        const response = await agent.generate(optimizationRequest, {
          threadId,
          resourceId,
        });

        console.log("[Supervisor] Optimization complete");

        return {
          success: true,
          optimizationType: input.optimizationType,
          analysis: response.text,
          threadId,
          timestamp: new Date().toISOString(),
        };

      } catch (error) {
        console.error("[Supervisor] Optimization error:", error);
        throw new Error(
          `System optimization failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});