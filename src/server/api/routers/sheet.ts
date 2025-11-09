import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { sheets } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const newSheet = await ctx.db
        .insert(sheets)
        .values({
          userId,
          name: input.name,
        })
        .returning();

      return newSheet[0];
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

      if (!updated[0] || updated[0].userId !== userId) {
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

      if (!sheet[0] || sheet[0].userId !== userId) {
        throw new Error("Sheet not found or unauthorized");
      }

      await ctx.db.delete(sheets).where(eq(sheets.id, input.sheetId));

      return { success: true };
    }),
});
