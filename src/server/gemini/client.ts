/**
 * Gemini Client Utility
 *
 * Provides a singleton GoogleGenAI client instance for interacting with
 * Vertex AI Gemini models using Application Default Credentials (ADC).
 */

import { GoogleGenAI } from "@google/genai";
import { env } from "@/env";

/**
 * Singleton instance of GoogleGenAI client
 * Initialized with Vertex AI configuration and ADC
 */
let geminiClient: GoogleGenAI | null = null;

/**
 * Get or create the Gemini client instance configured for Vertex AI
 *
 * Uses Application Default Credentials (ADC) for authentication.
 * ADC is obtained from:
 * 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (service account JSON)
 * 2. gcloud auth application-default login (for local development)
 *
 * @returns GoogleGenAI client configured for Vertex AI
 * @throws Error if required configuration is missing
 */
export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    // Support both validated env and direct process.env (for tests with SKIP_ENV_VALIDATION)
    const project = env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    const location = env.GOOGLE_CLOUD_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

    if (!project) {
      throw new Error(
        "GOOGLE_CLOUD_PROJECT is not configured. Please set it in your .env file."
      );
    }

    // Check for credentials in environment variable (Vercel deployment)
    const credsJson = process.env.GOOGLE_CREDENTIALS_JSON;

    if (credsJson) {
      // Parse JSON credentials from environment variable
      try {
        const credentials = JSON.parse(credsJson);
        geminiClient = new GoogleGenAI({
          vertexai: true,
          project: project,
          location: location,
          googleAuthOptions: {
            credentials: credentials,
          },
        });
        console.log(`[Gemini Client] Initialized with Vertex AI using JSON credentials from env`);
      } catch (error) {
        throw new Error(
          `Failed to parse GOOGLE_CREDENTIALS_JSON: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      // Use GOOGLE_APPLICATION_CREDENTIALS file or system ADC (local development)
      // This will look for:
      // 1. GOOGLE_APPLICATION_CREDENTIALS env var pointing to file
      // 2. ~/.config/gcloud/application_default_credentials.json
      geminiClient = new GoogleGenAI({
        vertexai: true,
        project: project,
        location: location,
      });
      console.log(`[Gemini Client] Initialized with Vertex AI using ADC (project: ${project}, location: ${location})`);
    }
  }

  return geminiClient;
}

/**
 * Reset the Gemini client instance (useful for testing)
 */
export function resetGeminiClient(): void {
  geminiClient = null;
}
