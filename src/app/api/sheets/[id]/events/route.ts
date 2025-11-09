import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { eventQueue, sheetUpdates } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/server/auth";

/**
 * SSE endpoint for real-time sheet updates
 * Client subscribes to this endpoint to receive live updates about:
 * - Cell processing status
 * - Event queue changes
 * - Errors and completions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sheetId = params.id;

  // Verify authentication
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create a ReadableStream for SSE
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      const data = JSON.stringify({
        type: "connected",
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      // Poll database for changes every 2 seconds
      intervalId = setInterval(async () => {
        try {
          // Get pending events
          const pendingEvents = await db.query.eventQueue.findMany({
            where: and(
              eq(eventQueue.sheetId, sheetId),
              eq(eventQueue.userId, session.user.id)
            ),
            orderBy: [desc(eventQueue.createdAt)],
            limit: 20,
          });

          // Get recent updates
          const recentUpdates = await db.query.sheetUpdates.findMany({
            where: and(
              eq(sheetUpdates.sheetId, sheetId),
              eq(sheetUpdates.userId, session.user.id)
            ),
            orderBy: [desc(sheetUpdates.createdAt)],
            limit: 10,
          });

          // Send update
          const updateData = JSON.stringify({
            type: "status_update",
            timestamp: new Date().toISOString(),
            data: {
              pendingEvents: pendingEvents.map((e) => ({
                id: e.id,
                eventType: e.eventType,
                status: e.status,
                retryCount: e.retryCount,
                lastError: e.lastError,
                createdAt: e.createdAt,
              })),
              recentUpdates: recentUpdates.map((u) => ({
                id: u.id,
                rowIndex: u.rowIndex,
                colIndex: u.colIndex,
                content: u.content,
                updateType: u.updateType,
                createdAt: u.createdAt,
                appliedAt: u.appliedAt,
              })),
            },
          });

          controller.enqueue(encoder.encode(`data: ${updateData}\n\n`));
        } catch (error) {
          console.error("Error in SSE polling:", error);
          // Send error event
          const errorData = JSON.stringify({
            type: "error",
            timestamp: new Date().toISOString(),
            message: error instanceof Error ? error.message : "Unknown error",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        }
      }, 2000);
    },
    cancel() {
      // Clean up interval when connection closes
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

// Export runtime config for streaming
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
