# Gemini Embeddings Skill

## Overview

The Gemini API offers text embedding models to generate embeddings for words, phrases, sentences, and code. These foundational embeddings power advanced NLP tasks such as semantic search, classification, and clustering, providing more accurate, context-aware results than keyword-based approaches.

**Key Use Case**: Building **Retrieval Augmented Generation (RAG)** systems. Embeddings efficiently retrieve relevant information from knowledge bases, which are then passed as additional context to language models, generating more informed and accurate responses.

## TypeScript Implementation

### Setup

Install required dependencies:

```bash
pnpm install @google/genai
```

For similarity calculations:

```bash
pnpm install compute-cosine-similarity
```

### Basic Usage: Generate Single Embedding

```typescript
import { GoogleGenAI } from "@google/genai";

async function generateEmbedding() {
  const ai = new GoogleGenAI({});

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: "What is the meaning of life?",
  });

  console.log("Embedding:", response.embeddings);
  console.log("Dimension:", response.embeddings[0].values.length);
}

generateEmbedding();
```

### Generate Multiple Embeddings

Generate embeddings for multiple chunks at once:

```typescript
import { GoogleGenAI } from "@google/genai";

async function generateBatchEmbeddings() {
  const ai = new GoogleGenAI({});

  const texts = [
    "What is the meaning of life?",
    "What is the purpose of existence?",
    "How do I bake a cake?",
  ];

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
  });

  console.log(`Generated ${response.embeddings.length} embeddings`);

  response.embeddings.forEach((embedding, index) => {
    console.log(`Text ${index + 1}: ${texts[index]}`);
    console.log(`Embedding length: ${embedding.values.length}`);
    console.log(`First 5 values: ${embedding.values.slice(0, 5)}`);
  });
}

generateBatchEmbeddings();
```

## Response Structure

```typescript
interface EmbeddingResponse {
  embeddings: Array<{
    values: number[]; // The embedding vector
  }>;
}

interface Embedding {
  values: number[];
}
```

## Task Types

Specifying the right task type helps optimize embeddings for intended relationships, maximizing accuracy and efficiency.

### Supported Task Types

| Task Type              | Description                     | Examples                                                  |
| ---------------------- | ------------------------------- | --------------------------------------------------------- |
| `SEMANTIC_SIMILARITY`  | Assess text similarity          | Recommendation systems, duplicate detection               |
| `CLASSIFICATION`       | Classify texts by preset labels | Sentiment analysis, spam detection                        |
| `CLUSTERING`           | Cluster texts by similarities   | Document organization, market research, anomaly detection |
| `RETRIEVAL_DOCUMENT`   | Document search optimization    | Indexing articles, books, or web pages                    |
| `RETRIEVAL_QUERY`      | General search queries          | Custom search (use with RETRIEVAL_DOCUMENT)               |
| `CODE_RETRIEVAL_QUERY` | Code search by natural language | Code suggestions and search (use with RETRIEVAL_DOCUMENT) |
| `QUESTION_ANSWERING`   | Q&A system questions            | Chatbox (use with RETRIEVAL_DOCUMENT)                     |
| `FACT_VERIFICATION`    | Verify statements               | Automated fact-checking (use with RETRIEVAL_DOCUMENT)     |

### Example: Semantic Similarity

```typescript
import { GoogleGenAI } from "@google/genai";
import * as cosineSimilarity from "compute-cosine-similarity";

async function compareTextSimilarity() {
  const ai = new GoogleGenAI({});

  const texts = [
    "What is the meaning of life?",
    "What is the purpose of existence?",
    "How do I bake a cake?",
  ];

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
    taskType: "SEMANTIC_SIMILARITY",
  });

  const embeddings = response.embeddings.map((e) => e.values);

  console.log("\nSemantic Similarity Matrix:\n");

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const text1 = texts[i];
      const text2 = texts[j];
      const similarity = cosineSimilarity(embeddings[i], embeddings[j]);
      console.log(
        `"${text1}"\nvs\n"${text2}"\nSimilarity: ${similarity.toFixed(4)}\n`,
      );
    }
  }
}

compareTextSimilarity();
```

**Example Output:**

```
Semantic Similarity Matrix:

"What is the meaning of life?"
vs
"What is the purpose of existence?"
Similarity: 0.9481

"What is the meaning of life?"
vs
"How do I bake a cake?"
Similarity: 0.7471

"What is the purpose of existence?"
vs
"How do I bake a cake?"
Similarity: 0.7371
```

