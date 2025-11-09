import { authenticateApiKey, apiErrorResponse, apiSuccessResponse } from "@/lib/api-auth";
import { db } from "@/server/db";
import { sheets, cells, columns } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest } from "next/server";
import Papa from "papaparse";

/**
 * GET /api/v1/sheets/{sheetId}/data
 * Export sheet data as JSON or CSV
 *
 * Headers:
 *   Authorization: Bearer <api-key>
 *
 * Query Parameters:
 *   format: "json" | "csv" (default: "json")
 *
 * Response (JSON format):
 * {
 *   sheetId: string,
 *   sheetName: string,
 *   columns: [{ title: string, position: number }],
 *   rows: [
 *     ["cell1", "cell2", "cell3"],
 *     ["cell1", "cell2", "cell3"]
 *   ]
 * }
 *
 * Response (CSV format):
 * Raw CSV file download
 */
export async function GET(
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

  // Get format from query params
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';

  if (format !== 'json' && format !== 'csv') {
    return apiErrorResponse('Invalid format. Must be "json" or "csv"', 400);
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

    // Get columns ordered by position
    const sheetColumns = await db.query.columns.findMany({
      where: eq(columns.sheetId, sheetId),
      orderBy: (columns, { asc }) => [asc(columns.position)],
      columns: {
        title: true,
        position: true,
      },
    });

    // Get all cells for this sheet
    const sheetCells = await db.query.cells.findMany({
      where: eq(cells.sheetId, sheetId),
      orderBy: (cells, { asc }) => [asc(cells.rowIndex), asc(cells.colIndex)],
      columns: {
        rowIndex: true,
        colIndex: true,
        content: true,
      },
    });

    // Build row data structure
    const rowsMap = new Map<number, Map<number, string>>();

    sheetCells.forEach((cell) => {
      if (!rowsMap.has(cell.rowIndex)) {
        rowsMap.set(cell.rowIndex, new Map());
      }
      rowsMap.get(cell.rowIndex)!.set(cell.colIndex, cell.content || '');
    });

    // Convert to array of arrays
    const rowIndices = Array.from(rowsMap.keys()).sort((a, b) => a - b);
    const maxColIndex = sheetColumns.length > 0 ? sheetColumns.length - 1 : 0;

    const rows = rowIndices.map((rowIndex) => {
      const rowData = rowsMap.get(rowIndex)!;
      const rowArray: string[] = [];
      for (let colIdx = 0; colIdx <= maxColIndex; colIdx++) {
        rowArray.push(rowData.get(colIdx) || '');
      }
      return rowArray;
    });

    // Return based on format
    if (format === 'csv') {
      // Generate CSV
      const csvData = Papa.unparse({
        fields: sheetColumns.map((col) => col.title),
        data: rows,
      });

      // Return as downloadable CSV file
      return new Response(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${sheet.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`,
        },
      });
    }

    // Return JSON format
    return apiSuccessResponse({
      sheetId: sheet.id,
      sheetName: sheet.name,
      columns: sheetColumns,
      rows,
      rowCount: rows.length,
      columnCount: sheetColumns.length,
    });

  } catch (error: any) {
    console.error('Error exporting sheet data:', error);
    return apiErrorResponse(
      error.message || 'Internal server error',
      500
    );
  }
}
