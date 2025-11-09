import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { sheets, columns } from "@/server/db/schema";
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
        columns: z.array(z.object({
          title: z.string().min(1).max(255),
          position: z.number().int().min(0),
          dataType: z.enum(['text', 'array', 'url', 'number']).default('text'),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      let columnsToCreate = input.columns;
      let isAutonomous = false;

      if (input.templateType && !input.columns) {
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
});