**Note**: Cosine similarity ranges from -1 (opposite) to 1 (greatest similarity). It focuses on direction rather than magnitude, accurately reflecting conceptual closeness.

## Controlling Embedding Size

The Gemini embedding model uses **Matryoshka Representation Learning (MRL)**, which produces embeddings where smaller prefixes retain quality. Use the `outputDimensionality` parameter to control output size.

### Benefits of Smaller Dimensions

- **Storage savings**: Reduced memory footprint
- **Computational efficiency**: Faster processing in downstream tasks
- **Minimal quality loss**: MRL ensures smaller dimensions retain semantic meaning

**Recommended dimensions**: 768, 1536, or 3072 (default)

### Example: Custom Dimension

```typescript
import { GoogleGenAI } from "@google/genai";

async function generateWithCustomDimension() {
  const ai = new GoogleGenAI({});

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: "What is the meaning of life?",
    outputDimensionality: 768,
  });

  const embeddingLength = response.embeddings[0].values.length;
  console.log(`Length of embedding: ${embeddingLength}`);
}

generateWithCustomDimension();
```

**Output:**

```
Length of embedding: 768
```

## Normalization for Smaller Dimensions

The 3072-dimension embedding is normalized by default. For other dimensions (768, 1536), normalize embeddings manually for accurate semantic similarity:

```typescript
function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0),
  );

  return embedding.map((val) => val / magnitude);
}

async function generateNormalizedEmbedding() {
  const ai = new GoogleGenAI({});

  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: "What is the meaning of life?",
    outputDimensionality: 768,
  });

  const embeddingValues = response.embeddings[0].values;
  const normalized = normalizeEmbedding(embeddingValues);

  // Verify normalization
  const norm = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));

  console.log(`Normalized embedding length: ${normalized.length}`);
  console.log(`Norm of normalized embedding: ${norm.toFixed(6)}`); // Should be 1.000000
}

generateNormalizedEmbedding();
```

### MTEB Benchmark Scores by Dimension

| MRL Dimension | MTEB Score |
| ------------- | ---------- |
| 2048          | 68.16      |
| 1536          | 68.17      |
| 768           | 67.99      |
| 512           | 67.55      |
| 256           | 66.19      |
| 128           | 63.31      |

**Key Insight**: Performance is not strictly tied to dimension size. Lower dimensions achieve scores comparable to higher dimensions.

## Complete Use Cases

### Use Case 1: Semantic Search

```typescript
import { GoogleGenAI } from "@google/genai";
import * as cosineSimilarity from "compute-cosine-similarity";

interface Document {
  id: string;
  text: string;
  embedding?: number[];
}

class SemanticSearch {
  private ai: GoogleGenAI;
  private documents: Document[] = [];

  constructor() {
    this.ai = new GoogleGenAI({});
  }

  async indexDocuments(documents: Array<{ id: string; text: string }>) {
    console.log(`Indexing ${documents.length} documents...`);

    const texts = documents.map((doc) => doc.text);

    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: texts,
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 768,
    });

    this.documents = documents.map((doc, index) => ({
      ...doc,
      embedding: normalizeEmbedding(response.embeddings[index].values),
    }));

    console.log("✓ Indexing complete");
  }

  async search(
    query: string,
    topK: number = 5,
  ): Promise<Array<{ id: string; text: string; score: number }>> {
    console.log(`Searching for: "${query}"`);

    // Generate query embedding
    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: query,
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: 768,
    });

    const queryEmbedding = normalizeEmbedding(response.embeddings[0].values);

    // Calculate similarities
    const results = this.documents
      .map((doc) => ({
        id: doc.id,
        text: doc.text,
        score: cosineSimilarity(queryEmbedding, doc.embedding!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results;
  }
}

function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0),
  );
  return embedding.map((val) => val / magnitude);
}

// Usage
async function runSemanticSearch() {
  const search = new SemanticSearch();

  const documents = [
    { id: "1", text: "Python is a high-level programming language." },
    {
      id: "2",
      text: "Machine learning is a subset of artificial intelligence.",
    },
    { id: "3", text: "Neural networks are inspired by the human brain." },
    { id: "4", text: "TypeScript is a typed superset of JavaScript." },
    {
      id: "5",
      text: "React is a JavaScript library for building user interfaces.",
    },
  ];

  await search.indexDocuments(documents);

  const results = await search.search("What are programming languages?", 3);

  console.log("\nTop Results:");
  results.forEach((result, index) => {
    console.log(
      `${index + 1}. [Score: ${result.score.toFixed(4)}] ${result.text}`,
    );
  });
}

runSemanticSearch();
```

