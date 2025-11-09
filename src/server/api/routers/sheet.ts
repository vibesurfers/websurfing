import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { sheets, columns, templates, cells } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getTemplate, type TemplateType } from "@/server/templates/column-templates";

export const sheetRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const userSheets = await ctx.db
      .select()
      .from(sheets)
      .where(eq(sheets.userId, userId))
      .orderBy(sheets.createdAt);

    return userSheets;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        templateType: z.enum(['lucky', 'marketing', 'scientific']).optional(),
        templateId: z.string().uuid().optional(),
        columns: z.array(z.object({
          title: z.string().min(1).max(255),
          position: z.number().int().min(0),
          dataType: z.enum(['text', 'array', 'url', 'number']).default('text'),
          operatorType: z.string().optional().nullable(),
          operatorConfig: z.any().optional().nullable(),
          prompt: z.string().optional().nullable(),
          dependencies: z.array(z.number()).optional().nullable(),
          isRequired: z.boolean().optional().nullable(),
          defaultValue: z.string().optional().nullable(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      let columnsToCreate = input.columns;
      let isAutonomous = false;

      // Load columns from database template if templateId is provided
      if (input.templateId) {
        const dbTemplate = await ctx.db.query.templates.findFirst({
          where: eq(templates.id, input.templateId),
          with: {
            columns: {
              orderBy: (cols, { asc }) => [asc(cols.position)],
            },
          },
        });

        if (dbTemplate) {
          columnsToCreate = dbTemplate.columns.map((col) => ({
            title: col.title,
            position: col.position,
            dataType: col.dataType as 'text' | 'array' | 'url' | 'number',
            operatorType: col.operatorType,
            operatorConfig: col.operatorConfig,
            prompt: col.prompt,
            dependencies: col.dependencies,
            isRequired: col.isRequired,
            defaultValue: col.defaultValue,
          }));
          isAutonomous = dbTemplate.isAutonomous || false;
        }
      }
      // Fallback to old hardcoded templates
      else if (input.templateType && !input.columns) {
        const template = getTemplate(input.templateType as TemplateType);
        columnsToCreate = template.columns;
        isAutonomous = template.isAutonomous;
      }

      const newSheet = await ctx.db
        .insert(sheets)
        .values({
          userId,
          name: input.name,
          templateType: input.templateType ?? null,
          templateId: input.templateId ?? null,
          isAutonomous,
        })
        .returning();

      if (columnsToCreate && columnsToCreate.length > 0) {
        await ctx.db.insert(columns).values(
          columnsToCreate.map((col) => ({
            sheetId: newSheet[0]!.id,
            title: col.title,
            position: col.position,
            dataType: col.dataType,
            operatorType: col.operatorType || null,
            operatorConfig: col.operatorConfig || null,
            prompt: col.prompt || null,
            dependencies: col.dependencies || null,
            isRequired: col.isRequired || false,
            defaultValue: col.defaultValue || null,
          }))
        );
      }

      return newSheet[0];
    }),

  getColumns: protectedProcedure
    .input(z.object({ sheetId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const sheet = await ctx.db
        .select()
        .from(sheets)
        .where(eq(sheets.id, input.sheetId))
        .limit(1);

      if (!sheet[0]?.userId || sheet[0].userId !== userId) {
        throw new Error("Sheet not found or unauthorized");
      }

      const sheetColumns = await ctx.db
        .select()
        .from(columns)
        .where(eq(columns.sheetId, input.sheetId))
        .orderBy(columns.position);

      return sheetColumns;
    }),

  rename: protectedProcedure
    .input(
      z.object({
        sheetId: z.string().uuid(),
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const updated = await ctx.db
        .update(sheets)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(sheets.id, input.sheetId))
        .returning();

      if (!updated[0]?.userId || updated[0].userId !== userId) {
        throw new Error("Sheet not found or unauthorized");
      }

      return updated[0];
    }),

  delete: protectedProcedure
    .input(z.object({ sheetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const sheet = await ctx.db
        .select()
        .from(sheets)
        .where(eq(sheets.id, input.sheetId))
        .limit(1);

      if (!sheet[0]?.userId || sheet[0].userId !== userId) {
        throw new Error("Sheet not found or unauthorized");
      }

      await ctx.db.delete(sheets).where(eq(sheets.id, input.sheetId));

      return { success: true };
    }),

  addColumn: protectedProcedure
    .input(
      z.object({
        sheetId: z.string().uuid(),
        title: z.string().min(1).max(255),
        position: z.number().int().min(0),
        dataType: z.enum(['text', 'array', 'url', 'number']).default('text'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const sheet = await ctx.db
        .select()
        .from(sheets)
        .where(eq(sheets.id, input.sheetId))
        .limit(1);

      if (!sheet[0]?.userId || sheet[0].userId !== userId) {
        throw new Error("Sheet not found or unauthorized");
      }

      const newColumn = await ctx.db
        .insert(columns)
        .values({
          sheetId: input.sheetId,
          title: input.title,
          position: input.position,
          dataType: input.dataType,
        })
        .returning();

      return newColumn[0];
    }),

  createFromCsv: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        headers: z.array(z.string().min(1)),
        rows: z.array(z.array(z.string())),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate inputs
      if (input.headers.length === 0) {
        throw new Error("At least one header column is required");
      }

      if (input.rows.length === 0) {
        throw new Error("At least one data row is required");
      }

      // Create the sheet
      const newSheet = await ctx.db
        .insert(sheets)
        .values({
          userId,
          name: input.name,
          templateType: null,
          templateId: null,
          isAutonomous: false,
        })
        .returning();

      const sheetId = newSheet[0]!.id;

      // Create columns from headers
      const columnsToCreate = input.headers.map((header, index) => ({
        sheetId,
        title: header.trim() || `Column ${index + 1}`,
        position: index,
        dataType: 'text' as const,
      }));

      const createdColumns = await ctx.db
        .insert(columns)
        .values(columnsToCreate)
        .returning();

      // Populate cells with CSV data
      const cellsToCreate: Array<{
        sheetId: string;
        userId: string;
        rowIndex: number;
        colIndex: number;
        content: string;
      }> = [];

      input.rows.forEach((row, rowIndex) => {
        row.forEach((cellContent, colIndex) => {
          if (colIndex < input.headers.length && cellContent.trim()) {
            cellsToCreate.push({
              sheetId,
              userId,
              rowIndex,
              colIndex,
              content: cellContent.trim(),
            });
          }
        });
      });

      // Insert cells in batches to avoid overwhelming the database
      const batchSize = 500;
      for (let i = 0; i < cellsToCreate.length; i += batchSize) {
        const batch = cellsToCreate.slice(i, i + batchSize);
        if (batch.length > 0) {
          await ctx.db.insert(cells).values(batch);
        }
      }

      return {
        ...newSheet[0]!,
        rowsImported: input.rows.length,
        columnsCreated: createdColumns.length,
      };
    }),
});
