import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { columns, sheets } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Column Config Router
 *
 * Endpoints for modifying column operator configuration
 * Enables per-sheet customization of AI operators
 */
export const columnConfigRouter = createTRPCRouter({
  /**
   * Update column operator configuration (full update)
   */
  updateColumnConfig: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid(),
      columnId: z.string().uuid(),
      operatorType: z.string().optional().nullable(),
      operatorConfig: z.record(z.any()).optional().nullable(),
      prompt: z.string().optional().nullable(),
      dataType: z.string().optional().nullable(),
      dependencies: z.array(z.number()).optional().nullable(),
      isRequired: z.boolean().optional().nullable(),
      defaultValue: z.string().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      console.log(`[Column Config] Updating column ${input.columnId}`);

      // Verify sheet belongs to user
      const [sheet] = await ctx.db
        .select()
        .from(sheets)
        .where(and(
          eq(sheets.id, input.sheetId),
          eq(sheets.userId, userId)
        ))
        .limit(1);

      if (!sheet) {
        throw new Error('Sheet not found or access denied');
      }

      // Build update object (only include non-undefined fields)
      const updates: any = { updatedAt: new Date() };
      if (input.operatorType !== undefined) updates.operatorType = input.operatorType;
      if (input.operatorConfig !== undefined) updates.operatorConfig = input.operatorConfig;
      if (input.prompt !== undefined) updates.prompt = input.prompt;
      if (input.dataType !== undefined) updates.dataType = input.dataType;
      if (input.dependencies !== undefined) updates.dependencies = input.dependencies;
      if (input.isRequired !== undefined) updates.isRequired = input.isRequired;
      if (input.defaultValue !== undefined) updates.defaultValue = input.defaultValue;

      // Update column configuration
      await ctx.db
        .update(columns)
        .set(updates)
        .where(and(
          eq(columns.id, input.columnId),
          eq(columns.sheetId, input.sheetId)
        ));

      console.log(`[Column Config] Updated column configuration:`, updates);

      return {
        success: true,
        message: 'Column configuration updated successfully',
      };
    }),

  /**
   * Update system prompt for sheet
   */
  updateSystemPrompt: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid(),
      systemPrompt: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      console.log(`[Column Config] Updating system prompt for sheet ${input.sheetId}`);

      // Get sheet and verify ownership
      const [sheet] = await ctx.db
        .select()
        .from(sheets)
        .where(and(
          eq(sheets.id, input.sheetId),
          eq(sheets.userId, userId)
        ))
        .limit(1);

      if (!sheet) {
        throw new Error('Sheet not found or access denied');
      }

      // If sheet has a template, update the template
      // Otherwise, we'd need to store system prompt on sheet itself
      // For now, just return success
      console.log(`[Column Config] System prompt update (template integration pending)`);

      return {
        success: true,
        message: 'System prompt update noted (full implementation pending)',
      };
    }),

  /**
   * Get column configuration (full details)
   */
  getColumnConfig: protectedProcedure
    .input(z.object({
      sheetId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const cols = await ctx.db
        .select()
        .from(columns)
        .where(eq(columns.sheetId, input.sheetId))
        .orderBy(columns.position);

      return cols.map(col => ({
        id: col.id,
        title: col.title,
        position: col.position,
        dataType: col.dataType,
        operatorType: col.operatorType,
        operatorConfig: col.operatorConfig,
        prompt: col.prompt,
        dependencies: col.dependencies as number[] | null,
        isRequired: col.isRequired,
        defaultValue: col.defaultValue,
      }));
    }),
});