### Use Case 2: Text Classification

```typescript
import { GoogleGenAI } from "@google/genai";
import * as cosineSimilarity from "compute-cosine-similarity";

interface Category {
  name: string;
  examples: string[];
  embedding?: number[];
}

class TextClassifier {
  private ai: GoogleGenAI;
  private categories: Category[] = [];

  constructor() {
    this.ai = new GoogleGenAI({});
  }

  async trainCategories(
    categories: Array<{ name: string; examples: string[] }>,
  ) {
    console.log("Training categories...");

    for (const category of categories) {
      // Generate embeddings for examples and average them
      const response = await this.ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: category.examples,
        taskType: "CLASSIFICATION",
        outputDimensionality: 768,
      });

      // Average embeddings of examples
      const avgEmbedding = this.averageEmbeddings(
        response.embeddings.map((e) => normalizeEmbedding(e.values)),
      );

      this.categories.push({
        name: category.name,
        examples: category.examples,
        embedding: avgEmbedding,
      });
    }

    console.log(`✓ Trained ${this.categories.length} categories`);
  }

  private averageEmbeddings(embeddings: number[][]): number[] {
    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dim; i++) {
        avg[i] += embedding[i];
      }
    }

    return avg.map((val) => val / embeddings.length);
  }

  async classify(
    text: string,
  ): Promise<{ category: string; confidence: number }> {
    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      taskType: "CLASSIFICATION",
      outputDimensionality: 768,
    });

    const textEmbedding = normalizeEmbedding(response.embeddings[0].values);

    // Find most similar category
    let bestMatch = { category: "", confidence: -1 };

    for (const category of this.categories) {
      const similarity = cosineSimilarity(textEmbedding, category.embedding!);

      if (similarity > bestMatch.confidence) {
        bestMatch = { category: category.name, confidence: similarity };
      }
    }

    return bestMatch;
  }
}

function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0),
  );
  return embedding.map((val) => val / magnitude);
}

// Usage
async function runClassification() {
  const classifier = new TextClassifier();

  await classifier.trainCategories([
    {
      name: "Technology",
      examples: [
        "New smartphone released with advanced AI features",
        "Software update improves system performance",
        "Cloud computing revolutionizes data storage",
      ],
    },
    {
      name: "Sports",
      examples: [
        "Team wins championship in overtime thriller",
        "Athlete breaks world record at Olympics",
        "Coach announces retirement after stellar career",
      ],
    },
    {
      name: "Politics",
      examples: [
        "New legislation passes in parliament",
        "Presidential candidate announces campaign",
        "International summit addresses climate change",
      ],
    },
  ]);

  const testTexts = [
    "Revolutionary AI model achieves breakthrough in natural language processing",
    "Basketball team secures playoff spot with decisive victory",
    "Government proposes new economic policy reforms",
  ];

  console.log("\nClassification Results:\n");
  for (const text of testTexts) {
    const result = await classifier.classify(text);
    console.log(`Text: "${text}"`);
    console.log(
      `Category: ${result.category} (${(result.confidence * 100).toFixed(2)}% confidence)\n`,
    );
  }
}

runClassification();
```

### Use Case 3: Document Clustering

