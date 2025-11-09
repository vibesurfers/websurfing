import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { vertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";

/**
 * Google Search Tool
 *
 * Uses Gemini's Google Search grounding to find real-time information.
 * Supported models: Gemini 2.5 Flash-Lite, 2.5 Flash, 2.0 Flash, 2.5 Pro
 *
 * This tool enables the agent to search the web for:
 * - Businesses and locations
 * - Recent information
 * - General web queries
 */
export const googleSearchTool = createTool({
  id: "google-search",
  description: "Search Google for real-time information using Gemini's grounding. Use for finding businesses, places, recent information, or general web queries. Returns search results with titles, URLs, and snippets.",
  inputSchema: z.object({
    query: z.string().describe("The search query (e.g., 'best pizza restaurants in San Francisco', 'hackerspaces near Palo Alto')"),
    maxResults: z.number().optional().default(10).describe("Maximum number of results to return (default: 10)"),
    location: z.string().optional().describe("Optional location context to add to the query"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
    })),
    searchQuery: z.string(),
    resultCount: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { query, maxResults, location } = context;

      // Build search query with location if provided
      const searchQuery = location ? `${query} in ${location}` : query;

      console.log(`[Google Search] Searching for: "${searchQuery}" (max ${maxResults} results)`);

      // Use Gemini with Google Search grounding
      const result = await generateText({
        model: vertex("gemini-2.5-flash"),
        tools: { google_search: vertex.tools.googleSearch({}) },
        prompt: `Search for: ${searchQuery}

Return the top ${maxResults} most relevant results in this exact JSON format:
{
  "results": [
    {
      "title": "Result title",
      "url": "https://example.com",
      "snippet": "Brief description or snippet"
    }
  ]
}

Focus on:
- Business listings with addresses if searching for places
- Most recent and relevant results
- Include full URLs
- Provide descriptive snippets`,
      });

      console.log(`[Google Search] Raw response:`, result.text);

      // Parse JSON response
      let parsedResults: { results: Array<{ title: string; url: string; snippet: string }> } = { results: [] };

      try {
        // Remove markdown code blocks if present
        let jsonText = result.text;

        // Remove ```json and ``` markers
        jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

        // Try to extract JSON from the cleaned response
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResults = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.warn("[Google Search] Could not parse JSON, falling back to text parsing", parseError);

        // Fallback: Create a single result from the text
        parsedResults = {
          results: [{
            title: searchQuery,
            url: "",
            snippet: result.text.slice(0, 200),
          }]
        };
      }

      const results = parsedResults.results.slice(0, maxResults);

      console.log(`[Google Search] Found ${results.length} results`);

      return {
        success: true,
        results,
        searchQuery,
        resultCount: results.length,
      };
    } catch (error) {
      console.error("[Google Search] Error:", error);
      return {
        success: false,
        results: [],
        searchQuery: context.query,
        resultCount: 0,
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
