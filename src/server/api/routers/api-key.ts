import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * Generate a secure random API key
 */
function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex'); // 64-character hex string
}

/**
 * Mask API key for display (show last 4 characters only)
 */
function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 4) return apiKey;
  return '•'.repeat(apiKey.length - 4) + apiKey.slice(-4);
}

export const apiKeyRouter = createTRPCRouter({
  /**
   * Get current user's API key (masked)
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: {
        apiKey: true,
        apiKeyCreatedAt: true,
      },
    });

    if (!user?.apiKey) {
      return {
        hasKey: false,
        apiKey: null,
        maskedKey: null,
        createdAt: null,
      };
    }

    return {
      hasKey: true,
      apiKey: user.apiKey,
      maskedKey: maskApiKey(user.apiKey),
      createdAt: user.apiKeyCreatedAt,
    };
  }),

  /**
   * Generate a new API key (first time)
   */
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    // Check if user already has an API key
    const existingUser = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
      columns: {
        apiKey: true,
      },
    });

    if (existingUser?.apiKey) {
      throw new Error('API key already exists. Use regenerate to create a new one.');
    }

    const newApiKey = generateApiKey();
    const now = new Date();

    await ctx.db
      .update(users)
      .set({
        apiKey: newApiKey,
        apiKeyCreatedAt: now,
      })
      .where(eq(users.id, ctx.session.user.id));

    return {
      success: true,
      apiKey: newApiKey,
      maskedKey: maskApiKey(newApiKey),
      createdAt: now,
    };
  }),

  /**
   * Regenerate API key (replaces existing key)
   */
  regenerate: protectedProcedure.mutation(async ({ ctx }) => {
    const newApiKey = generateApiKey();
    const now = new Date();

    await ctx.db
      .update(users)
      .set({
        apiKey: newApiKey,
        apiKeyCreatedAt: now,
      })
      .where(eq(users.id, ctx.session.user.id));

    return {
      success: true,
      apiKey: newApiKey,
      maskedKey: maskApiKey(newApiKey),
      createdAt: now,
      warning: 'Your old API key has been revoked. Update any applications using the old key.',
    };
  }),
});
