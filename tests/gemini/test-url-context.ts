/**
 * Test script for URL Context Enrichment Operator
 *
 * Run with: npx tsx tests/gemini/test-url-context.ts
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

import { URLContextEnrichmentOperator, compareUrls } from "../../src/server/operators/url-context-operator";

async function testURLContext() {
  console.log("🔗 Testing URL Context Enrichment Operator\n");

  const operator = new URLContextEnrichmentOperator();

  // Test 1: Extract data from single URL
  console.log("Test 1: Extract data from single URL");
  const testUrl = "https://github.com/anthropics/claude-code";
  console.log(`URL: ${testUrl}\n`);

  try {
    const result = await operator.operation({
      urls: [testUrl],
      extractionPrompt: "Summarize the main features and purpose of this repository",
    });

    console.log("✅ Success!");
    console.log(`Enriched ${result.enrichedData.length} URL(s)\n`);

    if (result.summary) {
      console.log("Summary:");
      console.log(result.summary);
    }

    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 2: Compare multiple URLs
  console.log("Test 2: Compare multiple documentation pages");

  try {
    const comparisonResult = await compareUrls(
      [
        "https://nextjs.org/docs",
        "https://react.dev/learn",
      ],
      "Compare the getting started approaches"
    );

    console.log("✅ Success!");
    console.log("\nComparison Result:");
    console.log(comparisonResult);

    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run tests
testURLContext()
  .then(() => {
    console.log("✨ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
