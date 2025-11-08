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

    // Initialize with Vertex AI using Application Default Credentials (ADC)
    // No API key needed - ADC is used automatically
    geminiClient = new GoogleGenAI({
      vertexai: true,
      project: project,
      location: location,
    });

    console.log(`[Gemini Client] Initialized with Vertex AI (project: ${project}, location: ${location})`);
  }

  return geminiClient;
}

/**
 * Reset the Gemini client instance (useful for testing)
 */
export function resetGeminiClient(): void {
  geminiClient = null;
}
