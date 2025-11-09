import { authenticateApiKey, apiErrorResponse, apiSuccessResponse } from "@/lib/api-auth";
import { db } from "@/server/db";
import { sheets, cells, eventQueue, columns } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextRequest } from "next/server";

/**
 * POST /api/v1/sheets/{sheetId}/rows
 * Add bulk rows to a sheet
 *
 * Headers:
 *   Authorization: Bearer <api-key>
 *   Content-Type: application/json
 *
 * Body:
 * {
 *   rows: [
 *     { "0": "value1", "1": "value2", "2": "value3" },  // Row as object with column indices
 *     { "0": "value1", "1": "value2" },                  // Can have fewer columns
 *   ]
 * }
 *
 * Alternative body format (array of arrays):
 * {
 *   rows: [
 *     ["value1", "value2", "value3"],  // Row as array
 *     ["value1", "value2"]
 *   ]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   rowsAdded: 2,
 *   startingRow: 10,
 *   message: "Added 2 rows starting at row 10. AI operators will process the cells automatically."
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sheetId: string }> }
) {
  // Authenticate
  const auth = await authenticateApiKey(request);
  if (auth.error) {
    return apiErrorResponse(auth.error, 401);
  }

  const { sheetId } = await params;

  // Validate sheetId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sheetId)) {
    return apiErrorResponse('Invalid sheet ID format', 400);
  }

  try {
    // Check if sheet exists and belongs to this user
    const sheet = await db.query.sheets.findFirst({
      where: and(
        eq(sheets.id, sheetId),
        eq(sheets.userId, auth.userId)
      ),
    });

    if (!sheet) {
      return apiErrorResponse('Sheet not found or unauthorized', 404);
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return apiErrorResponse('Invalid JSON body', 400);
    }

    if (!body.rows || !Array.isArray(body.rows)) {
      return apiErrorResponse('Missing or invalid "rows" field. Expected array of rows.', 400);
    }

    if (body.rows.length === 0) {
      return apiErrorResponse('Rows array is empty', 400);
    }

    // Find the next available row index
    const maxRowResult = await db
      .select({ maxRow: sql<number>`COALESCE(MAX(${cells.rowIndex}), -1)` })
      .from(cells)
      .where(eq(cells.sheetId, sheetId));

    const startingRowIndex = (maxRowResult[0]?.maxRow ?? -1) + 1;

    // Prepare cell inserts
    const cellInserts: Array<{
      sheetId: string;
      userId: string;
      rowIndex: number;
      colIndex: number;
      content: string;
    }> = [];

    const eventInserts: Array<{
      sheetId: string;
      userId: string;
      eventType: string;
      payload: any;
      status: string;
    }> = [];

    body.rows.forEach((row: any, rowIdx: number) => {
      const currentRowIndex = startingRowIndex + rowIdx;

      // Handle both object format { "0": "val", "1": "val" } and array format ["val", "val"]
      let rowData: Record<number, string>;

      if (Array.isArray(row)) {
        // Convert array to object with indices
        rowData = Object.fromEntries(
          row.map((value, idx) => [idx, String(value)])
        );
      } else if (typeof row === 'object' && row !== null) {
        // Already an object, convert keys to numbers
        rowData = Object.fromEntries(
          Object.entries(row).map(([key, value]) => [parseInt(key, 10), String(value)])
        );
      } else {
        throw new Error(`Invalid row format at index ${rowIdx}. Expected object or array.`);
      }

      // Create cell for each column in this row
      Object.entries(rowData).forEach(([colIndexStr, content]) => {
        const colIndex = parseInt(colIndexStr, 10);

        if (isNaN(colIndex) || colIndex < 0) {
          throw new Error(`Invalid column index "${colIndexStr}" in row ${rowIdx}`);
        }

        const trimmedContent = String(content).trim();
        if (!trimmedContent) {
          return; // Skip empty cells
        }

        cellInserts.push({
          sheetId,
          userId: auth.userId,
          rowIndex: currentRowIndex,
          colIndex,
          content: trimmedContent,
        });

        // Create event for AI processing (matches cellRouter.updateCell pattern)
        eventInserts.push({
          sheetId,
          userId: auth.userId,
          eventType: 'user_cell_edit',
          payload: {
            spreadsheetId: sheetId,
            rowIndex: currentRowIndex,
            columnId: '',
            colIndex,
            content: trimmedContent,
          },
          status: 'pending',
        });
      });
    });

    if (cellInserts.length === 0) {
      return apiErrorResponse('No valid cells to insert (all cells were empty)', 400);
    }

    // Bulk insert cells (with conflict handling like cellRouter)
    await db
      .insert(cells)
      .values(cellInserts)
      .onConflictDoUpdate({
        target: [cells.sheetId, cells.userId, cells.rowIndex, cells.colIndex],
        set: {
          content: sql`excluded.content`,
          updatedAt: new Date(),
        },
      });

    // Bulk insert events for processing
    if (eventInserts.length > 0) {
      await db.insert(eventQueue).values(eventInserts);
    }

    return apiSuccessResponse({
      success: true,
      rowsAdded: body.rows.length,
      cellsCreated: cellInserts.length,
      startingRow: startingRowIndex,
      message: `Added ${body.rows.length} rows starting at row ${startingRowIndex}. AI operators will process the cells automatically.`,
    });

  } catch (error: any) {
    console.error('Error adding rows:', error);
    return apiErrorResponse(
      error.message || 'Internal server error',
      500
    );
  }
}
