import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { templates, templateColumns } from "@/server/db/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import {
  generateTemplateFromDescription,
  refineTemplate,
  suggestTemplateImprovements,
  type TemplateConfig,
} from "@/server/ai/template-generator";

// Input validation schemas
const createTemplateInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  icon: z.string().optional(),
  isPublic: z.boolean().default(false),
  isAutonomous: z.boolean().default(false),
  systemPrompt: z.string().optional(),
  config: z.record(z.any()).optional(),
  columns: z.array(
    z.object({
      title: z.string(),
      position: z.number().int(),
      operatorType: z.enum(["google_search", "url_context", "structured_output", "function_calling"]),
      operatorConfig: z.record(z.any()).optional(),
      prompt: z.string().optional(),
      dataType: z.string().default("text"),
      dependencies: z.array(z.number()).optional(),
      validationRules: z.record(z.any()).optional(),
      isRequired: z.boolean().default(false),
      defaultValue: z.string().optional(),
    })
  ),
});

const updateTemplateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  isPublic: z.boolean().optional(),
  isAutonomous: z.boolean().optional(),
  systemPrompt: z.string().optional(),
  config: z.record(z.any()).optional(),
});

const generateFromChatInput = z.object({
  description: z.string().min(10).max(2000),
});

const listPaginatedInput = z.object({
  limit: z.number().min(1).max(100).default(36),
  cursor: z.string().uuid().optional(),
});

const refineTemplateInput = z.object({
  templateId: z.string().uuid(),
  feedback: z.string().min(1).max(1000),
});

