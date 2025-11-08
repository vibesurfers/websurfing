# Gemini URL Context Skill

## Overview

The URL context tool lets you provide additional context to Gemini models in the form of URLs. By including URLs in your request, the model will access the content from those pages (subject to limitations) to inform and enhance its response.

The URL context tool is useful for tasks like:

- **Extract Data**: Pull specific info like prices, names, or key findings from multiple URLs
- **Compare Documents**: Analyze multiple reports, articles, or PDFs to identify differences and track trends
- **Synthesize & Create Content**: Combine information from several source URLs to generate accurate summaries, blog posts, or reports
- **Analyze Code & Docs**: Point to a GitHub repository or technical documentation to explain code, generate setup instructions, or answer questions

## TypeScript Implementation

### Setup

Install required dependency:

```bash
npm install @google/genai
```

### Basic Usage

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      "Compare the ingredients and cooking times from the recipes at https://www.foodnetwork.com/recipes/ina-garten/perfect-roast-chicken-recipe-1940592 and https://www.allrecipes.com/recipe/21151/simple-whole-roast-chicken/",
    ],
    config: {
      tools: [{ urlContext: {} }],
    },
  });
  
  console.log(response.text);

  // For verification, inspect metadata to see which URLs the model retrieved
  console.log(response.candidates[0].urlContextMetadata);
}

await main();
```

## How It Works

The URL Context tool uses a **two-step retrieval process** to balance speed, cost, and access to fresh data:

1. **Internal Index Cache**: The tool first attempts to fetch content from an internal index cache (highly optimized cache)

2. **Live Fetch Fallback**: If a URL is not available in the index (e.g., very new page), the tool automatically falls back to live fetch, directly accessing the URL to retrieve content in real-time

This approach ensures optimal performance while maintaining access to fresh content.

## Understanding the Response

When the model uses the URL context tool, the response includes a `url_context_metadata` object that lists URLs the model retrieved content from and the status of each retrieval attempt.

### Response Structure

```typescript
interface UrlMetadata {
  retrieved_url: string;
  url_retrieval_status: UrlRetrievalStatus;
}

enum UrlRetrievalStatus {
  URL_RETRIEVAL_STATUS_UNSPECIFIED = "URL_RETRIEVAL_STATUS_UNSPECIFIED",
  URL_RETRIEVAL_STATUS_SUCCESS = "URL_RETRIEVAL_STATUS_SUCCESS",
  URL_RETRIEVAL_STATUS_UNSAFE = "URL_RETRIEVAL_STATUS_UNSAFE",
  URL_RETRIEVAL_STATUS_FAILED = "URL_RETRIEVAL_STATUS_FAILED",
}

interface UrlContextMetadata {
  url_metadata: UrlMetadata[];
}

interface UrlContextResponse {
  text: string;
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    urlContextMetadata?: UrlContextMetadata;
  }>;
}
```

### Example Response

```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "... \n"
          }
        ],
        "role": "model"
      },
      "url_context_metadata": {
        "url_metadata": [
          {
            "retrieved_url": "https://www.foodnetwork.com/recipes/ina-garten/perfect-roast-chicken-recipe-1940592",
            "url_retrieval_status": "URL_RETRIEVAL_STATUS_SUCCESS"
          },
          {
            "retrieved_url": "https://www.allrecipes.com/recipe/21151/simple-whole-roast-chicken/",
            "url_retrieval_status": "URL_RETRIEVAL_STATUS_SUCCESS"
          }
        ]
      }
    }
  ]
}
```

## Combining with Other Tools

### Grounding with Google Search

When both URL context and Grounding with Google Search are enabled, the model can use search capabilities to find relevant information online and then use the URL context tool for in-depth understanding of specific pages.

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      "Give me three day events schedule based on https://example.com/event. Also let me know what needs to be taken care of considering weather and commute.",
    ],
    config: {
      tools: [
        { urlContext: {} },
        { googleSearch: {} }
      ],
    },
  });
  
  console.log(response.text);
  
  // Get URLs retrieved for context
  console.log(response.candidates[0].urlContextMetadata);
}

await main();
```

