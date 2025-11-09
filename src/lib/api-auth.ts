import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Authenticate API requests using Bearer token (API key)
 *
 * Usage in API routes:
 * ```typescript
 * const auth = await authenticateApiKey(request);
 * if (auth.error) {
 *   return new Response(JSON.stringify({ error: auth.error }), {
 *     status: 401,
 *     headers: { 'Content-Type': 'application/json' }
 *   });
 * }
 * const userId = auth.userId;
 * ```
 */
export async function authenticateApiKey(
  request: Request
): Promise<{ userId: string; error?: undefined } | { userId: null; error: string }> {
  // Extract Authorization header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      userId: null,
      error: 'Missing Authorization header. Please provide: Authorization: Bearer <your-api-key>'
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      userId: null,
      error: 'Invalid Authorization header format. Expected: Bearer <your-api-key>'
    };
  }

  // Extract API key from "Bearer <key>"
  const apiKey = authHeader.slice(7).trim();

  if (!apiKey) {
    return {
      userId: null,
      error: 'API key is empty'
    };
  }

  // Look up user by API key
  const user = await db.query.users.findFirst({
    where: eq(users.apiKey, apiKey),
    columns: {
      id: true,
    },
  });

  if (!user) {
    return {
      userId: null,
      error: 'Invalid API key. Please check your API key in settings.'
    };
  }

  return { userId: user.id };
}

/**
 * Create a standard JSON error response
 */
export function apiErrorResponse(error: string, status = 400): Response {
  return new Response(
    JSON.stringify({ error }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create a standard JSON success response
 */
export function apiSuccessResponse<T>(data: T, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
