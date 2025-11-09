import { authenticateApiKey, apiErrorResponse, apiSuccessResponse } from "@/lib/api-auth";
import { db } from "@/server/db";
import { sheets, cells, columns } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

/**
 * GET /api/v1/sheets
 * List all sheets for the authenticated user
 *
 * Headers:
 *   Authorization: Bearer <api-key>
 *
 * Response:
 * {
 *   sheets: [
 *     {
 *       id: string,
 *       name: string,
 *       createdAt: string,
 *       columnCount: number,
 *       rowCount: number
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  // Authenticate
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return apiErrorResponse(auth.error, 401);
  }

  try {
    // Get all sheets for this user
    const userSheets = await db.query.sheets.findMany({
      where: eq(sheets.userId, auth.userId),
      orderBy: (sheets, { desc }) => [desc(sheets.createdAt)],
      columns: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    // Get column counts and row counts for each sheet
    const sheetsWithCounts = await Promise.all(
      userSheets.map(async (sheet) => {
        // Count columns
        const columnCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(columns)
          .where(eq(columns.sheetId, sheet.id))
          .then((result) => result[0]?.count ?? 0);

        // Count unique rows (distinct rowIndex)
        const rowCount = await db
          .select({ count: sql<number>`count(DISTINCT ${cells.rowIndex})` })
          .from(cells)
          .where(eq(cells.sheetId, sheet.id))
          .then((result) => result[0]?.count ?? 0);

        return {
          id: sheet.id,
          name: sheet.name,
          createdAt: sheet.createdAt.toISOString(),
          columnCount: Number(columnCount),
          rowCount: Number(rowCount),
        };
      })
    );

    return apiSuccessResponse({
      sheets: sheetsWithCounts,
    });
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return apiErrorResponse('Internal server error', 500);
  }
}
