# Gemini Grounding with Google Search Skill

## Overview

Grounding with Google Search connects the Gemini model to real-time web content and works with all available languages. This allows Gemini to provide more accurate answers and cite verifiable sources beyond its knowledge cutoff.

Grounding helps you build applications that can:

- **Increase factual accuracy**: Reduce model hallucinations by basing responses on real-world information
- **Access real-time information**: Answer questions about recent events and topics
- **Provide citations**: Build user trust by showing the sources for the model's claims

## TypeScript Implementation

### Setup

Install required dependency:

```bash
pnpm install @google/genai
```

### Basic Usage

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const groundingTool = {
  googleSearch: {},
};

const config = {
  tools: [groundingTool],
};

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Who won the euro 2024?",
  config,
});

console.log(response.text);
```

## How Grounding with Google Search Works

The model handles the entire workflow automatically:

1. **User Prompt**: Your application sends a user's prompt to the Gemini API with the `google_search` tool enabled

2. **Prompt Analysis**: The model analyzes the prompt and determines if a Google Search can improve the answer

3. **Google Search**: If needed, the model automatically generates one or multiple search queries and executes them

4. **Search Results Processing**: The model processes the search results, synthesizes the information, and formulates a response

5. **Grounded Response**: The API returns a final, user-friendly response that is grounded in the search results, including the model's text answer and `groundingMetadata` with search queries, web results, and citations

## Understanding the Grounding Response

When a response is successfully grounded, it includes a `groundingMetadata` field with structured citation data.

### Response Structure

```typescript
interface GroundingMetadata {
  webSearchQueries: string[];
  searchEntryPoint?: {
    renderedContent: string; // HTML and CSS for search widget
  };
  groundingChunks: Array<{
    web: {
      uri: string;
      title: string;
    };
  }>;
  groundingSupports: Array<{
    segment: {
      startIndex: number;
      endIndex: number;
      text: string;
    };
    groundingChunkIndices: number[];
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
            "text": "Spain won Euro 2024, defeating England 2-1 in the final. This victory marks Spain's record fourth European Championship title."
          }
        ],
        "role": "model"
      },
      "groundingMetadata": {
        "webSearchQueries": ["UEFA Euro 2024 winner", "who won euro 2024"],
        "searchEntryPoint": {
          "renderedContent": "<!-- HTML and CSS for the search widget -->"
        },
        "groundingChunks": [
          {
            "web": {
              "uri": "https://vertexaisearch.cloud.google.com.....",
              "title": "aljazeera.com"
            }
          },
          {
            "web": {
              "uri": "https://vertexaisearch.cloud.google.com.....",
              "title": "uefa.com"
            }
          }
        ],
        "groundingSupports": [
          {
            "segment": {
              "startIndex": 0,
              "endIndex": 85,
              "text": "Spain won Euro 2024, defeatin..."
            },
            "groundingChunkIndices": [0]
          },
          {
            "segment": {
              "startIndex": 86,
              "endIndex": 210,
              "text": "This victory marks Spain's..."
            },
            "groundingChunkIndices": [0, 1]
          }
        ]
      }
    }
  ]
}
```

### Metadata Fields Explained

- **webSearchQueries**: Array of search queries used. Useful for debugging and understanding the model's reasoning process

- **searchEntryPoint**: Contains HTML and CSS to render required Search Suggestions (see Terms of Service for usage requirements)

- **groundingChunks**: Array of objects containing web sources (uri and title)

- **groundingSupports**: Array of chunks connecting model response text to sources in `groundingChunks`. Each chunk links a text segment (defined by `startIndex` and `endIndex`) to one or more `groundingChunkIndices`

## Attributing Sources with Inline Citations

The API returns structured citation data, giving you complete control over how you display sources in your UI. Use `groundingSupports` and `groundingChunks` to link statements directly to their sources.

### TypeScript Implementation

```typescript
interface GroundedResponse {
  text: string;
  candidates: Array<{
    groundingMetadata?: {
      groundingSupports: Array<{
        segment?: {
          startIndex?: number;
          endIndex?: number;
          text?: string;
        };
        groundingChunkIndices?: number[];
      }>;
      groundingChunks: Array<{
        web?: {
          uri?: string;
          title?: string;
        };
      }>;
    };
  }>;
}