### With Structured Output

Combine URL context with structured output for extracting specific data:

```typescript
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const recipeSchema = z.object({
  name: z.string(),
  prepTime: z.string(),
  cookTime: z.string(),
  ingredients: z.array(z.string()),
  mainIngredient: z.string(),
});

async function extractRecipeData(url: string) {
  const ai = new GoogleGenAI({});
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [`Extract the recipe information from ${url}`],
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: "application/json",
      responseJsonSchema: zodToJsonSchema(recipeSchema),
    },
  });
  
  const recipe = recipeSchema.parse(JSON.parse(response.text));
  return recipe;
}
```

## Safety Checks

The system performs content moderation checks on URLs to confirm they meet safety standards. If a URL fails this check, you'll receive a `url_retrieval_status` of `URL_RETRIEVAL_STATUS_UNSAFE`.

### Handling Safety Failures

```typescript
function checkUrlRetrievalStatus(response: UrlContextResponse): void {
  const metadata = response.candidates[0]?.urlContextMetadata;
  
  if (!metadata) {
    console.log("No URL context metadata available");
    return;
  }

  metadata.url_metadata.forEach(urlMeta => {
    switch (urlMeta.url_retrieval_status) {
      case "URL_RETRIEVAL_STATUS_SUCCESS":
        console.log(`✓ Successfully retrieved: ${urlMeta.retrieved_url}`);
        break;
      case "URL_RETRIEVAL_STATUS_UNSAFE":
        console.warn(`⚠ URL failed safety check: ${urlMeta.retrieved_url}`);
        break;
      case "URL_RETRIEVAL_STATUS_FAILED":
        console.error(`✗ Failed to retrieve: ${urlMeta.retrieved_url}`);
        break;
      default:
        console.log(`? Unknown status for: ${urlMeta.retrieved_url}`);
    }
  });
}
```

## Token Count

Content retrieved from URLs counts as **input tokens**. You can see token count details in the `usage_metadata` object:

```typescript
interface UsageMetadata {
  candidates_token_count: number;
  prompt_token_count: number;
  prompt_tokens_details: Array<{
    modality: string;
    token_count: number;
  }>;
  thoughts_token_count?: number;
  tool_use_prompt_token_count: number;
  tool_use_prompt_tokens_details: Array<{
    modality: string;
    token_count: number;
  }>;
  total_token_count: number;
}
```

### Example Usage Metadata

```json
{
  "usage_metadata": {
    "candidates_token_count": 45,
    "prompt_token_count": 27,
    "prompt_tokens_details": [
      {
        "modality": "TEXT",
        "token_count": 27
      }
    ],
    "thoughts_token_count": 31,
    "tool_use_prompt_token_count": 10309,
    "tool_use_prompt_tokens_details": [
      {
        "modality": "TEXT",
        "token_count": 10309
      }
    ],
    "total_token_count": 10412
  }
}
```

### Monitoring Token Usage

```typescript
function logTokenUsage(response: any): void {
  const usage = response.usageMetadata;
  
  if (!usage) {
    console.log("No usage metadata available");
    return;
  }

  console.log("\n📊 Token Usage:");
  console.log(`  Prompt tokens: ${usage.prompt_token_count}`);
  console.log(`  Tool use tokens: ${usage.tool_use_prompt_token_count}`);
  console.log(`  Response tokens: ${usage.candidates_token_count}`);
  console.log(`  Total tokens: ${usage.total_token_count}`);
  
  // Estimate cost (example: $0.075 per 1M input tokens for Gemini 2.5 Flash)
  const estimatedCost = (usage.total_token_count / 1_000_000) * 0.075;
  console.log(`  Estimated cost: $${estimatedCost.toFixed(6)}`);
}
```

## Supported Models

- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-live-2.5-flash-preview`
- `gemini-2.0-flash-live-001`

## Best Practices

### 1. Provide Specific URLs

For best results, provide **direct URLs** to the content you want analyzed. The model only retrieves content from URLs you provide, not nested links.

```typescript
// Good: Direct URL to specific content
const url = "https://github.com/user/repo/blob/main/README.md";

