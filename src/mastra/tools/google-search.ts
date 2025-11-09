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
      "title": "Company/Business Name",
      "url": "https://example.com",
      "snippet": "Brief description"
    }
  ]
}

⚠️ ABSOLUTE CITATION REQUIREMENT - NO EXCEPTIONS ⚠️
EVERY single result MUST have a valid URL - this is NON-NEGOTIABLE!
- Extract the ACTUAL website URL (e.g., "https://n-ix.com", "https://devsdata.com")
- DO NOT include redirect URLs or grounding-api-redirect URLs
- Use the main domain from the search result
- If you see a redirect URL, extract the actual destination domain
- If no specific website exists, use the search result page URL
- NEVER return a result without a URL - results without URLs will be REJECTED
- Include MULTIPLE citations when available - the more sources the better!

MANDATORY:
- Clean, direct website URLs for EVERY result - no exceptions
- Business listings with COMPLETE URL information
- Include ALL relevant URLs found for each result
- If you find multiple sources for the same information, include ALL of them
- Every single result MUST have at least one citation URL
- More citations = better quality results`,
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

      let results = parsedResults.results.slice(0, maxResults);

      // Validate URLs in results
      const validatedResults = results.map(result => {
        const validation: any = {
          isValid: false,
          isRedirect: false,
          cleanedUrl: undefined,
        };

        try {
          // Check if URL is properly formatted
          const urlObj = new URL(result.url);
          validation.isValid = true;

          // Clean the URL (remove tracking params)
          const cleanUrl = new URL(urlObj.origin + urlObj.pathname);
          validation.cleanedUrl = cleanUrl.toString();

          // Check for common redirect patterns
          if (result.url.includes('redirect') ||
              result.url.includes('grounding-api') ||
              result.url.includes('bit.ly') ||
              result.url.includes('tinyurl') ||
              result.url.includes('goo.gl')) {
            validation.isRedirect = true;
            console.warn(`[Google Search] Redirect URL detected: ${result.url}`);

            // Try to extract actual URL from snippet or title
            const domainMatch = result.snippet.match(/(?:https?:\/\/)?([\w\-\.]+\.[a-z]{2,})/i);
            if (domainMatch) {
              const extractedDomain = domainMatch[1];
              validation.cleanedUrl = `https://${extractedDomain}`;
              console.log(`[Google Search] Extracted domain: ${validation.cleanedUrl}`);
            }
          }

          // Update URL with cleaned version if available and valid
          if (validation.cleanedUrl && validation.cleanedUrl !== result.url) {
            result.url = validation.cleanedUrl;
          }
        } catch (error) {
          validation.isValid = false;
          console.error(`[Google Search] Invalid URL: ${result.url}`);
        }

        return {
          ...result,
          urlValidation: validation,
        };
      });

      // Filter out results with invalid URLs that couldn't be fixed
      const validResults = validatedResults.filter(r =>
        r.urlValidation?.isValid &&
        (!r.urlValidation?.isRedirect || r.urlValidation?.cleanedUrl)
      );

      console.log(`[Google Search] Found ${results.length} results, ${validResults.length} with valid URLs`);

      return {
        success: true,
        results: validResults,
        searchQuery,
        resultCount: validResults.length,
        validUrlCount: validResults.length,
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