function addCitations(response: GroundedResponse): string {
  let text = response.text;
  const supports = response.candidates[0]?.groundingMetadata?.groundingSupports;
  const chunks = response.candidates[0]?.groundingMetadata?.groundingChunks;

  if (!supports || !chunks) {
    return text;
  }

  // Sort supports by endIndex in descending order to avoid shifting issues when inserting
  const sortedSupports = [...supports].sort(
    (a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0),
  );

  for (const support of sortedSupports) {
    const endIndex = support.segment?.endIndex;
    if (endIndex === undefined || !support.groundingChunkIndices?.length) {
      continue;
    }

    const citationLinks = support.groundingChunkIndices
      .map((i) => {
        const uri = chunks[i]?.web?.uri;
        if (uri) {
          return `[${i + 1}](${uri})`;
        }
        return null;
      })
      .filter(Boolean);

    if (citationLinks.length > 0) {
      const citationString = citationLinks.join(", ");
      text = text.slice(0, endIndex) + citationString + text.slice(endIndex);
    }
  }

  return text;
}

// Usage
const textWithCitations = addCitations(response);
console.log(textWithCitations);
```

### Example Output with Citations

```
Spain won Euro 2024, defeating England 2-1 in the final.[1](https:/...), [2](https:/...), [4](https:/...), [5](https:/...) This victory marks Spain's record-breaking fourth European Championship title.[5](https:/...), [2](https:/...), [3](https:/...), [4](https:/...)
```

## Advanced Citation Formatting

### HTML Citation Formatter

```typescript
interface Citation {
  url: string;
  title: string;
  index: number;
}

function addHTMLCitations(response: GroundedResponse): string {
  let text = response.text;
  const supports = response.candidates[0]?.groundingMetadata?.groundingSupports;
  const chunks = response.candidates[0]?.groundingMetadata?.groundingChunks;

  if (!supports || !chunks) {
    return text;
  }

  const sortedSupports = [...supports].sort(
    (a, b) => (b.segment?.endIndex ?? 0) - (a.segment?.endIndex ?? 0),
  );

  for (const support of sortedSupports) {
    const endIndex = support.segment?.endIndex;
    if (endIndex === undefined || !support.groundingChunkIndices?.length) {
      continue;
    }

    const citations: Citation[] = support.groundingChunkIndices
      .map((i) => {
        const chunk = chunks[i];
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (uri) {
          return { url: uri, title: title || "Source", index: i + 1 };
        }
        return null;
      })
      .filter((c): c is Citation => c !== null);

    if (citations.length > 0) {
      const citationHTML = citations
        .map(
          (c) =>
            `<sup><a href="${c.url}" title="${c.title}">[${c.index}]</a></sup>`,
        )
        .join("");
      text = text.slice(0, endIndex) + citationHTML + text.slice(endIndex);
    }
  }

  return text;
}
```

### Extract All Sources

```typescript
interface Source {
  index: number;
  url: string;
  title: string;
}

function extractSources(response: GroundedResponse): Source[] {
  const chunks = response.candidates[0]?.groundingMetadata?.groundingChunks;

  if (!chunks) {
    return [];
  }

  return chunks
    .map((chunk, index) => ({
      index: index + 1,
      url: chunk.web?.uri || "",
      title: chunk.web?.title || "Unknown Source",
    }))
    .filter((source) => source.url !== "");
}

// Usage: Display sources at the end of the response
const sources = extractSources(response);
console.log("\nSources:");
sources.forEach((source) => {
  console.log(`[${source.index}] ${source.title}: ${source.url}`);
});
```

## Combining with URL Context Tool

Grounding with Google Search can be combined with the URL context tool to ground responses in both public web data and specific URLs you provide.

```typescript
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const config = {
  tools: [
    { googleSearch: {} },
    { urlContext: { urls: ["https://example.com/specific-article"] } },
  ],
};

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Compare the information from the article with current market data",
  config,
});

