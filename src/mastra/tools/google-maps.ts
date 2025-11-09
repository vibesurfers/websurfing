import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getGeminiClient } from "@/server/gemini/client";

/**
 * Google Maps Tool
 *
 * Uses Gemini's Google Maps grounding via Vertex AI to find places and locations.
 * Returns structured place data including:
 * - Name
 * - Address
 * - Place ID
 * - Rating
 * - URI
 *
 * Perfect for queries like "find pizza restaurants near SF" or "hackerspaces in Palo Alto"
 */
export const googleMapsTool = createTool({
  id: "google-maps",
  description: "Search for places using Google Maps integration. Use for location-based queries like finding restaurants, shops, hackerspaces, etc. Returns structured place data with names, addresses, and ratings.",
  inputSchema: z.object({
    placeType: z.string().describe("Type of place to search (e.g., 'pizza restaurant', 'hackerspace', 'bike rental', 'coworking space')"),
    location: z.string().describe("Location to search near (e.g., 'San Francisco', 'Palo Alto', 'SF Bay Area')"),
    maxResults: z.number().optional().default(20).describe("Maximum number of results (default: 20)"),
    latitude: z.number().optional().describe("Optional: Latitude for precise location context"),
    longitude: z.number().optional().describe("Optional: Longitude for precise location context"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    places: z.array(z.object({
      name: z.string(),
      address: z.string().optional(),
      placeId: z.string().optional(),
      rating: z.string().optional(),
      uri: z.string(),
    })),
    searchQuery: z.string(),
    resultCount: z.number(),
    widgetToken: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { placeType, location, maxResults, latitude, longitude } = context;

      const searchQuery = `${placeType} in ${location}`;

      console.log(`[Google Maps] Searching for: "${searchQuery}" (max ${maxResults} results)`);

      // Use the existing Gemini client (properly configured for Vertex AI)
      const genAI = getGeminiClient();

      // Build the config with Maps grounding
      const config: any = {
        tools: [{ googleMaps: { enableWidget: true } }],
      };

      // Add location context if coordinates provided
      if (latitude !== undefined && longitude !== undefined) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: { latitude, longitude },
          },
        };
      }

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find the top ${maxResults} ${placeType} near ${location}. Include names, addresses, ratings, and other relevant information.`,
        config,
      });

      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;

      console.log("[Google Maps] Response:", {
        hasGroundingMetadata: !!groundingMetadata,
        chunkCount: groundingMetadata?.groundingChunks?.length || 0,
      });

      // Extract grounded locations from Maps
      const places = groundingMetadata?.groundingChunks
        ?.filter((chunk: any) => chunk.maps)
        .map((chunk: any) => ({
          name: chunk.maps?.title || "Unknown Place",
          address: chunk.maps?.address || undefined,
          placeId: chunk.maps?.placeId || undefined,
          rating: chunk.maps?.rating?.toString() || undefined,
          uri: chunk.maps?.uri || "",
        })) || [];

      const widgetToken = groundingMetadata?.googleMapsWidgetContextToken || undefined;

      console.log(`[Google Maps] Found ${places.length} places${widgetToken ? ' (widget available)' : ''}`);

      // Fallback if no grounded results
      if (places.length === 0) {
        console.warn("[Google Maps] No Maps grounding data, using text fallback");

        // Try to extract places from text response
        const responseText = response.text || "";
        const fallbackPlaces = [];

        // Basic text parsing fallback
        const lines = responseText.split('\n').filter(line => line.trim());
        for (let i = 0; i < Math.min(maxResults, lines.length); i++) {
          const line = lines[i];
          if (line && line.length > 3) {
            fallbackPlaces.push({
              name: line.replace(/^[\d\.\-\*\s]+/, '').trim(),
              uri: "",
            });
          }
        }

        return {
          success: true,
          places: fallbackPlaces.slice(0, maxResults),
          searchQuery,
          resultCount: fallbackPlaces.length,
          error: "No Maps grounding available, using text fallback",
        };
      }

      return {
        success: true,
        places: places.slice(0, maxResults),
        searchQuery,
        resultCount: places.length,
        widgetToken,
      };
    } catch (error) {
      console.error("[Google Maps] Error:", error);
      return {
        success: false,
        places: [],
        searchQuery: `${context.placeType} in ${context.location}`,
        resultCount: 0,
        error: `Maps search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
