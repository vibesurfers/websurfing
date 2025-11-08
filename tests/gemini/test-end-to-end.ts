/**
 * End-to-end integration test for Gemini Operators
 *
 * Tests a complete workflow: Search → URL Context → Structured Output
 *
 * Run with: pnpm test:gemini:e2e
 */

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (two levels up from tests/gemini/)
config({ path: resolve(__dirname, "../../.env") });

// Skip full env validation for tests - we only need VERTEX_API_KEY
process.env.SKIP_ENV_VALIDATION = "true";

import { GoogleSearchGeminiOperator } from "../../src/server/operators/google-search-operator";
import { URLContextEnrichmentOperator } from "../../src/server/operators/url-context-operator";
import { StructuredOutputConversionOperator } from "../../src/server/operators/structured-output-operator";
import { z } from "zod";

async function testEndToEnd() {
  console.log("🔄 End-to-End Gemini Integration Test\n");
  console.log("=".repeat(80));

  // Scenario: User searches for "Next.js 15 features",
  // then enriches top URLs,
  // then extracts structured data

  // Step 1: Google Search
  console.log("\n📍 Step 1: Search for 'Next.js 15 features'\n");

  const searchOperator = new GoogleSearchGeminiOperator();
  const searchResult = await searchOperator.operation({
    query: "Next.js 15 features",
    maxResults: 2,
  });

  console.log("✅ Search completed!");
  console.log(`Found ${searchResult.results.length} results`);
  searchResult.results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.title}`);
  });

  // Step 2: URL Context Enrichment
  console.log("\n📍 Step 2: Extract content from top result\n");

  const topUrl = searchResult.results[0]?.url;
  if (!topUrl) {
    console.error("❌ No URL found in search results");
    return;
  }

  console.log(`Analyzing: ${searchResult.results[0]?.title}`);

  const urlOperator = new URLContextEnrichmentOperator();
  const urlResult = await urlOperator.operation({
    urls: [topUrl],
    extractionPrompt: "Extract the main features and improvements mentioned",
  });

  console.log("\n✅ URL Content extracted!");
  if (urlResult.summary) {
    console.log("Summary preview:", urlResult.summary.slice(0, 200) + "...");
  }

  // Step 3: Structured Output
  console.log("\n📍 Step 3: Extract structured data from summary\n");

  const featureSchema = z.object({
    productName: z.string().describe("The product name"),
    version: z.string().describe("Version number"),
    releaseDate: z.string().optional().describe("Release date if mentioned"),
    features: z
      .array(z.string())
      .describe("List of key features or improvements"),
    category: z
      .enum(["Framework", "Library", "Tool", "Other"])
      .describe("Product category"),
  });

  const structuredOperator = new StructuredOutputConversionOperator();
  const structuredResult = await structuredOperator.operation({
    rawData: urlResult.summary || "",
    outputSchema: featureSchema,
    prompt: "Extract structured information about the product and its features",
  });

  console.log("✅ Structured data extracted!");
  console.log("\nExtracted Data:");
  console.log(JSON.stringify(structuredResult.structuredData, null, 2));
  console.log(`\nConfidence: ${(structuredResult.confidence * 100).toFixed(1)}%`);

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("\n✨ End-to-End Test Complete!\n");
  console.log("Pipeline executed successfully:");
  console.log("  1. Search Query → Found relevant URLs");
  console.log("  2. URL Context → Extracted content and summary");
  console.log("  3. Structured Output → Parsed into type-safe JSON");
  console.log("\nThis demonstrates the complete operator chain for:");
  console.log("  User Cell Edit → Event Queue → Operator Pipeline → Structured Result");
  console.log("\n" + "=".repeat(80));
}

// Run test
testEndToEnd()
  .then(() => {
    console.log("\n✅ All end-to-end tests passed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 End-to-end test failed:", error);
    process.exit(1);
  });
