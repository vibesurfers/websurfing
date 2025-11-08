/**
 * Test script for Structured Output Conversion Operator
 *
 * Run with: npx tsx tests/gemini/test-structured-output.ts
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

import { z } from "zod";
import {
  StructuredOutputConversionOperator,
  CommonSchemas,
  extractWithSchema,
} from "../../src/server/operators/structured-output-operator";

async function testStructuredOutput() {
  console.log("📋 Testing Structured Output Conversion Operator\n");

  const operator = new StructuredOutputConversionOperator();

  // Test 1: Extract person information
  console.log("Test 1: Extract person information");
  const personText = `
    Hi, my name is John Doe. You can reach me at john.doe@example.com
    or call me at (555) 123-4567. I'm 32 years old.
  `;

  try {
    const result = await operator.operation({
      rawData: personText,
      outputSchema: CommonSchemas.person,
      prompt: "Extract the person's contact information",
    });

    console.log("✅ Success!");
    console.log("Extracted Data:");
    console.log(JSON.stringify(result.structuredData, null, 2));
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);

    console.log("=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 2: Custom schema - Extract product information
  console.log("Test 2: Extract product information");

  const productSchema = z.object({
    name: z.string().describe("Product name"),
    price: z.number().describe("Price in USD"),
    category: z.string().describe("Product category"),
    inStock: z.boolean().describe("Whether the product is in stock"),
    features: z.array(z.string()).describe("List of key features"),
  });

  const productText = `
    Introducing the UltraBook Pro - the ultimate laptop for professionals.
    Price: $1,299. Category: Electronics / Laptops.
    Currently in stock!

    Key Features:
    - 16GB RAM
    - 512GB SSD
    - 14-inch 4K display
    - 15-hour battery life
    - Thunderbolt 4 ports
  `;

  try {
    const result = await extractWithSchema(productText, productSchema);

    console.log("✅ Success!");
    console.log("Extracted Product Data:");
    console.log(JSON.stringify(result, null, 2));

    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 3: Sentiment analysis
  console.log("Test 3: Sentiment analysis");

  const review = `
    This product is absolutely amazing! I've been using it for 3 months now
    and it has completely transformed my workflow. The build quality is top-notch,
    and customer service was incredibly helpful. Highly recommend!
  `;

  try {
    const result = await operator.operation({
      rawData: review,
      outputSchema: CommonSchemas.sentiment,
      prompt: "Analyze the sentiment of this review",
    });

    console.log("✅ Success!");
    console.log("Sentiment Analysis:");
    console.log(JSON.stringify(result.structuredData, null, 2));

    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run tests
testStructuredOutput()
  .then(() => {
    console.log("✨ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
