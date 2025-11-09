/**
 * Column-Aware Operator Wrapper
 *
 * Enhances operator results with context and writes to next column progressively
 */

import { db } from "@/server/db";
import { sheetUpdates, eventQueue, cells, cellProcessingStatus } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { resolveRedirectUrl } from "@/server/utils/url-resolver";
import type { SheetContext } from "./operator-controller";
import { ResultValidator, ColumnDataType, type ValidatedColumn } from "./result-validator";
import { FormatConstraints } from "./format-constraints";

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
    // Use proper upsert to avoid race conditions
    await db.insert(cellProcessingStatus)
      .values({
        sheetId: ctx.sheetId,
        userId,
        rowIndex: ctx.rowIndex,
        colIndex,
        status,
        operatorName: operatorName ?? null,
        statusMessage: message ?? null,
      })
      .onConflictDoUpdate({
        target: [cellProcessingStatus.sheetId, cellProcessingStatus.rowIndex, cellProcessingStatus.colIndex],
        set: {
          status,
          operatorName: operatorName ?? null,
          statusMessage: message ?? null,
          updatedAt: new Date(),
        }
      });
  }
  /**
   * Build contextual prompt including template goal, columns, and row data
   */
  static buildContextualPrompt(ctx: SheetContext, targetColumn: string): string {
    return this.buildContextualPromptWithFormat(ctx, targetColumn, undefined);
  }

  /**
   * Build contextual prompt with format constraints for specific column
   */
  static buildContextualPromptWithFormat(
    ctx: SheetContext,
    targetColumn: string,
    operatorName?: string
  ): string {
    const prompt: string[] = [];

    // Add template goal
    if (ctx.systemPrompt) {
      prompt.push('GOAL:');
      prompt.push(ctx.systemPrompt);
      prompt.push('');
    }

    // Add scientific template specific guidance
    if (ctx.templateType === 'scientific') {
      prompt.push('SCIENTIFIC RESEARCH FOCUS:');
      prompt.push('- Prioritize highly cited, peer-reviewed papers');
      prompt.push('- Look for direct PDF access when possible');
      prompt.push('- Focus on recent publications (last 5 years) unless historical context is needed');
      prompt.push('- Target academic databases: arXiv, PubMed, Google Scholar, Semantic Scholar');
      prompt.push('- Extract precise academic metadata (authors, citations, publication details)');
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

    // Find the target column to get its data type and constraints
    const targetColIndex = ctx.currentColumnIndex + 1;
    const targetColumnInfo = ctx.columns[targetColIndex];

    // Add format constraints if we have column information
    if (targetColumnInfo && operatorName) {
      const validatedColumn: ValidatedColumn = {
        id: targetColumnInfo.id,
        title: targetColumnInfo.title,
        dataType: (targetColumnInfo.dataType as ColumnDataType) || ColumnDataType.LONG_TEXT,
        required: false,
        maxLength: targetColumnInfo.maxLength || undefined,
        minLength: targetColumnInfo.minLength || undefined,
        examples: targetColumnInfo.examples as string[] || undefined,
        description: targetColumnInfo.description || undefined
      };

      // Check operator compatibility
      const compatibility = FormatConstraints.validateOperatorSupport(operatorName, validatedColumn);
      if (compatibility.warnings.length > 0) {
        prompt.push('COMPATIBILITY NOTES:');
        compatibility.warnings.forEach(warning => prompt.push(`- ${warning}`));
        prompt.push('');
      }

      // Add format-specific instructions
      prompt.push('FORMAT REQUIREMENTS:');
      const formatInstructions = this.getFormatInstructions(validatedColumn);
      formatInstructions.forEach(instruction => prompt.push(`- ${instruction}`));
      prompt.push('');
    }

    // Add task with scientific context if applicable
    if (ctx.templateType === 'scientific') {
      prompt.push(`TASK: Fill "${targetColumn}" based on the data in this row.`);
      prompt.push('For academic content, ensure high quality and cite-ability.');
    } else {
      prompt.push(`TASK: Fill "${targetColumn}" based on the data in this row.`);
    }
    prompt.push('');

    return prompt.join('\n');
  }

  /**
   * Get format instructions for a column data type
   */
  private static getFormatInstructions(column: ValidatedColumn): string[] {
    const instructions: string[] = [];

    switch (column.dataType) {
      case ColumnDataType.SHORT_TEXT:
        instructions.push('Provide a concise answer under 100 characters');
        instructions.push('No explanations, just the direct answer');
        break;

      case ColumnDataType.URL:
        instructions.push('Provide only a valid URL starting with http:// or https://');
        instructions.push('Do not include any additional text');
        break;

      case ColumnDataType.EMAIL:
        instructions.push('Provide only a valid email address in format: name@domain.com');
        break;

      case ColumnDataType.NUMBER:
        instructions.push('Provide only a number (no units or text)');
        break;

      case ColumnDataType.CURRENCY:
        instructions.push('Provide currency amount with symbol (e.g., $100, €50)');
        break;

      case ColumnDataType.DATE:
        instructions.push('Provide date in standard format (YYYY-MM-DD or Month DD, YYYY)');
        break;

      case ColumnDataType.BOOLEAN:
        instructions.push('Answer only "Yes" or "No" - no explanations');
        break;

      case ColumnDataType.LIST:
        instructions.push('Provide comma-separated list: item1, item2, item3');
        break;

      case ColumnDataType.PERSON:
        instructions.push('Provide only the person\'s full name');
        break;

      case ColumnDataType.COMPANY:
        instructions.push('Provide only the company name');
        break;

      default:
        instructions.push(`Provide appropriate content for ${column.title}`);
    }

    // Add length constraints
    if (column.maxLength) {
      instructions.push(`Maximum ${column.maxLength} characters`);
    }
    if (column.minLength) {
      instructions.push(`Minimum ${column.minLength} characters`);
    }

    // Add examples
    if (column.examples && column.examples.length > 0) {
      instructions.push(`Examples: ${column.examples.join(', ')}`);
    }

    return instructions;
  }

  /**
   * Write operator result to next column and create event for next-next column
   *
   * @returns object containing validation info and retry suggestion
   */
  static async writeToNextColumn(
    ctx: SheetContext,
    userId: string,
    eventId: string,
    output: any,
    operatorName: string
  ): Promise<{ success: boolean; needsRetry: boolean; validationIssues?: string[]; retryPrompt?: string }> {
    const nextColIndex = ctx.currentColumnIndex + 1;

    // Don't write past the last column
    if (nextColIndex >= ctx.columns.length) {
      console.log('[ColumnAwareWrapper] Row complete, no more columns to fill');
      return { success: true, needsRetry: false };
    }

    // Extract result content based on operator type
    let content = '';
    switch (operatorName) {
      case 'google_search':
        // Use first search result URL or title
        let url = output.results?.[0]?.url || output.results?.[0]?.title || '';
        // Filter out redirect URLs - if we get one, skip to next result or use title
        if (url && url.includes('vertexaisearch.cloud.google.com/grounding-api-redirect')) {
          console.log('[ColumnAwareWrapper] Skipping redirect URL, trying next result...');
          // Try other results
          for (const result of output.results || []) {
            if (result.url && !result.url.includes('grounding-api-redirect')) {
              url = result.url;
              break;
            }
          }
          // If all are redirects, just use the title
          if (url.includes('grounding-api-redirect')) {
            url = output.results?.[0]?.title || '';
          }
        }
        content = url;
        break;
      case 'academic_search':
        // For academic search, prioritize PDF links or high-impact results
        const academicResults = output.academicResults || output.results || [];
        if (academicResults.length > 0) {
          // Prioritize PDF links for scientific templates
          const pdfResult = academicResults.find((r: any) => r.isPdfDirect || r.url?.includes('.pdf'));
          if (pdfResult) {
            content = pdfResult.url;
          } else {
            // Fall back to first high-impact result or any result
            const highImpactResult = academicResults.find((r: any) => r.isHighImpact);
            content = (highImpactResult?.url || academicResults[0]?.url || academicResults[0]?.title) || '';
          }
        }
        break;
      case 'similarity_expansion':
        // Use the generated similar concepts/keywords
        if (output.similarConcepts && Array.isArray(output.similarConcepts)) {
          content = output.similarConcepts.slice(0, 5).join(', '); // Top 5 concepts
        } else if (output.expandedTerms && Array.isArray(output.expandedTerms)) {
          content = output.expandedTerms.slice(0, 5).join(', ');
        } else {
          content = output.summary || JSON.stringify(output);
        }
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
          let value = Object.values(data)[0];

          // Clean the value
          if (typeof value === 'string') {
            content = value;
          } else if (value !== null && value !== undefined) {
            content = String(value);
          } else {
            content = JSON.stringify(data);
          }
        } else {
          content = JSON.stringify(output.structuredData || output);
        }
        break;
      default:
        content = typeof output === 'string' ? output : JSON.stringify(output);
    }

    if (!content) {
      console.log('[ColumnAwareWrapper] No content to write');
      return { success: false, needsRetry: true, validationIssues: ['No content generated'] };
    }

    // Get column information for validation
    const targetColumn = ctx.columns[nextColIndex];
    if (!targetColumn) {
      console.log('[ColumnAwareWrapper] Target column not found');
      return { success: false, needsRetry: false, validationIssues: ['Target column not found'] };
    }

    // Validate content before writing
    const validatedColumn: ValidatedColumn = {
      id: targetColumn.id,
      title: targetColumn.title,
      dataType: (targetColumn.dataType as ColumnDataType) || ColumnDataType.LONG_TEXT,
      required: false, // Default to optional for now
      maxLength: targetColumn.maxLength || undefined,
      minLength: targetColumn.minLength || undefined,
      examples: targetColumn.examples as string[] || undefined,
      description: targetColumn.description || undefined
    };

    const validation = ResultValidator.validate(content, validatedColumn);

    console.log(
      `[ColumnAwareWrapper] Validation result for "${targetColumn.title}": ${validation.valid ? 'VALID' : 'INVALID'} (confidence: ${Math.round(validation.confidence * 100)}%)`
    );

    if (validation.issues.length > 0) {
      console.log('[ColumnAwareWrapper] Validation issues:', validation.issues);
    }

    // Use sanitized content if available and valid
    const finalContent = validation.valid && validation.sanitized
      ? validation.sanitized
      : content;

    // Write validation results to a log for debugging
    if (!validation.valid || validation.confidence < 0.7) {
      console.warn(
        `[ColumnAwareWrapper] Low quality result for "${targetColumn.title}":`,
        {
          content: content.slice(0, 200),
          issues: validation.issues,
          suggestions: validation.suggestions
        }
      );
    }

    // Clean the content before saving
    // 1. Remove ALL surrounding quotes (handle multiple layers)
    while (content.startsWith('"') && content.endsWith('"') && content.length > 1) {
      content = content.slice(1, -1);
    }

    // 2. Filter redirect URLs - NEVER save these to the database
    if (content.includes('vertexaisearch.cloud.google.com/grounding-api-redirect')) {
      console.warn('[ColumnAwareWrapper] BLOCKED redirect URL - skipping cell write');
      console.warn('[ColumnAwareWrapper] Redirect URL:', content.substring(0, 100) + '...');

      // Mark cell as idle since we're not writing
      await ColumnAwareWrapper.updateCellStatus(
        ctx,
        userId,
        nextColIndex,
        'error',
        operatorName,
        'Redirect URL blocked'
      );

      return; // Don't write redirect URLs
    }

    // 3. Validate and normalize URL format if it looks like a URL
    if (content.startsWith('http://') || content.startsWith('https://')) {
      try {
        const urlObj = new URL(content);
        content = urlObj.toString(); // Normalize URL
      } catch (e) {
        console.warn('[ColumnAwareWrapper] Invalid URL format:', content);
      }
    }

    // 4. Trim whitespace
    content = content.trim();

    // 5. Filter out null/empty JSON values
    if (content === 'null' || content === '{}' || content === '[]' || content === 'undefined') {
      console.log('[ColumnAwareWrapper] Skipping null/empty JSON value');
      return; // Don't write empty values
    }

    // 6. Clean JSON objects with null values
    if (content.includes(':null') && content.startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        // If all values are null, skip
        if (Object.values(parsed).every(v => v === null)) {
          console.log('[ColumnAwareWrapper] Skipping object with all null values');
          return;
        }
      } catch (e) {
        // Not valid JSON, continue
      }
    }

    // Write DIRECTLY to cells table for immediate visibility
    await db.insert(cells).values({
      sheetId: ctx.sheetId,
      userId,
      rowIndex: ctx.rowIndex,
      colIndex: nextColIndex,
      content: finalContent.slice(0, 5000), // Limit length
    }).onConflictDoUpdate({
      target: [cells.sheetId, cells.userId, cells.rowIndex, cells.colIndex],
      set: {
        content: finalContent.slice(0, 5000),
        updatedAt: new Date(),
      }
    });

    // ALSO write to sheetUpdates for audit trail
    await db.insert(sheetUpdates).values({
      sheetId: ctx.sheetId,
      userId,
      rowIndex: ctx.rowIndex,
      colIndex: nextColIndex,
      content: finalContent.slice(0, 5000),
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

    // Determine if retry is needed based on validation
    const needsRetry = !validation.valid || validation.confidence < 0.5;
    const validationIssues = validation.issues.map(issue => issue.message);
    let retryPrompt: string | undefined;

    if (needsRetry) {
      // Generate improved prompt for retry
      const originalPrompt = this.buildContextualPrompt(ctx, targetColumn.title);
      retryPrompt = ResultValidator.generateImprovementPrompt(
        originalPrompt,
        validatedColumn,
        validation
      );
    }

    return {
      success: validation.valid,
      needsRetry,
      validationIssues: validationIssues.length > 0 ? validationIssues : undefined,
      retryPrompt
    };
  }
}