// Less effective: Generic URL
const url = "https://github.com/user/repo";
```

### 2. Check for Accessibility

Verify URLs don't lead to pages requiring login or behind paywalls:

```typescript
const accessibleUrls = [
  "https://example.com/public-article",  // ✓ Good
  "https://arxiv.org/abs/2401.12345",    // ✓ Good
];

const problematicUrls = [
  "https://medium.com/premium-article",   // ✗ Paywall
  "https://docs.google.com/document/...", // ✗ Requires auth
];
```

### 3. Use Complete URLs

Always provide the full URL including protocol:

```typescript
// ✓ Correct
const url = "https://www.google.com";

// ✗ Incorrect
const url = "google.com";
```

### 4. Validate URLs Before Sending

```typescript
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function generateWithUrlContext(urls: string[], prompt: string) {
  const validUrls = urls.filter(isValidUrl);
  
  if (validUrls.length === 0) {
    throw new Error("No valid URLs provided");
  }

  const ai = new GoogleGenAI({});
  
  const urlsText = validUrls.join(", ");
  const fullPrompt = `${prompt}\n\nURLs to analyze: ${urlsText}`;

  return await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [fullPrompt],
    config: {
      tools: [{ urlContext: {} }],
    },
  });
}
```

### 5. Handle Retrieval Failures Gracefully

```typescript
async function robustUrlContextGeneration(
  urls: string[],
  prompt: string
): Promise<string> {
  const ai = new GoogleGenAI({});
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [`${prompt}\n\nAnalyze: ${urls.join(", ")}`],
    config: {
      tools: [{ urlContext: {} }],
    },
  });

  const metadata = response.candidates[0]?.urlContextMetadata;
  
  if (metadata) {
    const failedUrls = metadata.url_metadata
      .filter(m => m.url_retrieval_status !== "URL_RETRIEVAL_STATUS_SUCCESS")
      .map(m => m.retrieved_url);
    
    if (failedUrls.length > 0) {
      console.warn(`⚠ Failed to retrieve ${failedUrls.length} URL(s):`);
      failedUrls.forEach(url => console.warn(`  - ${url}`));
    }
  }

  return response.text;
}
```

## Limitations

### Request Limits

- **Maximum URLs per request**: 20 URLs
- **Maximum content size per URL**: 34MB

### Supported Content Types

The tool can extract content from URLs with these content types:

**Text formats:**
- `text/html`
- `application/json`
- `text/plain`
- `text/xml`
- `text/css`
- `text/javascript`
- `text/csv`
- `text/rtf`

**Image formats:**
- `image/png`
- `image/jpeg`
- `image/bmp`
- `image/webp`

**Document formats:**
- `application/pdf`

### Unsupported Content Types

The following are **not supported**:

- ❌ Paywalled content
- ❌ YouTube videos (use video understanding feature instead)
- ❌ Google Workspace files (Google Docs, Sheets, etc.)
- ❌ Video files
- ❌ Audio files

### Content Type Checker

```typescript
const supportedContentTypes = new Set([
  "text/html",
  "application/json",
  "text/plain",
  "text/xml",
  "text/css",
  "text/javascript",
  "text/csv",
  "text/rtf",
  "image/png",
  "image/jpeg",
  "image/bmp",
  "image/webp",
  "application/pdf",
]);

async function checkUrlContentType(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentType = response.headers.get("content-type");
    
    if (!contentType) {
      console.warn(`No content-type header for ${url}`);
      return false;
    }

    const baseType = contentType.split(";")[0].trim();
    const isSupported = supportedContentTypes.has(baseType);
    
    if (!isSupported) {
      console.warn(`Unsupported content-type: ${baseType} for ${url}`);
    }
    
    return isSupported;
  } catch (error) {
    console.error(`Error checking ${url}:`, error);
    return false;
  }
}
```

### Pricing Considerations

Content retrieved from URLs counts as **input tokens**. Rate limits and pricing are based on the model used.

```typescript
interface CostEstimator {
  modelPricing: {
    [model: string]: {
      inputPer1M: number;
      outputPer1M: number;
    };
  };
}

