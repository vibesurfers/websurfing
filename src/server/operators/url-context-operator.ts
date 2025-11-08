/**
 * URL Context Enrichment Gemini Operator
 *
 * Fetches and extracts content from URLs using Gemini's URL context tool.
 * Useful for document comparison, data extraction, and content synthesis.
 *
 * Reference: .tribe/snippets/GEMINI-URL_CONTEXT.md
 */

import { getGeminiClient } from "@/server/gemini/client";
import { DEFAULT_MODEL, MAX_URLS_PER_REQUEST } from "@/server/gemini/config";
import type {
  URLContextInput,
  URLContextOutput,
  EnrichedURLData,
  BaseOperator,
} from "@/types/operators";

/**
 * URL retrieval status enum
 */
export enum UrlRetrievalStatus {
  URL_RETRIEVAL_STATUS_UNSPECIFIED = "URL_RETRIEVAL_STATUS_UNSPECIFIED",
  URL_RETRIEVAL_STATUS_SUCCESS = "URL_RETRIEVAL_STATUS_SUCCESS",
  URL_RETRIEVAL_STATUS_UNSAFE = "URL_RETRIEVAL_STATUS_UNSAFE",
  URL_RETRIEVAL_STATUS_FAILED = "URL_RETRIEVAL_STATUS_FAILED",
}

/**
 * URL metadata from Gemini response
 * Note: Vertex AI returns camelCase, not snake_case
 */
interface UrlMetadata {
  retrievedUrl: string;
  urlRetrievalStatus: UrlRetrievalStatus;
}

interface UrlContextMetadata {
  urlMetadata: UrlMetadata[];
}

export class URLContextEnrichmentOperator
  implements BaseOperator<URLContextInput, URLContextOutput>
{
  readonly name = "url_context_enrichment";
  readonly inputType = "URLContextInput";
  readonly outputType = "URLContextOutput";

  /**
   * Execute URL context enrichment via Gemini
   */
  async operation(input: URLContextInput): Promise<URLContextOutput> {
    const client = getGeminiClient();

    // Validate URL count
    const maxUrls = input.maxUrls ?? MAX_URLS_PER_REQUEST;
    if (input.urls.length > maxUrls) {
      throw new Error(
        `Too many URLs provided. Maximum is ${maxUrls}, got ${input.urls.length}`
      );
    }

    // Validate URLs
    this.validateUrls(input.urls);

    try {
      // Build prompt
      const prompt = input.extractionPrompt
        ? `${input.extractionPrompt}\n\nURLs to analyze: ${input.urls.join(", ")}`
        : `Please extract and summarize the content from the following URLs: ${input.urls.join(", ")}`;

      // Configure URL Context tool
      const config = {
        tools: [{ urlContext: {} }],
      };

      // Call Gemini with URL context
      const response = await client.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config,
      });

      // Extract URL metadata
      const urlContextMetadata =
        response.candidates?.[0]?.urlContextMetadata as UrlContextMetadata | undefined;

      // Build enriched data
      const enrichedData: EnrichedURLData[] = [];

      for (const url of input.urls) {
        const metadata = urlContextMetadata?.urlMetadata?.find(
          (m) => m.retrievedUrl === url
        );

        if (metadata?.urlRetrievalStatus === UrlRetrievalStatus.URL_RETRIEVAL_STATUS_SUCCESS) {
          const content = response.text ?? "";
          enrichedData.push({
            url,
            content, // In a real scenario, you'd parse specific content per URL
            metadata: {
              extractedAt: new Date(),
              contentLength: content.length,
            },
          });
        } else {
          console.warn(
            `[URLContextOperator] Failed to retrieve ${url}: ${metadata?.urlRetrievalStatus ?? "Unknown status"}`
          );
        }
      }

      return {
        enrichedData,
        summary: response.text,
      };
    } catch (error) {
      throw new Error(
        `URL Context operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate URLs before sending to API
   */
  private validateUrls(urls: string[]): void {
    for (const url of urls) {
      try {
        new URL(url);
      } catch {
        throw new Error(`Invalid URL format: ${url}`);
      }

      // Check if URL is HTTP or HTTPS
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        throw new Error(`URL must start with http:// or https://: ${url}`);
      }
    }
  }

  /**
   * Optional: Chain to Structured Output operator for data extraction
   */
  async next?(output: URLContextOutput): Promise<void> {
    console.log(
      `[URLContextOperator] Enriched ${output.enrichedData.length} URLs`
    );

    // TODO: Could chain to StructuredOutputOperator to extract structured data
    // or update spreadsheet cells with enriched content
  }

  /**
   * Error handling
   */
  async onError?(error: Error, input: URLContextInput): Promise<void> {
    console.error(
      `[URLContextOperator] Error processing URLs ${input.urls.join(", ")}:`,
      error
    );

    // TODO: Could retry with fallback strategy or notify user
  }
}

/**
 * Helper function to extract specific data from URLs
 */
export async function extractDataFromUrls(
  urls: string[],
  extractionPrompt: string
): Promise<string> {
  const operator = new URLContextEnrichmentOperator();
  const result = await operator.operation({
    urls,
    extractionPrompt,
  });

  return result.summary ?? "";
}

/**
 * Helper function to compare content from multiple URLs
 */
export async function compareUrls(
  urls: string[],
  comparisonCriteria?: string
): Promise<string> {
  const prompt = comparisonCriteria
    ? `Compare the following URLs based on: ${comparisonCriteria}`
    : "Compare and contrast the content from the following URLs";

  const operator = new URLContextEnrichmentOperator();
  const result = await operator.operation({
    urls,
    extractionPrompt: prompt,
  });

  return result.summary ?? "";
}
