/**
 * Google Search Gemini Operator
 *
 * Performs web searches using Gemini's Google Search grounding capability.
 * Provides real-time information with citations and sources.
 *
 * Reference: .tribe/snippets/GEMINI-GOOGLE_SEARCH.md
 */

import { getGeminiClient } from "@/server/gemini/client";
import { DEFAULT_MODEL } from "@/server/gemini/config";
import type {
  GoogleSearchInput,
  GoogleSearchOutput,
  BaseOperator,
  SearchResult,
} from "@/types/operators";

export class GoogleSearchGeminiOperator
  implements BaseOperator<GoogleSearchInput, GoogleSearchOutput>
{
  readonly name = "google_search_gemini";
  readonly inputType = "GoogleSearchInput";
  readonly outputType = "GoogleSearchOutput";

  /**
   * Execute Google Search via Gemini
   */
  async operation(input: GoogleSearchInput): Promise<GoogleSearchOutput> {
    const client = getGeminiClient();
    const maxResults = input.maxResults ?? 10;

    try {
      // Configure Google Search tool
      const config = {
        tools: [{ googleSearch: {} }],
      };

      // Call Gemini with search grounding
      const response = await client.models.generateContent({
        model: DEFAULT_MODEL,
        contents: input.query,
        config,
      });

      // Extract grounding metadata
      const groundingMetadata =
        response.candidates?.[0]?.groundingMetadata;

      // Extract search results from grounding chunks
      const results: SearchResult[] = [];

      if (groundingMetadata?.groundingChunks) {
        for (let i = 0; i < Math.min(groundingMetadata.groundingChunks.length, maxResults); i++) {
          const chunk = groundingMetadata.groundingChunks[i];
          if (chunk?.web?.uri) {
            results.push({
              title: chunk.web.title ?? "Unknown",
              url: chunk.web.uri,
              snippet: this.extractSnippet(
                response.text ?? "",
                groundingMetadata,
                i
              ),
            });
          }
        }
      }

      return {
        results,
        webSearchQueries: groundingMetadata?.webSearchQueries || [],
        groundingMetadata,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Google Search operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract snippet text for a specific grounding chunk
   */
  private extractSnippet(
    responseText: string,
    groundingMetadata: NonNullable<GoogleSearchOutput["groundingMetadata"]>,
    chunkIndex: number
  ): string {
    // Find all segments that reference this chunk
    const relevantSegments = groundingMetadata.groundingSupports?.filter(
      (support) =>
        support.groundingChunkIndices?.includes(chunkIndex)
    );

    if (!relevantSegments || relevantSegments.length === 0) {
      // Return first 200 characters of response as fallback
      return responseText.slice(0, 200) + (responseText.length > 200 ? "..." : "");
    }

    // Extract the first segment's text
    const firstSegment = relevantSegments[0]?.segment;
    if (firstSegment?.text) {
      return firstSegment.text;
    }

    // Fallback: extract by indices
    if (firstSegment?.startIndex !== undefined && firstSegment?.endIndex !== undefined) {
      return responseText.slice(firstSegment.startIndex, firstSegment.endIndex);
    }

    return responseText.slice(0, 200) + (responseText.length > 200 ? "..." : "");
  }

  /**
   * Optional: Chain to URL Context operator to enrich URLs
   * or update spreadsheet with results
   */
  async next?(output: GoogleSearchOutput): Promise<void> {
    // Default implementation: log the results
    console.log(
      `[GoogleSearchOperator] Found ${output.results.length} results for queries: ${output.webSearchQueries.join(", ")}`
    );

    // TODO: Implement spreadsheet update logic
    // This would create RobotUpdateCellInput events to write results back to cells
  }

  /**
   * Error handling
   */
  async onError?(error: Error, input: GoogleSearchInput): Promise<void> {
    console.error(
      `[GoogleSearchOperator] Error processing query "${input.query}":`,
      error
    );

    // TODO: Could retry with fallback strategy or notify user
  }
}

/**
 * Helper function to format search results for display
 */
export function formatSearchResults(output: GoogleSearchOutput): string {
  let formatted = `Search Results (${output.results.length} found):\n\n`;

  output.results.forEach((result, index) => {
    formatted += `${index + 1}. ${result.title}\n`;
    formatted += `   ${result.url}\n`;
    formatted += `   ${result.snippet}\n\n`;
  });

  if (output.webSearchQueries.length > 0) {
    formatted += `\nSearch queries used: ${output.webSearchQueries.join(", ")}`;
  }

  return formatted;
}

/**
 * Helper function to add citations to text
 */
export function addCitations(
  text: string,
  groundingMetadata?: GoogleSearchOutput["groundingMetadata"]
): string {
  if (!groundingMetadata?.groundingSupports || !groundingMetadata?.groundingChunks) {
    return text;
  }

  // Sort supports by endIndex in descending order to avoid shifting issues
  const sortedSupports = [...groundingMetadata.groundingSupports].sort(
    (a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0)
  );

  let citedText = text;

  for (const support of sortedSupports) {
    const endIndex = support.segment?.endIndex;
    if (endIndex === undefined || !support.groundingChunkIndices?.length) {
      continue;
    }

    const citationLinks = support.groundingChunkIndices
      .map((i) => {
        const uri = groundingMetadata.groundingChunks?.[i]?.web?.uri;
        if (uri) {
          return `[${i + 1}](${uri})`;
        }
        return null;
      })
      .filter(Boolean);

    if (citationLinks.length > 0) {
      const citationString = citationLinks.join(", ");
      citedText =
        citedText.slice(0, endIndex) +
        citationString +
        citedText.slice(endIndex);
    }
  }

  return citedText;
}