console.log(response.text);
```

## Model Support

| Model                 | Grounding with Google Search |
| --------------------- | ---------------------------- |
| Gemini 2.5 Pro        | ✔️                           |
| Gemini 2.5 Flash      | ✔️                           |
| Gemini 2.5 Flash-Lite | ✔️                           |
| Gemini 2.0 Flash      | ✔️                           |
| Gemini 1.5 Pro        | ✔️                           |
| Gemini 1.5 Flash      | ✔️                           |

**Note**: Older models use a `google_search_retrieval` tool. For all current models, use the `google_search` tool as shown in the examples.

## Supported Tool Combinations

You can use Grounding with Google Search with other tools to power more complex use cases:

- **Code Execution**: Search for information and execute code based on results
- **URL Context**: Combine web search with specific URL content
- **Function Calling**: Search for information, then call functions based on findings

```typescript
const config = {
  tools: [{ googleSearch: {} }, { codeExecution: {} }],
};
```

## Pricing

When you use Grounding with Google Search, your project is billed **per API request** that includes the `google_search` tool.

- If the model executes multiple search queries within a single API call (e.g., searching for "UEFA Euro 2024 winner" and "Spain vs England Euro 2024 final score"), this counts as **a single billable use** of the tool for that request
- The number of search queries executed does not affect the cost per request

For detailed pricing information, see the [Gemini API pricing page](https://ai.google.dev/pricing).

## Legacy Approach: Gemini 1.5 Models

While the `google_search` tool is recommended for Gemini 2.0 and later, Gemini 1.5 supports a legacy tool named `google_search_retrieval`. This tool provides a **dynamic mode** that allows the model to decide whether to perform a search based on its confidence.

### Dynamic Threshold Configuration

```typescript
import { GoogleGenAI, DynamicRetrievalConfigMode } from "@google/genai";

const ai = new GoogleGenAI({});

const retrievalTool = {
  googleSearchRetrieval: {
    dynamicRetrievalConfig: {
      mode: DynamicRetrievalConfigMode.MODE_DYNAMIC,
      dynamicThreshold: 0.7, // Only search if confidence > 70%
    },
  },
};

const config = {
  tools: [retrievalTool],
};

const response = await ai.models.generateContent({
  model: "gemini-1.5-flash",
  contents: "Who won the euro 2024?",
  config,
});

console.log(response.text);

if (!response.candidates?.[0]?.groundingMetadata) {
  console.log("\nModel answered from its own knowledge.");
}
```

### Dynamic Threshold Explained

The `dynamicThreshold` is a value between 0.0 and 1.0:

- **Higher threshold (e.g., 0.9)**: Model only searches when very uncertain → fewer searches, more reliance on training data
- **Lower threshold (e.g., 0.3)**: Model searches more frequently → more up-to-date information, higher API costs
- **Recommended starting point**: 0.7 provides a good balance

## Best Practices

### 1. Check for Grounding Metadata

Always verify if the response was grounded before attempting to extract citations:

```typescript
async function getGroundedResponse(prompt: string) {
  const ai = new GoogleGenAI({});

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

  if (groundingMetadata) {
    console.log("Response is grounded in search results");
    console.log(
      `Search queries used: ${groundingMetadata.webSearchQueries?.join(", ")}`,
    );
  } else {
    console.log("Response based on model's training data");
  }

  return response;
}
```

### 2. Handle Missing Citations Gracefully

Not all parts of a response may be grounded. Handle cases where grounding data is incomplete:

```typescript
function safeAddCitations(response: GroundedResponse): string {
  try {
    const text = response.text;
    const metadata = response.candidates[0]?.groundingMetadata;

    if (!metadata?.groundingSupports || !metadata?.groundingChunks) {
      console.warn("No grounding metadata available");
      return text;
    }

    return addCitations(response);
  } catch (error) {
    console.error("Error adding citations:", error);
    return response.text;
  }
}
```

### 3. Provide Context for Better Search Results

Give the model enough context to generate effective search queries:

```typescript
// Less effective
const prompt = "Who won?";

// More effective
const prompt = "Who won the UEFA Euro 2024 football championship?";

// Most effective with context
const prompt = `
Based on the latest information available, who won the UEFA Euro 2024 
football championship? Please include the final score and any notable 
details about the match.
`;
```

### 4. Cache Search Results for Repeated Queries

For applications with repeated queries, consider caching results:

```typescript
interface CachedResponse {
  text: string;
  groundingMetadata?: GroundingMetadata;
  timestamp: number;
}

class GroundedSearchCache {
  private cache = new Map<string, CachedResponse>();
  private ttl = 3600000; // 1 hour in milliseconds