export const templateRouter = createTRPCRouter({
  /**
   * Create a new template with columns
   */
  create: protectedProcedure
    .input(createTemplateInput)
    .mutation(async ({ ctx, input }) => {
      const { columns: columnData, ...templateData } = input;

      // Insert template
      const [template] = await ctx.db
        .insert(templates)
        .values({
          ...templateData,
          userId: ctx.session.user.id,
        })
        .returning();

      if (!template) {
        throw new Error("Failed to create template");
      }

      // Insert columns
      if (columnData && columnData.length > 0) {
        await ctx.db.insert(templateColumns).values(
          columnData.map((col) => ({
            templateId: template.id,
            title: col.title,
            position: col.position,
            operatorType: col.operatorType,
            operatorConfig: col.operatorConfig ?? null,
            prompt: col.prompt ?? null,
            dataType: col.dataType,
            dependencies: col.dependencies ?? null,
            validationRules: col.validationRules ?? null,
            isRequired: col.isRequired,
            defaultValue: col.defaultValue ?? null,
          }))
        );
      }

      return template;
    }),

  /**
   * Get all templates for the current user with cursor-based pagination
   */
  list: protectedProcedure
    .input(listPaginatedInput.optional())
    .query(async ({ ctx, input }) => {
      const { limit = 36, cursor } = input ?? {};

      // Build where clause
      let whereClause;
      if (cursor) {
        // Get the cursor template's createdAt
        const cursorTemplate = await ctx.db.query.templates.findFirst({
          where: and(
            eq(templates.id, cursor),
            eq(templates.userId, ctx.session.user.id)
          ),
          columns: { createdAt: true },
        });

        if (cursorTemplate) {
          whereClause = and(
            eq(templates.userId, ctx.session.user.id),
            lt(templates.createdAt, cursorTemplate.createdAt)
          );
        } else {
          whereClause = eq(templates.userId, ctx.session.user.id);
        }
      } else {
        whereClause = eq(templates.userId, ctx.session.user.id);
      }

      // Fetch limit + 1 to determine if there are more
      const userTemplates = await ctx.db.query.templates.findMany({
        where: whereClause,
        with: {
          columns: {
            orderBy: (cols, { asc }) => [asc(cols.position)],
          },
        },
        orderBy: [desc(templates.createdAt)],
        limit: limit + 1,
      });

      const hasMore = userTemplates.length > limit;
      const items = hasMore ? userTemplates.slice(0, limit) : userTemplates;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]!.id : undefined,
      };
    }),

  /**
   * Get public templates (template marketplace) with cursor-based pagination
   */
  listPublic: protectedProcedure
    .input(listPaginatedInput.optional())
    .query(async ({ ctx, input }) => {
      const { limit = 36, cursor } = input ?? {};

      // Build where clause
      let whereClause;
      if (cursor) {
        // Get the cursor template's usageCount and createdAt
        const cursorTemplate = await ctx.db.query.templates.findFirst({
          where: and(
            eq(templates.id, cursor),
            eq(templates.isPublic, true)
          ),
          columns: { usageCount: true, createdAt: true },
        });

        if (cursorTemplate) {
          // For pagination with multiple sort columns, we need a more complex where clause
          // This is a simplified version - in production you might want composite cursor
          whereClause = and(
            eq(templates.isPublic, true),
            lt(templates.createdAt, cursorTemplate.createdAt)
          );
        } else {
          whereClause = eq(templates.isPublic, true);
        }
      } else {
        whereClause = eq(templates.isPublic, true);
      }

      const publicTemplates = await ctx.db.query.templates.findMany({
        where: whereClause,
        with: {
          columns: {
            orderBy: (cols, { asc }) => [asc(cols.position)],
          },
          user: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [desc(templates.usageCount), desc(templates.createdAt)],
        limit: limit + 1,
      });

      const hasMore = publicTemplates.length > limit;
      const items = hasMore ? publicTemplates.slice(0, limit) : publicTemplates;

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]!.id : undefined,
      };
    }),

  /**
   * Get a specific template by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.query.templates.findFirst({
        where: and(
          eq(templates.id, input.id),
          eq(templates.userId, ctx.session.user.id)
        ),
        with: {
          columns: {
            orderBy: (cols, { asc }) => [asc(cols.position)],
          },
        },
      });

      if (!template) {
        throw new Error("Template not found");
      }

      return template;
    }),

  /**
   * Update a template
   */
  update: protectedProcedure
    .input(updateTemplateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [updated] = await ctx.db
        .update(templates)
        .set(updateData)
        .where(
          and(eq(templates.id, id), eq(templates.userId, ctx.session.user.id))
        )
        .returning();

      if (!updated) {
        throw new Error("Template not found or unauthorized");
      }

      return updated;
    }),

  /**
   * Delete a template
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(templates)
        .where(
          and(
            eq(templates.id, input.id),
            eq(templates.userId, ctx.session.user.id)
          )
        )
        .returning();

      if (result.length === 0) {
        throw new Error("Template not found or unauthorized");
      }

      return { success: true };
    }),

  /**
   * Clone a template (for using public templates)
   */
  clone: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Find the original template
      const original = await ctx.db.query.templates.findFirst({
        where: eq(templates.id, input.id),
        with: {
          columns: {
            orderBy: (cols, { asc }) => [asc(cols.position)],
          },
        },
      });

      if (!original) {
        throw new Error("Template not found");
      }

      // Create a copy for the current user
      const [cloned] = await ctx.db
        .insert(templates)
        .values({
          userId: ctx.session.user.id,
          name: `${original.name} (Copy)`,
          description: original.description,
          icon: original.icon,
          isPublic: false, // Clones are private by default
          isAutonomous: original.isAutonomous,
          systemPrompt: original.systemPrompt,
          config: original.config,
        })
        .returning();

      if (!cloned) {
        throw new Error("Failed to clone template");
      }

      // Clone columns
      if (original.columns.length > 0) {
        await ctx.db.insert(templateColumns).values(
          original.columns.map((col) => ({
            templateId: cloned.id,
            title: col.title,
            position: col.position,
            operatorType: col.operatorType,
            operatorConfig: col.operatorConfig,
            prompt: col.prompt,
            dataType: col.dataType,
            dependencies: col.dependencies,
            validationRules: col.validationRules,
            isRequired: col.isRequired,
            defaultValue: col.defaultValue,
          }))
        );
      }

      // Increment usage count on original
      await ctx.db
        .update(templates)
        .set({
          usageCount: (original.usageCount ?? 0) + 1,
        })
        .where(eq(templates.id, original.id));

      return cloned;
    }),

  /**
   * Generate template from natural language description using AI
   */
  generateFromChat: protectedProcedure
    .input(generateFromChatInput)
    .mutation(async ({ ctx, input }) => {
      try {
        const config = await generateTemplateFromDescription(
          input.description,
          ctx.session.user.id
        );

        // Create the template in the database
        const { columns: columnData, ...templateData } = config;

        const [template] = await ctx.db
          .insert(templates)
          .values({
            ...templateData,
            userId: ctx.session.user.id,
          })
          .returning();

        if (!template) {
          throw new Error("Failed to create template");
        }

        // Insert columns
        if (columnData && columnData.length > 0) {
          await ctx.db.insert(templateColumns).values(
            columnData.map((col) => ({
              templateId: template.id,
              title: col.title,
              position: col.position,
              operatorType: col.operatorType,
              operatorConfig: (col.operatorConfig as Record<string, unknown>) ?? null,
              prompt: col.prompt ?? null,
              dataType: col.dataType,
              dependencies: (col.dependencies as number[]) ?? null,
              validationRules: null,
              isRequired: col.isRequired,
              defaultValue: null,
            }))
          );
        }

        return {
          template,
          config,
        };
      } catch (error) {
        console.error("Error generating template from chat:", error);
        throw new Error(
          `Failed to generate template: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Refine an existing template based on user feedback
   */
  refineFromFeedback: protectedProcedure
    .input(refineTemplateInput)
    .mutation(async ({ ctx, input }) => {
      // Get existing template
      const existing = await ctx.db.query.templates.findFirst({
        where: and(
          eq(templates.id, input.templateId),
          eq(templates.userId, ctx.session.user.id)
        ),
        with: {
          columns: {
            orderBy: (cols, { asc }) => [asc(cols.position)],
          },
        },
      });

      if (!existing) {
        throw new Error("Template not found");
      }

      // Build current config
      const currentConfig: TemplateConfig = {
        name: existing.name,
        description: existing.description ?? "",
        icon: existing.icon ?? undefined,
        isAutonomous: existing.isAutonomous ?? false,
        systemPrompt: existing.systemPrompt ?? undefined,
        columns: existing.columns.map((col) => ({
          title: col.title,
          position: col.position,
          operatorType: col.operatorType as "google_search" | "url_context" | "structured_output" | "function_calling",
          prompt: col.prompt ?? "",
          dataType: col.dataType as "text" | "url" | "email" | "number" | "json",
          dependencies: (col.dependencies as number[]) ?? undefined,
          isRequired: col.isRequired ?? false,
          operatorConfig: (col.operatorConfig as Record<string, any>) ?? undefined,
        })),
      };

      // Get refined config from AI
      const refinedConfig = await refineTemplate(currentConfig, input.feedback);

      // Update template
      const [updated] = await ctx.db
        .update(templates)
        .set({
          name: refinedConfig.name,
          description: refinedConfig.description,
          icon: refinedConfig.icon,
          isAutonomous: refinedConfig.isAutonomous,
          systemPrompt: refinedConfig.systemPrompt,
        })
        .where(eq(templates.id, input.templateId))
        .returning();

      // Delete old columns and insert new ones
      await ctx.db.delete(templateColumns).where(eq(templateColumns.templateId, input.templateId));

      await ctx.db.insert(templateColumns).values(
        refinedConfig.columns.map((col) => ({
          templateId: input.templateId,
          title: col.title,
          position: col.position,
          operatorType: col.operatorType,
          operatorConfig: (col.operatorConfig as Record<string, unknown>) ?? null,
          prompt: col.prompt ?? null,
          dataType: col.dataType,
          dependencies: (col.dependencies as number[]) ?? null,
          validationRules: null,
          isRequired: col.isRequired,
          defaultValue: null,
        }))
      );

      return {
        template: updated,
        config: refinedConfig,
      };
    }),

  /**
   * Get AI suggestions for improving a template
   */
  getSuggestions: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.query.templates.findFirst({
        where: and(
          eq(templates.id, input.id),
          eq(templates.userId, ctx.session.user.id)
        ),
        with: {
          columns: {
            orderBy: (cols, { asc }) => [asc(cols.position)],
          },
        },
      });

      if (!template) {
        throw new Error("Template not found");
      }

      const config: TemplateConfig = {
        name: template.name,
        description: template.description ?? "",
        icon: template.icon ?? undefined,
        isAutonomous: template.isAutonomous ?? false,
        systemPrompt: template.systemPrompt ?? undefined,
        columns: template.columns.map((col) => ({
          title: col.title,
          position: col.position,
          operatorType: col.operatorType as "google_search" | "url_context" | "structured_output" | "function_calling",
          prompt: col.prompt ?? "",
          dataType: col.dataType as "text" | "url" | "email" | "number" | "json",
          dependencies: (col.dependencies as number[]) ?? undefined,
          isRequired: col.isRequired ?? false,
          operatorConfig: (col.operatorConfig as Record<string, any>) ?? undefined,
        })),
      };

      const suggestions = await suggestTemplateImprovements(config);
      return suggestions;
    }),
});
