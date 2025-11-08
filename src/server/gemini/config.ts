/**
 * Gemini Configuration
 *
 * Centralized configuration for Gemini models, tools, and operational settings
 */

/**
 * Available Gemini models
 */
export const GEMINI_MODELS = {
  FLASH: "gemini-2.5-flash",
  FLASH_LITE: "gemini-2.5-flash-lite",
  PRO: "gemini-2.5-pro",
  FLASH_2_0: "gemini-2.0-flash",
  EMBEDDING: "gemini-embedding-001",
} as const;

export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

/**
 * Default model for general operations
 */
export const DEFAULT_MODEL: GeminiModel = GEMINI_MODELS.FLASH;

/**
 * Model for embedding operations
 */
export const DEFAULT_EMBEDDING_MODEL: GeminiModel = GEMINI_MODELS.EMBEDDING;

/**
 * Default generation configuration
 */
export const DEFAULT_GENERATION_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 8192,
} as const;

/**
 * Conservative generation config (more deterministic)
 */
export const CONSERVATIVE_GENERATION_CONFIG = {
  temperature: 0.2,
  topK: 10,
  topP: 0.9,
  maxOutputTokens: 8192,
} as const;

/**
 * Creative generation config (more diverse)
 */
export const CREATIVE_GENERATION_CONFIG = {
  temperature: 1.0,
  topK: 50,
  topP: 0.98,
  maxOutputTokens: 8192,
} as const;

/**
 * Embedding task types
 */
export const EMBEDDING_TASK_TYPES = {
  SEMANTIC_SIMILARITY: "SEMANTIC_SIMILARITY",
  CLASSIFICATION: "CLASSIFICATION",
  CLUSTERING: "CLUSTERING",
  RETRIEVAL_DOCUMENT: "RETRIEVAL_DOCUMENT",
  RETRIEVAL_QUERY: "RETRIEVAL_QUERY",
} as const;

export type EmbeddingTaskType =
  (typeof EMBEDDING_TASK_TYPES)[keyof typeof EMBEDDING_TASK_TYPES];

/**
 * Recommended embedding dimensions
 */
export const EMBEDDING_DIMENSIONS = {
  SMALL: 128,
  MEDIUM: 768,
  LARGE: 1536,
  XLARGE: 3072,
} as const;

/**
 * Default embedding configuration
 */
export const DEFAULT_EMBEDDING_CONFIG = {
  taskType: EMBEDDING_TASK_TYPES.SEMANTIC_SIMILARITY,
  outputDimensionality: EMBEDDING_DIMENSIONS.MEDIUM,
} as const;

/**
 * Function calling modes
 */
export const FUNCTION_CALLING_MODES = {
  AUTO: "auto", // Let model decide
  ANY: "any", // Force function call
  NONE: "none", // Disable function calling
} as const;

export type FunctionCallingMode =
  (typeof FUNCTION_CALLING_MODES)[keyof typeof FUNCTION_CALLING_MODES];

/**
 * Safety settings for content generation
 */
export const DEFAULT_SAFETY_SETTINGS = [
  {
    category: "HARM_CATEGORY_HARASSMENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_HATE_SPEECH",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
  {
    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
    threshold: "BLOCK_MEDIUM_AND_ABOVE",
  },
] as const;

/**
 * Rate limiting and retry configuration
 */
export const RATE_LIMIT_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // ms
  maxConcurrentRequests: 10,
  requestTimeout: 60000, // 60 seconds
} as const;

/**
 * Token pricing (per 1M tokens) - Gemini 2.5 Flash
 */
export const TOKEN_PRICING = {
  [GEMINI_MODELS.FLASH]: {
    input: 0.075, // $0.075 per 1M tokens
    output: 0.3, // $0.30 per 1M tokens
  },
  [GEMINI_MODELS.PRO]: {
    input: 1.25, // $1.25 per 1M tokens
    output: 5.0, // $5.00 per 1M tokens
  },
  [GEMINI_MODELS.EMBEDDING]: {
    input: 0.15, // $0.15 per 1M tokens
    output: 0, // No output cost for embeddings
  },
} as const;

/**
 * Calculate estimated cost for a request
 */
export function calculateCost(
  model: GeminiModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = TOKEN_PRICING[model as keyof typeof TOKEN_PRICING];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Maximum file size for file uploads (100MB)
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Maximum number of URLs for URL context tool
 */
export const MAX_URLS_PER_REQUEST = 20;

/**
 * Cache TTL for embeddings (1 hour)
 */
export const EMBEDDING_CACHE_TTL = 3600000;

/**
 * Cache TTL for search results (30 minutes)
 */
export const SEARCH_CACHE_TTL = 1800000;
