/**
 * Test script for Google Search Gemini Operator
 *
 * Run with: npx tsx tests/gemini/test-google-search.ts
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

import { GoogleSearchGeminiOperator, formatSearchResults } from "../../src/server/operators/google-search-operator";

async function testGoogleSearch() {
  console.log("🔍 Testing Google Search Gemini Operator\n");

  const operator = new GoogleSearchGeminiOperator();

  // Test 1: Simple search query
  console.log("Test 1: Simple search query");
  console.log("Query: Who won the 2024 UEFA Euro?\n");

  try {
    const result = await operator.operation({
      query: "Who won the 2024 UEFA Euro?",
      maxResults: 5,
    });

    console.log("✅ Success!");
    console.log(`Found ${result.results.length} results`);
    console.log(`Search queries used: ${result.webSearchQueries.join(", ")}\n`);

    console.log("Search Results:");
    console.log(formatSearchResults(result));
    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 2: Tech search
  console.log("Test 2: Tech search");
  console.log("Query: Latest features in Next.js 15\n");

  try {
    const result = await operator.operation({
      query: "Latest features in Next.js 15",
      maxResults: 3,
    });

    console.log("✅ Success!");
    console.log(`Found ${result.results.length} results\n`);

    result.results.forEach((r, i) => {
      console.log(`${i + 1}. ${r.title}`);
      console.log(`   URL: ${r.url}`);
      console.log(`   Snippet: ${r.snippet.slice(0, 100)}...\n`);
    });

    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run tests
testGoogleSearch()
  .then(() => {
    console.log("✨ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
