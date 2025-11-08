/**
 * Structured Output Conversion Gemini Operator
 *
 * Converts unstructured data to structured JSON using Gemini with schema validation.
 * Ensures type-safe, parseable results for data extraction and classification tasks.
 *
 * Reference: .tribe/snippets/GEMINI-STRUCTURED_OUTPUT.md
 */

import { getGeminiClient } from "@/server/gemini/client";
import { CONSERVATIVE_GENERATION_CONFIG, DEFAULT_MODEL } from "@/server/gemini/config";
import type {
  StructuredOutputInput,
  StructuredOutputOutput,
  BaseOperator,
} from "@/types/operators";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export class StructuredOutputConversionOperator
  implements BaseOperator<StructuredOutputInput, StructuredOutputOutput>
{
  readonly name = "structured_output_conversion";
  readonly inputType = "StructuredOutputInput";
  readonly outputType = "StructuredOutputOutput";

  /**
   * Convert unstructured data to structured JSON
   */
  async operation(input: StructuredOutputInput): Promise<StructuredOutputOutput> {
    const client = getGeminiClient();

    try {
      // Prepare the data to process
      const dataToProcess =
        typeof input.rawData === "string"
          ? input.rawData
          : JSON.stringify(input.rawData);

      // Build prompt
      const prompt = input.prompt
        ? `${input.prompt}\n\nData to process:\n${dataToProcess}`
        : `Extract structured information from the following data:\n${dataToProcess}`;

      // Convert schema to JSON Schema format
      let jsonSchema: object;
      if (this.isZodSchema(input.outputSchema)) {
        jsonSchema = zodToJsonSchema(input.outputSchema);
      } else {
        jsonSchema = input.outputSchema as object;
      }

      // Call Gemini with structured output config
      const response = await client.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          ...CONSERVATIVE_GENERATION_CONFIG, // Use conservative config for deterministic results
        },
      });

      // Parse the response
      const structuredData = JSON.parse(response.text ?? "{}") as Record<string, unknown>;

      // Validate with Zod schema if provided
      if (this.isZodSchema(input.outputSchema)) {
        const validatedData = input.outputSchema.parse(structuredData);

        return {
          structuredData: validatedData as Record<string, unknown>,
          confidence: this.calculateConfidence(response),
          rawResponse: response.text,
        };
      }

      return {
        structuredData,
        confidence: this.calculateConfidence(response),
        rawResponse: response.text,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Schema validation failed: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }

      throw new Error(
        `Structured Output operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Type guard to check if schema is a Zod schema
   */
  private isZodSchema(schema: unknown): schema is z.ZodSchema {
    return (
      typeof schema === "object" &&
      schema !== null &&
      "_def" in schema &&
      "parse" in schema
    );
  }

  /**
   * Calculate confidence score based on response metadata
   * Higher finish reason scores = higher confidence
   */
  private calculateConfidence(response: { candidates?: Array<{ finishReason?: string }> }): number {
    const finishReason = response.candidates?.[0]?.finishReason;

    switch (finishReason) {
      case "STOP":
        return 1.0; // Natural completion
      case "MAX_TOKENS":
        return 0.7; // Hit token limit
      case "SAFETY":
        return 0.3; // Safety filter triggered
      case "RECITATION":
        return 0.5; // Recitation detected
      default:
        return 0.8; // Unknown but likely okay
    }
  }

  /**
   * Optional: Update spreadsheet with structured data
   */
  async next?(output: StructuredOutputOutput): Promise<void> {
    console.log(
      `[StructuredOutputOperator] Extracted structured data with ${output.confidence * 100}% confidence`
    );

    // TODO: Create RobotUpdateCellInput events to update spreadsheet cells
    // with the structured data
  }

  /**
   * Error handling
   */
  async onError?(error: Error, _input: StructuredOutputInput): Promise<void> {
    console.error(
      `[StructuredOutputOperator] Error processing data:`,
      error
    );

    // TODO: Could retry with relaxed schema or notify user
  }
}

/**
 * Helper: Extract data with a predefined schema
 */
export async function extractWithSchema<T>(
  rawData: string | object,
  schema: z.ZodSchema<T>,
  prompt?: string
): Promise<T> {
  const operator = new StructuredOutputConversionOperator();
  const result = await operator.operation({
    rawData,
    outputSchema: schema,
    prompt,
  });

  return result.structuredData as T;
}

/**
 * Common schema examples for reuse
 */
export const CommonSchemas = {
  /**
   * Schema for extracting person information
   */
  person: z.object({
    name: z.string().describe("Full name of the person"),
    email: z.string().email().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
    age: z.number().int().positive().optional().describe("Age in years"),
  }),

  /**
   * Schema for extracting address information
   */
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().default("USA"),
  }),

  /**
   * Schema for extracting date and time information
   */
  dateTime: z.object({
    date: z.string().describe("Date in YYYY-MM-DD format"),
    time: z.string().optional().describe("Time in HH:MM format"),
    timezone: z.string().optional().describe("Timezone (e.g., PST, EST)"),
  }),

  /**
   * Schema for extracting invoice information
   */
  invoice: z.object({
    invoiceNumber: z.string(),
    date: z.string(),
    amount: z.number(),
    currency: z.string().default("USD"),
    items: z.array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        total: z.number(),
      })
    ),
  }),

  /**
   * Schema for sentiment analysis
   */
  sentiment: z.object({
    sentiment: z.enum(["positive", "negative", "neutral"]),
    confidence: z.number().min(0).max(1),
    keywords: z.array(z.string()),
    summary: z.string(),
  }),

  /**
   * Schema for classification
   */
  classification: z.object({
    category: z.string(),
    subcategory: z.string().optional(),
    tags: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  }),
};