const costEstimator: CostEstimator = {
  modelPricing: {
    "gemini-2.5-flash": {
      inputPer1M: 0.075,  // $0.075 per 1M input tokens
      outputPer1M: 0.30,  // $0.30 per 1M output tokens
    },
    "gemini-2.5-pro": {
      inputPer1M: 1.25,   // $1.25 per 1M input tokens
      outputPer1M: 5.00,  // $5.00 per 1M output tokens
    },
  },
};

function estimateRequestCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = costEstimator.modelPricing[model];
  
  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  
  return inputCost + outputCost;
}
```

## Complete Examples

### Example 1: Compare Multiple Documents

```typescript
import { GoogleGenAI } from "@google/genai";

interface DocumentComparison {
  summary: string;
  differences: string[];
  similarities: string[];
  urlsAnalyzed: string[];
}

async function compareDocuments(urls: string[]): Promise<DocumentComparison> {
  if (urls.length > 20) {
    throw new Error("Maximum 20 URLs allowed per request");
  }

  const ai = new GoogleGenAI({});
  
  const prompt = `
  Compare the documents at the following URLs:
  ${urls.map((url, i) => `${i + 1}. ${url}`).join("\n")}
  
  Provide:
  1. A summary of each document
  2. Key differences between the documents
  3. Common themes or similarities
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [prompt],
    config: {
      tools: [{ urlContext: {} }],
    },
  });

  // Check which URLs were successfully retrieved
  const metadata = response.candidates[0]?.urlContextMetadata;
  const successfulUrls = metadata?.url_metadata
    .filter(m => m.url_retrieval_status === "URL_RETRIEVAL_STATUS_SUCCESS")
    .map(m => m.retrieved_url) || [];

  return {
    summary: response.text,
    differences: [], // Parse from response text
    similarities: [], // Parse from response text
    urlsAnalyzed: successfulUrls,
  };
}

// Usage
const urls = [
  "https://example.com/report-2023.pdf",
  "https://example.com/report-2024.pdf",
];

const comparison = await compareDocuments(urls);
console.log(comparison);
```

### Example 2: Extract Data from Multiple Sources

```typescript
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const productDataSchema = z.object({
  products: z.array(z.object({
    name: z.string(),
    price: z.number(),
    source: z.string(),
    inStock: z.boolean(),
  })),
});

async function extractProductData(urls: string[]) {
  const ai = new GoogleGenAI({});
  
  const prompt = `
  Extract product information from the following URLs:
  ${urls.join("\n")}
  
  For each product found, include:
  - Product name
  - Current price
  - Source URL
  - Stock availability
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [prompt],
    config: {
      tools: [{ urlContext: {} }],
      responseMimeType: "application/json",
      responseJsonSchema: zodToJsonSchema(productDataSchema),
    },
  });

  const data = productDataSchema.parse(JSON.parse(response.text));
  
  // Log token usage
  console.log(`\nTokens used: ${response.usageMetadata?.total_token_count || 0}`);
  
  return data;
}
```

### Example 3: Analyze GitHub Repository

```typescript
import { GoogleGenAI } from "@google/genai";

interface RepoAnalysis {
  description: string;
  techStack: string[];
  setupInstructions: string;
  keyFiles: string[];
}

