/**
 * Operator Type Definitions
 *
 * Type definitions for Gemini operators following the architecture pattern
 * defined in .tribe/PROJECT-ARCHITECTURE.md
 */

import type { z } from "zod";

/**
 * Base operator input wrapper
 */
export interface OperatorInput<T = unknown> {
  eventId: string;
  userId: string;
  data: T;
}

/**
 * Base operator output wrapper
 */
export interface OperatorOutput<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  nextOperator?: string; // Name of next operator to call
  usageMetadata?: UsageMetadata;
}

/**
 * Token usage metadata from Gemini responses
 */
export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  estimatedCost?: number;
}

/**
 * Google Search Gemini Operator Types
 */
export interface GoogleSearchInput {
  query: string;
  maxResults?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
}

export interface GroundingSupport {
  segment?: {
    startIndex?: number;
    endIndex?: number;
    text?: string;
  };
  groundingChunkIndices?: number[];
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
}

export interface GoogleSearchOutput {
  results: SearchResult[];
  webSearchQueries: string[];
  groundingMetadata?: GroundingMetadata;
  timestamp: Date;
}

/**
 * URL Context Enrichment Operator Types
 */
export interface URLContextInput {
  urls: string[];
  extractionPrompt?: string;
  maxUrls?: number;
}

export interface EnrichedURLData {
  url: string;
  content: string;
  metadata: {
    title?: string;
    description?: string;
    extractedAt: Date;
    contentLength: number;
  };
}

export interface URLContextOutput {
  enrichedData: EnrichedURLData[];
  summary?: string;
}

/**
 * Structured Output Conversion Operator Types
 */
export interface StructuredOutputInput {
  rawData: string | object;
  outputSchema: z.ZodSchema | object; // Zod schema or JSON schema
  prompt?: string;
}

export interface StructuredOutputOutput<T = Record<string, unknown>> {
  structuredData: T;
  confidence: number;
  rawResponse?: string;
}

/**
 * Function Calling Operator Types
 */
export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface FunctionCallInput {
  prompt: string;
  availableFunctions: FunctionDeclaration[];
  toolConfig?: {
    functionCallingConfig?: {
      mode?: "auto" | "any" | "none";
      allowedFunctionNames?: string[];
    };
  };
}

export interface FunctionCallOutput {
  functionCalls: FunctionCall[];
  response?: string;
  requiresExecution: boolean;
}

/**
 * Gemini Response Structure
 */
export interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string; functionCall?: FunctionCall }>;
    role?: string;
  };
  groundingMetadata?: GroundingMetadata;
  finishReason?: string;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
}

export interface GeminiResponse {
  text: string;
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

/**
 * Common error types
 */
export class OperatorError extends Error {
  constructor(
    message: string,
    public readonly operatorName: string,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "OperatorError";
  }
}

export class GeminiAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = "GeminiAPIError";
  }
}

/**
 * Operator registry type
 */
export type OperatorName =
  | "google_search"
  | "url_context"
  | "structured_output"
  | "function_calling";

/**
 * Base operator interface
 */
export interface BaseOperator<TInput, TOutput> {
  readonly name: string;
  readonly inputType: string;
  readonly outputType: string;

  /**
   * Main operation logic
   */
  operation(input: TInput): Promise<TOutput>;

  /**
   * Post-processing hook (optional)
   * Called after operation() completes
   * Can dispatch to another operator or update spreadsheet
   */
  next?(output: TOutput): Promise<void>;

  /**
   * Error handling hook (optional)
   */
  onError?(error: Error, input: TInput): Promise<void>;
}
