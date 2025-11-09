/**
 * Column-Aware Operator Wrapper
 *
 * Enhances operator results with context and writes to next column progressively
 */

import { db } from "@/server/db";
import { sheetUpdates, eventQueue, cells, cellProcessingStatus } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import type { SheetContext } from "./operator-controller";

export class ColumnAwareWrapper {
  /**
   * Update cell processing status
   */
  static async updateCellStatus(
    ctx: SheetContext,
    userId: string,
    colIndex: number,
    status: 'idle' | 'processing' | 'completed' | 'error',
    operatorName?: string,
    message?: string
  ): Promise<void> {
    await db.insert(cellProcessingStatus).values({
      sheetId: ctx.sheetId,
      userId,
      rowIndex: ctx.rowIndex,
      colIndex,
      status,
      operatorName: operatorName ?? null,
      statusMessage: message ?? null,
    }).onConflictDoNothing();

    // Update if exists
    await db.update(cellProcessingStatus)
      .set({
        status,
        operatorName: operatorName ?? null,
        statusMessage: message ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cellProcessingStatus.sheetId, ctx.sheetId),
          eq(cellProcessingStatus.rowIndex, ctx.rowIndex),
          eq(cellProcessingStatus.colIndex, colIndex)
        )
      );
  }
  /**
   * Build contextual prompt including template goal, columns, and row data
   */
  static buildContextualPrompt(ctx: SheetContext, targetColumn: string): string {
    const prompt: string[] = [];

    // Add template goal
    if (ctx.systemPrompt) {
      prompt.push('GOAL:');
      prompt.push(ctx.systemPrompt);
      prompt.push('');
    }

    // Add column structure
    prompt.push('COLUMN STRUCTURE:');
    ctx.columns.forEach((col, idx) => {
      const marker = idx === ctx.currentColumnIndex + 1 ? '→ ' : '  ';
      const value = ctx.rowData[idx] ? `(current: "${ctx.rowData[idx]}")` : '';
      prompt.push(`${marker}Column ${idx}: ${col.title} ${value}`);
    });
    prompt.push('');

    // Add task
    prompt.push(`TASK: Fill "${targetColumn}" based on the data in this row.`);
    prompt.push('');

    return prompt.join('\n');
  }

  /**
   * Write operator result to next column and create event for next-next column
   */
  static async writeToNextColumn(
    ctx: SheetContext,
    userId: string,
    eventId: string,
    output: any,
    operatorName: string
  ): Promise<void> {
    const nextColIndex = ctx.currentColumnIndex + 1;

    // Don't write past the last column
    if (nextColIndex >= ctx.columns.length) {
      console.log('[ColumnAwareWrapper] Row complete, no more columns to fill');
      return;
    }

    // Extract result content based on operator type
    let content = '';
    switch (operatorName) {
      case 'google_search':
        // Use first search result URL or title
        content = output.results?.[0]?.url || output.results?.[0]?.title || '';
        break;
      case 'url_context':
        // Use the summary or extracted text
        content = output.summary || output.extractedText || '';
        break;
      case 'structured_output':
        // Convert structured data to string (or extract specific field)
        if (output.structuredData && typeof output.structuredData === 'object') {
          // Try to extract a meaningful single value
          const data = output.structuredData;
          content = Object.values(data)[0] as string || JSON.stringify(data);
        } else {
          content = JSON.stringify(output.structuredData || output);
        }
        break;
      default:
        content = typeof output === 'string' ? output : JSON.stringify(output);
    }

    if (!content) {
      console.log('[ColumnAwareWrapper] No content to write');
      return;
    }

    // Write DIRECTLY to cells table for immediate visibility
    await db.insert(cells).values({
      sheetId: ctx.sheetId,
      userId,
      rowIndex: ctx.rowIndex,
      colIndex: nextColIndex,
      content: content.slice(0, 5000), // Limit length
    }).onConflictDoUpdate({
      target: [cells.sheetId, cells.userId, cells.rowIndex, cells.colIndex],
      set: {
        content: content.slice(0, 5000),
        updatedAt: new Date(),
      }
    });

    // ALSO write to sheetUpdates for audit trail
    await db.insert(sheetUpdates).values({
      sheetId: ctx.sheetId,
      userId,
      rowIndex: ctx.rowIndex,
      colIndex: nextColIndex,
      content: content.slice(0, 5000),
      updateType: 'ai_response',
      appliedAt: new Date(), // Mark as already applied
    });

    console.log(
      `[ColumnAwareWrapper] Wrote to column ${nextColIndex} (${ctx.columns[nextColIndex]?.title}): ${content.slice(0, 100)}`
    );

    // Create new event to fill the NEXT column (progressive filling)
    const nextNextColIndex = nextColIndex + 1;

    // Only create event if there's actually a next column to fill
    // Don't create event if we just filled the last column
    if (nextColIndex < ctx.columns.length - 1) {
      await db.insert(eventQueue).values({
        sheetId: ctx.sheetId,
        userId,
        eventType: 'robot_cell_update',
        payload: {
          spreadsheetId: ctx.sheetId,
          rowIndex: ctx.rowIndex,
          colIndex: nextColIndex,
          columnId: ctx.columns[nextColIndex]?.id,
          content,
        },
        status: 'pending',
      });

      console.log(
        `[ColumnAwareWrapper] Created event to fill column ${nextNextColIndex} (${ctx.columns[nextNextColIndex]?.title})`
      );
    } else {
      console.log('[ColumnAwareWrapper] Row complete - all columns filled!');
    }
  }
}
