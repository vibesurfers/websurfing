import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * CSV Analyzer Tool
 *
 * Analyzes uploaded CSV data and suggests import strategy:
 * - Column name suggestions
 * - Data type detection
 * - Mapping to existing columns
 * - Row validation
 * - Processing time estimates
 *
 * Used by the agent when user uploads a CSV file.
 */
export const csvAnalyzerTool = createTool({
  id: "csv-analyzer",
  description: "Analyze uploaded CSV data to determine structure, data types, and import strategy. Use this when a user uploads a CSV file to understand what columns to create and how to import the data.",
  inputSchema: z.object({
    sheetId: z.string().uuid().describe("The sheet ID where CSV will be imported"),
    csvData: z.object({
      filename: z.string(),
      headers: z.array(z.string()).describe("Column headers from CSV"),
      rowCount: z.number().describe("Total number of rows"),
      sample: z.array(z.record(z.string(), z.string())).describe("First 5-10 sample rows"),
    }),
    existingColumns: z.array(z.object({
      title: z.string(),
      position: z.number(),
      dataType: z.string(),
    })).optional().describe("Existing columns in the sheet (if any)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    analysis: z.object({
      filename: z.string(),
      rowCount: z.number(),
      columnCount: z.number(),
      recommendedColumns: z.array(z.object({
        csvHeader: z.string(),
        suggestedTitle: z.string(),
        detectedType: z.enum(['text', 'url', 'email', 'number', 'json']),
        existingColumnMatch: z.number().optional().describe("Position of existing column that matches"),
      })),
      sample: z.array(z.record(z.string(), z.string())).describe("Sample rows for preview"),
      warnings: z.array(z.string()),
      estimatedProcessingTime: z.string(),
      strategy: z.enum(['create_new_columns', 'map_to_existing', 'mixed']),
    }),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { sheetId, csvData, existingColumns } = context;

      console.log(`[CSV Analyzer] Analyzing ${csvData.filename}: ${csvData.rowCount} rows, ${csvData.headers.length} columns`);

      // Detect data types for each column
      const recommendedColumns = csvData.headers.map((header, idx) => {
        // Sample values from this column
        const values = csvData.sample.map(row => row[header] || '').filter(v => v.trim());

        // Detect data type
        const detectedType = detectDataType(values);

        // Clean header for suggested title
        const suggestedTitle = cleanHeaderName(header);

        // Check if matches existing column
        let existingColumnMatch: number | undefined;
        if (existingColumns) {
          const match = existingColumns.find(col =>
            col.title.toLowerCase() === suggestedTitle.toLowerCase()
          );
          if (match) {
            existingColumnMatch = match.position;
          }
        }

        return {
          csvHeader: header,
          suggestedTitle,
          detectedType,
          existingColumnMatch,
        };
      });

      // Determine import strategy
      const hasExistingColumns = existingColumns && existingColumns.length > 0;
      const allColumnsMatch = recommendedColumns.every(col => col.existingColumnMatch !== undefined);

      let strategy: 'create_new_columns' | 'map_to_existing' | 'mixed';
      if (!hasExistingColumns) {
        strategy = 'create_new_columns';
      } else if (allColumnsMatch) {
        strategy = 'map_to_existing';
      } else {
        strategy = 'mixed';
      }

      // Generate warnings
      const warnings: string[] = [];

      // Check for empty columns
      csvData.headers.forEach((header, idx) => {
        const values = csvData.sample.map(row => row[header] || '').filter(v => v.trim());
        const emptyPercentage = ((csvData.sample.length - values.length) / csvData.sample.length) * 100;
        if (emptyPercentage > 30) {
          warnings.push(`Column "${header}" has ${emptyPercentage.toFixed(0)}% empty values`);
        }
      });

      // Check for large file
      if (csvData.rowCount > 10000) {
        warnings.push(`Large file detected (${csvData.rowCount} rows). AI processing limited to first 10,000 rows.`);
      } else if (csvData.rowCount > 1000) {
        warnings.push(`Medium file (${csvData.rowCount} rows). Import may take 1-2 minutes.`);
      }

      // Estimate processing time
      const estimatedSeconds = Math.ceil(csvData.rowCount / 10); // ~10 rows/second
      const estimatedProcessingTime = estimatedSeconds < 60
        ? `~${estimatedSeconds} seconds`
        : `~${Math.ceil(estimatedSeconds / 60)} minutes`;

      console.log(`[CSV Analyzer] Strategy: ${strategy}, Warnings: ${warnings.length}`);

      return {
        success: true,
        analysis: {
          filename: csvData.filename,
          rowCount: csvData.rowCount,
          columnCount: csvData.headers.length,
          recommendedColumns,
          sample: csvData.sample.slice(0, 3), // First 3 rows for preview
          warnings,
          estimatedProcessingTime,
          strategy,
        },
      };
    } catch (error) {
      console.error("[CSV Analyzer] Error:", error);
      return {
        success: false,
        analysis: {
          filename: context.csvData.filename,
          rowCount: 0,
          columnCount: 0,
          recommendedColumns: [],
          sample: [],
          warnings: [],
          estimatedProcessingTime: "Unknown",
          strategy: 'create_new_columns',
        },
        error: `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * Detect data type from sample values
 */
function detectDataType(values: string[]): 'text' | 'url' | 'email' | 'number' | 'json' {
  if (values.length === 0) return 'text';

  // Check if all values are URLs
  const urlPattern = /^https?:\/\//i;
  if (values.every(v => urlPattern.test(v))) {
    return 'url';
  }

  // Check if all values are emails
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (values.every(v => emailPattern.test(v))) {
    return 'email';
  }

  // Check if all values are numbers
  if (values.every(v => !isNaN(parseFloat(v)) && isFinite(parseFloat(v)))) {
    return 'number';
  }

  // Check if values look like JSON
  if (values.some(v => v.startsWith('{') || v.startsWith('['))) {
    return 'json';
  }

  return 'text';
}

/**
 * Clean CSV header names to nice column titles
 */
function cleanHeaderName(header: string): string {
  return header
    .trim()
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