  async getGroundedResponse(prompt: string): Promise<GroundedResponse> {
    const cached = this.cache.get(prompt);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log("Returning cached response");
      return cached as GroundedResponse;
    }

    const ai = new GoogleGenAI({});
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    this.cache.set(prompt, {
      text: response.text,
      groundingMetadata: response.candidates[0]?.groundingMetadata,
      timestamp: Date.now(),
    });

    return response;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### 5. Type Safety with TypeScript

Define comprehensive types for grounding responses:

```typescript
interface WebSource {
  uri: string;
  title: string;
}

interface GroundingChunk {
  web?: WebSource;
}

interface TextSegment {
  startIndex?: number;
  endIndex?: number;
  text?: string;
}

interface GroundingSupport {
  segment?: TextSegment;
  groundingChunkIndices?: number[];
}

interface GroundingMetadata {
  webSearchQueries?: string[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
}

interface GroundedCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
    role?: string;
  };
  groundingMetadata?: GroundingMetadata;
}

interface GroundedResponse {
  text: string;
  candidates?: GroundedCandidate[];
}
```

### 6. Display Search Queries for Transparency

Show users what search queries were used:

```typescript
function displaySearchProcess(response: GroundedResponse): void {
  const queries = response.candidates[0]?.groundingMetadata?.webSearchQueries;

  if (queries && queries.length > 0) {
    console.log("🔍 Searches performed:");
    queries.forEach((query, index) => {
      console.log(`  ${index + 1}. "${query}"`);
    });
    console.log();
  }
}
```

## Complete Example: News Summary with Citations

```typescript
import { GoogleGenAI } from "@google/genai";

interface NewsResponse {
  summary: string;
  citations: string;
  sources: Array<{
    index: number;
    title: string;
    url: string;
  }>;
  searchQueries: string[];
}

async function getNewsSummaryWithCitations(
  topic: string,
): Promise<NewsResponse> {
  const ai = new GoogleGenAI({});

  const prompt = `
  Provide a comprehensive summary of the latest news about: ${topic}
  
  Include:
  - Key recent developments
  - Important facts and figures
  - Expert opinions or statements
  
  Please be factual and cite your sources.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const metadata = response.candidates[0]?.groundingMetadata;

  if (!metadata) {
    return {
      summary: response.text,
      citations: response.text,
      sources: [],
      searchQueries: [],
    };
  }

  // Extract sources
  const sources = (metadata.groundingChunks || [])
    .map((chunk, index) => ({
      index: index + 1,
      title: chunk.web?.title || "Unknown",
      url: chunk.web?.uri || "",
    }))
    .filter((s) => s.url !== "");

  // Add citations
  const citations = addCitations(response);

  return {
    summary: response.text,
    citations,
    sources,
    searchQueries: metadata.webSearchQueries || [],
  };
}

// Usage
async function main() {
  const topic = "artificial intelligence developments in 2025";
  const result = await getNewsSummaryWithCitations(topic);

  console.log("📰 NEWS SUMMARY\n");
  console.log(result.citations);
  console.log("\n📚 SOURCES\n");

  result.sources.forEach((source) => {
    console.log(`[${source.index}] ${source.title}`);
    console.log(`    ${source.url}\n`);
  });

  console.log("🔍 SEARCH QUERIES USED\n");
  result.searchQueries.forEach((query, index) => {
    console.log(`${index + 1}. "${query}"`);
  });
}

main();
```

## Error Handling

```typescript
async function safeGroundedSearch(prompt: string): Promise<string> {
  const ai = new GoogleGenAI({});

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return response.text;
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error during grounded search:", error.message);

      // Retry without grounding if search fails
      try {
        console.log("Retrying without search grounding...");
        const fallbackResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        console.warn("⚠️ Response generated without search grounding");
        return fallbackResponse.text;
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        throw fallbackError;
      }
    }
    throw error;
  }
}
```

## Summary

Grounding with Google Search transforms Gemini into a real-time information retrieval system that can:

- Access current information beyond the model's training data
- Provide verifiable sources for claims
- Reduce hallucinations through factual grounding

By leveraging TypeScript's type system and the structured grounding metadata, you can build robust applications that present information transparently with proper attribution. Always handle cases where grounding may not be available and implement appropriate caching strategies for production use.