async function analyzeGitHubRepo(repoUrl: string): Promise<RepoAnalysis> {
  const ai = new GoogleGenAI({});
  
  // Construct URLs for key repository files
  const urls = [
    `${repoUrl}`,
    `${repoUrl}/blob/main/README.md`,
    `${repoUrl}/blob/main/package.json`,
  ].filter(url => url.includes("github.com"));

  const prompt = `
  Analyze the GitHub repository at ${repoUrl}
  
  Provide:
  1. Brief description of what the project does
  2. Technology stack used
  3. Setup/installation instructions
  4. List of key files and their purposes
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [prompt],
    config: {
      tools: [{ urlContext: {} }],
    },
  });

  // Parse the response (in production, use structured output)
  return {
    description: response.text,
    techStack: [],
    setupInstructions: "",
    keyFiles: [],
  };
}
```

### Example 4: URL Context with Search for Research

```typescript
import { GoogleGenAI } from "@google/genai";

interface ResearchReport {
  summary: string;
  keyFindings: string[];
  sources: Array<{
    url: string;
    status: string;
  }>;
  searchQueries: string[];
}

async function generateResearchReport(
  topic: string,
  referenceUrls: string[]
): Promise<ResearchReport> {
  const ai = new GoogleGenAI({});
  
  const prompt = `
  Create a comprehensive research report on: ${topic}
  
  Reference these specific sources:
  ${referenceUrls.join("\n")}
  
  Also search for additional recent information to supplement the report.
  
  Include:
  1. Executive summary
  2. Key findings from the reference sources
  3. Recent developments found through search
  4. Conclusion and implications
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [prompt],
    config: {
      tools: [
        { urlContext: {} },
        { googleSearch: {} }
      ],
    },
  });

  const urlMetadata = response.candidates[0]?.urlContextMetadata;
  const groundingMetadata = response.candidates[0]?.groundingMetadata;

  return {
    summary: response.text,
    keyFindings: [], // Parse from response
    sources: urlMetadata?.url_metadata.map(m => ({
      url: m.retrieved_url,
      status: m.url_retrieval_status,
    })) || [],
    searchQueries: groundingMetadata?.webSearchQueries || [],
  };
}

// Usage
const report = await generateResearchReport(
  "Machine Learning in Healthcare",
  [
    "https://www.nature.com/articles/s41591-020-0842-6",
    "https://arxiv.org/abs/2304.12345",
  ]
);

console.log("📊 Research Report Generated");
console.log(`\n📄 Summary:\n${report.summary}`);
console.log(`\n🔍 Search queries used: ${report.searchQueries.join(", ")}`);
console.log(`\n📚 Sources analyzed: ${report.sources.length}`);
```

## Error Handling

### Comprehensive Error Handler

```typescript
class UrlContextError extends Error {
  constructor(
    message: string,
    public failedUrls: string[],
    public cause?: Error
  ) {
    super(message);
    this.name = "UrlContextError";
  }
}

async function safeUrlContextGeneration(
  urls: string[],
  prompt: string
): Promise<string> {
  // Validate input
  if (urls.length === 0) {
    throw new UrlContextError("No URLs provided", []);
  }

  if (urls.length > 20) {
    throw new UrlContextError(
      "Too many URLs (max 20)",
      urls.slice(20)
    );
  }

  const validUrls = urls.filter(isValidUrl);
  if (validUrls.length === 0) {
    throw new UrlContextError("No valid URLs provided", urls);
  }

  const ai = new GoogleGenAI({});

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [`${prompt}\n\nAnalyze: ${validUrls.join(", ")}`],
      config: {
        tools: [{ urlContext: {} }],
      },
    });

    // Check for retrieval failures
    const metadata = response.candidates[0]?.urlContextMetadata;
    if (metadata) {
      const failedUrls = metadata.url_metadata
        .filter(m => m.url_retrieval_status !== "URL_RETRIEVAL_STATUS_SUCCESS")
        .map(m => m.retrieved_url);

      if (failedUrls.length > 0) {
        console.warn(`⚠ ${failedUrls.length} URL(s) failed to retrieve`);
      }
    }

    return response.text;
  } catch (error) {
    throw new UrlContextError(
      "Failed to generate content with URL context",
      validUrls,
      error instanceof Error ? error : undefined
    );
  }
}
```

## Summary

The URL Context tool transforms Gemini into a powerful document analysis system that can:

- Access and analyze content from multiple URLs simultaneously
- Extract specific data from web pages, PDFs, and images
- Compare documents and identify patterns across sources
- Combine with search capabilities for comprehensive research

By leveraging TypeScript's type system and proper error handling, you can build robust applications that intelligently process web content. Always validate URLs, monitor token usage, and handle retrieval failures gracefully for production deployments.