```typescript
import { GoogleGenAI } from "@google/genai";
import * as cosineSimilarity from "compute-cosine-similarity";

interface ClusteredDocument {
  id: string;
  text: string;
  cluster?: number;
  embedding: number[];
}

class DocumentClusterer {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({});
  }

  async clusterDocuments(
    documents: Array<{ id: string; text: string }>,
    numClusters: number,
  ): Promise<ClusteredDocument[]> {
    console.log(`Generating embeddings for ${documents.length} documents...`);

    // Generate embeddings
    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: documents.map((d) => d.text),
      taskType: "CLUSTERING",
      outputDimensionality: 768,
    });

    const clusteredDocs: ClusteredDocument[] = documents.map((doc, index) => ({
      ...doc,
      embedding: normalizeEmbedding(response.embeddings[index].values),
    }));

    console.log("Performing K-means clustering...");

    // Simple K-means clustering
    const clusters = this.kMeans(
      clusteredDocs.map((d) => d.embedding),
      numClusters,
    );

    clusteredDocs.forEach((doc, index) => {
      doc.cluster = clusters[index];
    });

    return clusteredDocs;
  }

  private kMeans(
    embeddings: number[][],
    k: number,
    maxIterations: number = 100,
  ): number[] {
    const n = embeddings.length;
    const dim = embeddings[0].length;

    // Initialize centroids randomly
    let centroids: number[][] = [];
    const randomIndices = new Set<number>();
    while (randomIndices.size < k) {
      randomIndices.add(Math.floor(Math.random() * n));
    }
    centroids = Array.from(randomIndices).map((i) => [...embeddings[i]]);

    let assignments = new Array(n).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign points to nearest centroid
      const newAssignments = embeddings.map((embedding) => {
        let bestCluster = 0;
        let bestDistance = Infinity;

        for (let c = 0; c < k; c++) {
          const distance = 1 - cosineSimilarity(embedding, centroids[c]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestCluster = c;
          }
        }

        return bestCluster;
      });

      // Check convergence
      if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) {
        break;
      }

      assignments = newAssignments;

      // Update centroids
      for (let c = 0; c < k; c++) {
        const clusterPoints = embeddings.filter((_, i) => assignments[i] === c);

        if (clusterPoints.length > 0) {
          centroids[c] = new Array(dim).fill(0);
          for (const point of clusterPoints) {
            for (let d = 0; d < dim; d++) {
              centroids[c][d] += point[d];
            }
          }
          for (let d = 0; d < dim; d++) {
            centroids[c][d] /= clusterPoints.length;
          }
        }
      }
    }

    return assignments;
  }

  displayClusters(documents: ClusteredDocument[]) {
    const clusterMap = new Map<number, ClusteredDocument[]>();

    for (const doc of documents) {
      if (!clusterMap.has(doc.cluster!)) {
        clusterMap.set(doc.cluster!, []);
      }
      clusterMap.get(doc.cluster!)!.push(doc);
    }

    console.log("\nClustering Results:\n");
    for (const [clusterId, docs] of clusterMap.entries()) {
      console.log(`Cluster ${clusterId + 1} (${docs.length} documents):`);
      docs.forEach((doc) => {
        console.log(`  - ${doc.text}`);
      });
      console.log();
    }
  }
}

function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0),
  );
  return embedding.map((val) => val / magnitude);
}

// Usage
async function runClustering() {
  const clusterer = new DocumentClusterer();

  const documents = [
    { id: "1", text: "Python programming tutorial for beginners" },
    { id: "2", text: "JavaScript web development guide" },
    { id: "3", text: "Machine learning with neural networks" },
    { id: "4", text: "Deep learning for computer vision" },
    { id: "5", text: "React component library documentation" },
    { id: "6", text: "Natural language processing techniques" },
    { id: "7", text: "TypeScript advanced patterns" },
    { id: "8", text: "Artificial intelligence algorithms" },
  ];

  const clustered = await clusterer.clusterDocuments(documents, 3);
  clusterer.displayClusters(clustered);
}

runClustering();
```

### Use Case 4: RAG System

```typescript
import { GoogleGenAI } from "@google/genai";
import * as cosineSimilarity from "compute-cosine-similarity";

interface KnowledgeBase {
  id: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

class RAGSystem {
  private ai: GoogleGenAI;
  private knowledgeBase: KnowledgeBase[] = [];

  constructor() {
    this.ai = new GoogleGenAI({});
  }

  async addDocuments(
    documents: Array<{ id: string; content: string; metadata?: any }>,
  ) {
    console.log(`Adding ${documents.length} documents to knowledge base...`);

    const contents = documents.map((d) => d.content);

    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-001",
      contents,
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: 1536,
    });

    documents.forEach((doc, index) => {
      this.knowledgeBase.push({
        id: doc.id,
        content: doc.content,
        embedding: normalizeEmbedding(response.embeddings[index].values),
        metadata: doc.metadata,
      });
    });

    console.log(
      `✓ Knowledge base size: ${this.knowledgeBase.length} documents`,
    );
  }

  async retrieveRelevant(query: string, topK: number = 3): Promise<string[]> {
    // Generate query embedding
    const response = await this.ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: query,
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: 1536,
    });

    const queryEmbedding = normalizeEmbedding(response.embeddings[0].values);

    // Find most similar documents
    const results = this.knowledgeBase
      .map((doc) => ({
        ...doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results.map((r) => r.content);
  }

  async generateAnswer(
    question: string,
  ): Promise<{ answer: string; context: string[] }> {
    // Retrieve relevant context
    const context = await this.retrieveRelevant(question, 3);

    // Build prompt with context
    const prompt = `
Based on the following context, answer the question.

Context:
${context.map((c, i) => `${i + 1}. ${c}`).join("\n\n")}

Question: ${question}

Answer:`;

    // Generate answer using Gemini
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return {
      answer: response.text,
      context,
    };
  }
}

function normalizeEmbedding(embedding: number[]): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0),
  );
  return embedding.map((val) => val / magnitude);
}

// Usage
async function runRAG() {
  const rag = new RAGSystem();

  // Add company knowledge
  await rag.addDocuments([
    {
      id: "1",
      content:
        "Our company offers a 30-day money-back guarantee on all products. Customers can return items for a full refund within 30 days of purchase.",
      metadata: { category: "return-policy" },
    },
    {
      id: "2",
      content:
        "Standard shipping takes 3-5 business days. Express shipping is available for 1-2 business days delivery at an additional cost.",
      metadata: { category: "shipping" },
    },
    {
      id: "3",
      content:
        "Our customer support team is available Monday through Friday, 9 AM to 5 PM EST. You can reach us by phone, email, or live chat.",
      metadata: { category: "support" },
    },
    {
      id: "4",
      content:
        "We accept all major credit cards, PayPal, and Apple Pay. Payment information is encrypted and secure.",
      metadata: { category: "payment" },
    },
  ]);

  // Ask questions
  const questions = [
    "Can I return a product if I don't like it?",
    "How long does shipping take?",
    "What payment methods do you accept?",
  ];

  for (const question of questions) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Q: ${question}`);
    console.log("=".repeat(60));

    const result = await rag.generateAnswer(question);

    console.log(`\nAnswer: ${result.answer}`);
    console.log(`\nContext used:`);
    result.context.forEach((ctx, i) => {
      console.log(`${i + 1}. ${ctx}`);
    });
  }
}

runRAG();
```

## Storing Embeddings

For production systems, use vector databases to efficiently store, index, and retrieve high-dimensional embeddings.

### Supported Vector Databases

**Google Cloud Services:**

- BigQuery
- AlloyDB
- Cloud SQL

**Third-Party Solutions:**

- ChromaDB
- Qdrant
- Weaviate
- Pinecone

### Example: In-Memory Vector Store

```typescript
interface VectorStore {
  id: string;
  embedding: number[];
  metadata: Record<string, any>;
}

class SimpleVectorDB {
  private vectors: VectorStore[] = [];

  add(id: string, embedding: number[], metadata: Record<string, any> = {}) {
    this.vectors.push({ id, embedding, metadata });
  }

  search(
    queryEmbedding: number[],
    topK: number = 5,
  ): Array<{ id: string; score: number; metadata: any }> {
    return this.vectors
      .map((vec) => ({
        id: vec.id,
        score: cosineSimilarity(queryEmbedding, vec.embedding),
        metadata: vec.metadata,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  delete(id: string) {
    this.vectors = this.vectors.filter((vec) => vec.id !== id);
  }

  size(): number {
    return this.vectors.length;
  }
}
```

## Model Information

### Model Properties

| Property                  | Details                                            |
| ------------------------- | -------------------------------------------------- |
| **Model Code**            | `gemini-embedding-001`                             |
| **Input Types**           | Text                                               |
| **Output**                | Text embeddings                                    |
| **Input Token Limit**     | 2,048 tokens                                       |
| **Output Dimension Size** | Flexible: 128-3072<br>Recommended: 768, 1536, 3072 |
| **Latest Update**         | June 2025                                          |

### Model Versions

- **Stable**: `gemini-embedding-001`
- **Experimental**: `gemini-embedding-exp-03-07` (deprecating October 2025)

### Deprecation Notice

The following models will be deprecated in **October 2025**:

- `embedding-001`
- `embedding-gecko-001`
- `gemini-embedding-exp-03-07` (gemini-embedding-exp)

## Batch Embeddings API

For non-latency-critical workloads, use the Batch API for much higher throughput at **50% of interactive Embedding pricing**.

```typescript
// Conceptual example - check latest SDK for exact implementation
async function batchEmbeddings(texts: string[]) {
  const ai = new GoogleGenAI({});

  // Use batch API for large-scale embedding generation
  const batchRequest = {
    model: "gemini-embedding-001",
    contents: texts,
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: 768,
  };

  // Submit batch job
  // Process results when ready
}
```

## Best Practices

### 1. Choose Appropriate Task Types

```typescript
// ✓ Good: Specific task types
const searchDocs = await ai.models.embedContent({
  model: "gemini-embedding-001",
  contents: documents,
  taskType: "RETRIEVAL_DOCUMENT", // For documents to be searched
});

const searchQuery = await ai.models.embedContent({
  model: "gemini-embedding-001",
  contents: userQuery,
  taskType: "RETRIEVAL_QUERY", // For search queries
});

// ✗ Bad: Same task type for both
const embeddings = await ai.models.embedContent({
  model: "gemini-embedding-001",
  contents: [...documents, userQuery],
  // No task type specified or wrong task type
});
```

### 2. Normalize Embeddings for Non-Default Dimensions

```typescript
// Always normalize for dimensions other than 3072
async function safeEmbedding(text: string, dimension: number) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    outputDimensionality: dimension,
  });

  const embedding = response.embeddings[0].values;

  // Normalize if not default dimension
  return dimension === 3072 ? embedding : normalizeEmbedding(embedding);
}
```

### 3. Batch Process for Efficiency

```typescript
// ✓ Good: Batch processing
const texts = [...]; // 100 texts
const response = await ai.models.embedContent({
  model: 'gemini-embedding-001',
  contents: texts  // Single API call
});

// ✗ Bad: Individual calls
for (const text of texts) {
  await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text  // 100 API calls!
  });
}
```

### 4. Cache Embeddings

```typescript
class EmbeddingCache {
  private cache = new Map<string, number[]>();

  async getEmbedding(text: string, ai: GoogleGenAI): Promise<number[]> {
    if (this.cache.has(text)) {
      return this.cache.get(text)!;
    }

    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text,
      outputDimensionality: 768,
    });

    const embedding = normalizeEmbedding(response.embeddings[0].values);
    this.cache.set(text, embedding);

    return embedding;
  }

  clear() {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
```

### 5. Handle Errors Gracefully

```typescript
async function robustEmbedding(
  texts: string[],
  retries: number = 3,
): Promise<number[][]> {
  const ai = new GoogleGenAI({});

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: texts,
        outputDimensionality: 768,
      });

      return response.embeddings.map((e) => normalizeEmbedding(e.values));
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt === retries) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      );
    }
  }

  throw new Error("Failed to generate embeddings");
}
```

## Pricing

- **Embedding generation**: $0.15 per 1M tokens
- **Batch API**: 50% discount ($0.075 per 1M tokens)

```typescript
function estimateEmbeddingCost(
  numTokens: number,
  useBatchAPI: boolean = false,
): number {
  const pricePerMillion = useBatchAPI ? 0.075 : 0.15;
  return (numTokens / 1_000_000) * pricePerMillion;
}

// Example
const tokens = 500_000;
console.log(
  `Interactive API cost: $${estimateEmbeddingCost(tokens, false).toFixed(4)}`,
);
console.log(
  `Batch API cost: $${estimateEmbeddingCost(tokens, true).toFixed(4)}`,
);
```

## Responsible Use Notice

- **User responsibility**: You retain full responsibility for input data and resulting embeddings
- **Content rights**: Confirm you have necessary rights to any uploaded content
- **Intellectual property**: Do not generate content that infringes on others' IP or privacy rights
- **Terms of Service**: Usage subject to Prohibited Use Policy and Google's Terms of Service

## Summary

Gemini embeddings provide powerful semantic understanding for various NLP tasks:

- **Flexible dimensions**: 128-3072 (recommended: 768, 1536, 3072)
- **Task-specific optimization**: 8 task types for different use cases
- **High quality**: Competitive MTEB scores across dimensions
- **Cost-effective**: Batch API at 50% discount
- **Production-ready**: Integrate with major vector databases

Key considerations:

- Always specify appropriate task types
- Normalize embeddings for non-default dimensions
- Use batch processing for efficiency
- Cache embeddings when possible
- Choose dimension size based on quality/storage tradeoff

By combining TypeScript's type system with Gemini's embedding capabilities, you can build sophisticated semantic search, classification, clustering, and RAG systems with excellent performance and accuracy.
