# Gemini File API & File Search Skill

## Overview

The Gemini API enables **Retrieval Augmented Generation (RAG)** through the File Search tool. File Search imports, chunks, and indexes your data to enable fast retrieval of relevant information based on a user's prompt. This information is then provided as context to the model, allowing it to provide more accurate and relevant answers.

File Search uses **semantic search** to find information relevant to user prompts, understanding the meaning and context rather than just matching keywords.

## TypeScript Implementation

### Setup

Install required dependency:

```bash
npm install @google/genai
```

**Note**: The TypeScript/JavaScript SDK for File Search is evolving. The examples below demonstrate the conceptual approach. Always refer to the latest SDK documentation for exact method signatures.

## Two Approaches to File Upload

### Approach 1: Direct Upload to File Search Store

This approach uploads a file directly to your file search store in one operation:

```typescript
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({});

async function uploadDirectlyToFileSearch() {
  // Create the file search store with an optional display name
  const fileSearchStore = await client.fileSearchStores.create({
    displayName: 'your-fileSearchStore-name'
  });

  // Upload and import a file into the file search store
  let operation = await client.fileSearchStores.uploadToFileSearchStore({
    file: 'sample.txt',
    fileSearchStoreName: fileSearchStore.name,
    config: {
      displayName: 'display-file-name',
    }
  });

  // Wait until import is complete
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await client.operations.get(operation.name);
  }

  console.log('File uploaded and indexed successfully');
  return fileSearchStore;
}
```

### Approach 2: Upload Then Import

Alternatively, upload a file first using the Files API, then import it:

```typescript
import { GoogleGenAI } from '@google/genai';

const client = new GoogleGenAI({});

async function uploadThenImport() {
  // Upload the file using the Files API
  const sampleFile = await client.files.upload({
    file: 'sample.txt',
    config: {
      name: 'display_file_name'
    }
  });

  // Create the file search store
  const fileSearchStore = await client.fileSearchStores.create({
    displayName: 'your-fileSearchStore-name'
  });

  // Import the file into the file search store
  let operation = await client.fileSearchStores.importFile({
    fileSearchStoreName: fileSearchStore.name,
    fileName: sampleFile.name
  });

  // Wait until import is complete
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await client.operations.get(operation.name);
  }

  console.log('File imported and indexed successfully');
  return fileSearchStore;
}
```

## Querying with File Search

Once your files are imported and indexed, you can query them:

```typescript
import { GoogleGenAI } from '@google/genai';

async function queryFileSearch(fileSearchStoreName: string) {
  const client = new GoogleGenAI({});

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Can you tell me about Robert Graves?',
    config: {
      tools: [{
        fileSearch: {
          fileSearchStoreNames: [fileSearchStoreName]
        }
      }]
    }
  });

  console.log(response.text);
  return response;
}
```

## How File Search Works

File Search uses **semantic search** to find information relevant to user prompts:

1. **Create a File Search Store**: A persistent container for document embeddings

2. **Upload and Import Files**: Files are:
   - Chunked into manageable pieces
   - Converted into numerical embeddings (using `gemini-embedding-001`)
   - Indexed for fast retrieval
   - Stored indefinitely (unlike raw File API uploads which expire after 48 hours)

3. **Query with File Search**: The model:
   - Converts your query into an embedding
   - Performs semantic search to find relevant chunks
   - Uses found information to ground its response

### Process Flow

```
Documents → Chunking → Embedding Model (gemini-embedding-001) → File Search Store
                                                                          ↓
User Query → Query Embedding ─────────────────────────────────→ Semantic Search
                                                                          ↓
                                                                 Relevant Chunks → Model → Response
```

## Chunking Configuration

Control how files are broken down into chunks:

```typescript
interface ChunkingConfig {
  whiteSpaceConfig?: {
    maxTokensPerChunk: number;
    maxOverlapTokens: number;
  };
}

async function uploadWithCustomChunking(
  fileSearchStoreName: string,
  filePath: string
) {
  const client = new GoogleGenAI({});

  const operation = await client.fileSearchStores.uploadToFileSearchStore({
    fileSearchStoreName,
    file: filePath,
    config: {
      displayName: 'custom-chunked-file',
      chunkingConfig: {
        whiteSpaceConfig: {
          maxTokensPerChunk: 200,  // Maximum tokens per chunk
          maxOverlapTokens: 20,    // Overlapping tokens between chunks
        }
      }
    }
  });

  // Wait for completion
  return await waitForOperation(operation);
}

async function waitForOperation(operation: any): Promise<any> {
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const client = new GoogleGenAI({});
    operation = await client.operations.get(operation.name);
  }
  return operation;
}
```

### Chunking Best Practices

- **Default settings** work well for most use cases
- **Smaller chunks** (100-200 tokens): Better for precise retrieval, more chunks to search
- **Larger chunks** (500-1000 tokens): More context per chunk, fewer total chunks
- **Overlap tokens**: Help maintain context across chunk boundaries (typically 10-20% of chunk size)

## File Search Store Management

### Type Definitions

```typescript
interface FileSearchStore {
  name: string;
  displayName?: string;
  createTime?: string;
  updateTime?: string;
}

interface FileSearchStoreConfig {
  displayName?: string;
}
```

### Create a File Search Store

```typescript
async function createFileSearchStore(
  displayName: string
): Promise<FileSearchStore> {
  const client = new GoogleGenAI({});
  
  const store = await client.fileSearchStores.create({
    displayName
  });
  
  console.log(`Created store: ${store.name}`);
  return store;
}
```

### List All File Search Stores

```typescript
async function listFileSearchStores(): Promise<FileSearchStore[]> {
  const client = new GoogleGenAI({});
  
  const stores: FileSearchStore[] = [];
  const iterator = client.fileSearchStores.list();
  
  for await (const store of iterator) {
    console.log(`Store: ${store.name} (${store.displayName})`);
    stores.push(store);
  }
  
  return stores;
}
```

### Get a Specific File Search Store

```typescript
async function getFileSearchStore(
  storeName: string
): Promise<FileSearchStore> {
  const client = new GoogleGenAI({});
  
  const store = await client.fileSearchStores.get({
    name: storeName
  });
  
  console.log(`Retrieved store: ${store.displayName}`);
  return store;
}
```

### Delete a File Search Store

```typescript
async function deleteFileSearchStore(
  storeName: string,
  force: boolean = true
): Promise<void> {
  const client = new GoogleGenAI({});
  
  await client.fileSearchStores.delete({
    name: storeName,
    config: { force }
  });
  
  console.log(`Deleted store: ${storeName}`);
}
```

## File Metadata

Add custom metadata to files for filtering and additional context:

```typescript
interface CustomMetadata {
  key: string;
  stringValue?: string;
  numericValue?: number;
}

async function uploadWithMetadata(
  fileSearchStoreName: string,
  fileName: string
) {
  const client = new GoogleGenAI({});

  const operation = await client.fileSearchStores.importFile({
    fileSearchStoreName,
    fileName,
    customMetadata: [
      { key: 'author', stringValue: 'Robert Graves' },
      { key: 'year', numericValue: 1934 },
      { key: 'genre', stringValue: 'historical fiction' }
    ]
  });

  return await waitForOperation(operation);
}
```

### Query with Metadata Filters

Search within a subset of documents using metadata filters:

```typescript
async function queryWithMetadataFilter(
  fileSearchStoreName: string,
  query: string,
  filter: string
) {
  const client = new GoogleGenAI({});

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      tools: [{
        fileSearch: {
          fileSearchStoreNames: [fileSearchStoreName],
          metadataFilter: filter  // e.g., 'author="Robert Graves"'
        }
      }]
    }
  });

  return response;
}

// Usage examples
const response1 = await queryWithMetadataFilter(
  storeName,
  "Tell me about the book 'I, Claudius'",
  'author="Robert Graves"'
);

const response2 = await queryWithMetadataFilter(
  storeName,
  "Find books from the 1930s",
  'year >= 1930 AND year < 1940'
);
```

### Metadata Filter Syntax

Filter syntax follows [google.aip.dev/160](https://google.aip.dev/160):

```typescript
// String comparison
'author="Robert Graves"'
'genre="historical fiction"'

// Numeric comparison
'year=1934'
'year >= 1930'
'year < 1940'

// Logical operators
'author="Robert Graves" AND year=1934'
'genre="fiction" OR genre="non-fiction"'
'year >= 1930 AND year < 1940 AND author="Robert Graves"'

// Negation
'NOT genre="romance"'
'year != 1934'
```

## Citations

When using File Search, the model's response includes citations showing which document parts were used:

```typescript
interface GroundingMetadata {
  groundingChunks?: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
  groundingSupports?: Array<{
    segment?: {
      startIndex: number;
      endIndex: number;
      text: string;
    };
    groundingChunkIndices: number[];
  }>;
}

async function queryWithCitations(
  fileSearchStoreName: string,
  query: string
) {
  const client = new GoogleGenAI({});

  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      tools: [{
        fileSearch: {
          fileSearchStoreNames: [fileSearchStoreName]
        }
      }]
    }
  });

  console.log('Response:', response.text);
  
  // Access grounding metadata
  const groundingMetadata = response.candidates[0].groundingMetadata;
  if (groundingMetadata) {
    console.log('\nCitations:');
    console.log(JSON.stringify(groundingMetadata, null, 2));
  }

  return response;
}
```

### Extract and Display Citations

```typescript
function extractCitations(response: any): Array<{
  text: string;
  sources: string[];
}> {
  const metadata = response.candidates[0]?.groundingMetadata;
  if (!metadata) return [];

  const chunks = metadata.groundingChunks || [];
  const supports = metadata.groundingSupports || [];

  return supports.map(support => ({
    text: support.segment?.text || '',
    sources: (support.groundingChunkIndices || [])
      .map(index => chunks[index]?.web?.title || 'Unknown source')
  }));
}

// Usage
const response = await queryWithCitations(storeName, 'Tell me about Robert Graves');
const citations = extractCitations(response);

console.log('\nCitations:');
citations.forEach((citation, index) => {
  console.log(`\n${index + 1}. "${citation.text}"`);
  console.log(`   Sources: ${citation.sources.join(', ')}`);
});
```

## Supported Models

The following models support File Search:

- `gemini-2.5-pro`
- `gemini-2.5-flash`

## Supported File Types

### Application File Types

- PDF: `.pdf`
- Microsoft Word: `.doc`, `.docx`
- Microsoft Excel: `.xls`, `.xlsx`
- Microsoft PowerPoint: `.ppt`, `.pptx`
- Other: Various application formats

### Text File Types

- Plain text: `.txt`
- Markdown: `.md`
- CSV: `.csv`
- JSON: `.json`
- XML: `.xml`
- HTML: `.html`
- Code files: `.js`, `.ts`, `.py`, `.java`, `.cpp`, etc.

## Rate Limits and Quotas

### File Size Limits

- **Maximum file size / per document**: 100 MB
- **Recommendation**: Limit each file search store to under 20 GB for optimal retrieval latencies

### Total Storage by Tier

| Tier | Total Storage Limit |
|------|---------------------|
| Free | 1 GB |
| Tier 1 | 10 GB |
| Tier 2 | 100 GB |
| Tier 3 | 1 TB |

**Note**: The limit on file search store size is computed on the backend based on:
- Size of your input
- Embeddings generated and stored with it
- Typically approximately **3x the size of your input data**

## Pricing

**Embedding Generation (Indexing Time)**:
- $0.15 per 1M tokens (using existing embeddings pricing)

**Storage**:
- Free of charge

**Query Time Embeddings**:
- Free of charge

**Retrieved Document Tokens**:
- Charged as regular context tokens (based on model pricing)

### Cost Estimation

```typescript
function estimateIndexingCost(
  inputTokens: number,
  pricePerMillion: number = 0.15
): number {
  return (inputTokens / 1_000_000) * pricePerMillion;
}

// Example: 10MB text file ≈ 2.5M tokens
const tokens = 2_500_000;
const cost = estimateIndexingCost(tokens);
console.log(`Estimated indexing cost: $${cost.toFixed(4)}`);
// Output: Estimated indexing cost: $0.3750
```

## Complete Examples

### Example 1: Document Q&A System

```typescript
import { GoogleGenAI } from '@google/genai';
import { readFileSync } from 'fs';

class DocumentQASystem {
  private client: GoogleGenAI;
  private storeName?: string;

  constructor() {
    this.client = new GoogleGenAI({});
  }

  async initialize(displayName: string): Promise<void> {
    // Create file search store
    const store = await this.client.fileSearchStores.create({
      displayName
    });
    
    this.storeName = store.name;
    console.log(`✓ Created file search store: ${this.storeName}`);
  }

  async uploadDocuments(filePaths: string[]): Promise<void> {
    if (!this.storeName) {
      throw new Error('Store not initialized');
    }

    for (const filePath of filePaths) {
      console.log(`Uploading ${filePath}...`);
      
      const operation = await this.client.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: this.storeName,
        file: filePath,
        config: {
          displayName: filePath.split('/').pop(),
          chunkingConfig: {
            whiteSpaceConfig: {
              maxTokensPerChunk: 300,
              maxOverlapTokens: 50
            }
          }
        }
      });

      // Wait for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await this.client.operations.get(operation.name);
      }
      
      console.log(`✓ Uploaded and indexed ${filePath}`);
    }
  }

  async query(question: string): Promise<{
    answer: string;
    citations: Array<{ text: string; sources: string[] }>;
  }> {
    if (!this.storeName) {
      throw new Error('Store not initialized');
    }

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [this.storeName]
          }
        }]
      }
    });

    return {
      answer: response.text,
      citations: this.extractCitations(response)
    };
  }

  private extractCitations(response: any): Array<{ text: string; sources: string[] }> {
    const metadata = response.candidates[0]?.groundingMetadata;
    if (!metadata) return [];

    const chunks = metadata.groundingChunks || [];
    const supports = metadata.groundingSupports || [];

    return supports.map(support => ({
      text: support.segment?.text || '',
      sources: (support.groundingChunkIndices || [])
        .map((index: number) => chunks[index]?.web?.title || 'Unknown')
    }));
  }

  async cleanup(): Promise<void> {
    if (this.storeName) {
      await this.client.fileSearchStores.delete({
        name: this.storeName,
        config: { force: true }
      });
      console.log('✓ Cleaned up file search store');
    }
  }
}

// Usage
async function main() {
  const qa = new DocumentQASystem();
  
  try {
    await qa.initialize('company-docs');
    
    await qa.uploadDocuments([
      './docs/company-handbook.pdf',
      './docs/policies.docx',
      './docs/benefits.pdf'
    ]);

    const result = await qa.query('What is the vacation policy?');
    
    console.log('\nAnswer:', result.answer);
    console.log('\nCitations:');
    result.citations.forEach((citation, i) => {
      console.log(`${i + 1}. "${citation.text}" - ${citation.sources.join(', ')}`);
    });
  } finally {
    await qa.cleanup();
  }
}

main();
```

### Example 2: Multi-Document Research Assistant

```typescript
import { GoogleGenAI } from '@google/genai';

interface ResearchDocument {
  filePath: string;
  metadata: {
    author?: string;
    year?: number;
    category?: string;
  };
}

class ResearchAssistant {
  private client: GoogleGenAI;
  private storeName?: string;

  constructor() {
    this.client = new GoogleGenAI({});
  }

  async setup(storeName: string): Promise<void> {
    const store = await this.client.fileSearchStores.create({
      displayName: storeName
    });
    
    this.storeName = store.name;
  }

  async ingestDocuments(documents: ResearchDocument[]): Promise<void> {
    if (!this.storeName) throw new Error('Not initialized');

    for (const doc of documents) {
      console.log(`Ingesting: ${doc.filePath}`);
      
      // Upload file first
      const file = await this.client.files.upload({
        file: doc.filePath,
        config: {
          name: doc.filePath.split('/').pop()
        }
      });

      // Import with metadata
      const customMetadata = [
        doc.metadata.author && { key: 'author', stringValue: doc.metadata.author },
        doc.metadata.year && { key: 'year', numericValue: doc.metadata.year },
        doc.metadata.category && { key: 'category', stringValue: doc.metadata.category }
      ].filter(Boolean);

      const operation = await this.client.fileSearchStores.importFile({
        fileSearchStoreName: this.storeName,
        fileName: file.name,
        customMetadata
      });

      // Wait for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await this.client.operations.get(operation.name);
      }
      
      console.log(`✓ Ingested ${doc.filePath}`);
    }
  }

  async research(
    question: string,
    filters?: {
      author?: string;
      yearRange?: { start: number; end: number };
      category?: string;
    }
  ): Promise<string> {
    if (!this.storeName) throw new Error('Not initialized');

    // Build metadata filter
    let metadataFilter = '';
    if (filters) {
      const conditions: string[] = [];
      
      if (filters.author) {
        conditions.push(`author="${filters.author}"`);
      }
      
      if (filters.yearRange) {
        conditions.push(
          `year >= ${filters.yearRange.start} AND year <= ${filters.yearRange.end}`
        );
      }
      
      if (filters.category) {
        conditions.push(`category="${filters.category}"`);
      }
      
      metadataFilter = conditions.join(' AND ');
    }

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [this.storeName],
            ...(metadataFilter && { metadataFilter })
          }
        }]
      }
    });

    return response.text;
  }
}

// Usage
async function conductResearch() {
  const assistant = new ResearchAssistant();
  
  await assistant.setup('climate-research');
  
  await assistant.ingestDocuments([
    {
      filePath: './papers/climate-change-2020.pdf',
      metadata: { author: 'IPCC', year: 2020, category: 'climate' }
    },
    {
      filePath: './papers/renewable-energy-2021.pdf',
      metadata: { author: 'IEA', year: 2021, category: 'energy' }
    },
    {
      filePath: './papers/carbon-capture-2022.pdf',
      metadata: { author: 'MIT', year: 2022, category: 'technology' }
    }
  ]);

  // Query all documents
  const answer1 = await assistant.research(
    'What are the latest findings on climate change mitigation?'
  );
  console.log('All documents:', answer1);

  // Query filtered by year range
  const answer2 = await assistant.research(
    'What renewable energy technologies show the most promise?',
    { yearRange: { start: 2021, end: 2022 } }
  );
  console.log('\n2021-2022 documents:', answer2);

  // Query filtered by category
  const answer3 = await assistant.research(
    'What are the challenges in carbon capture?',
    { category: 'technology' }
  );
  console.log('\nTechnology documents:', answer3);
}

conductResearch();
```

### Example 3: Customer Support Knowledge Base

```typescript
import { GoogleGenAI } from '@google/genai';

interface SupportDocument {
  content: string;
  category: string;
  priority: number;
}

class SupportKnowledgeBase {
  private client: GoogleGenAI;
  private storeName?: string;

  constructor() {
    this.client = new GoogleGenAI({});
  }

  async initialize(): Promise<void> {
    const store = await this.client.fileSearchStores.create({
      displayName: 'support-kb'
    });
    this.storeName = store.name;
  }

  async addDocument(
    doc: SupportDocument,
    filename: string
  ): Promise<void> {
    if (!this.storeName) throw new Error('Not initialized');

    // Create temporary file (in real app, you'd handle this differently)
    const tempFile = `./temp/${filename}`;
    // Write doc.content to tempFile

    const operation = await this.client.fileSearchStores.uploadToFileSearchStore({
      fileSearchStoreName: this.storeName,
      file: tempFile,
      config: {
        displayName: filename,
        customMetadata: [
          { key: 'category', stringValue: doc.category },
          { key: 'priority', numericValue: doc.priority }
        ]
      }
    });

    // Wait for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      operation = await this.client.operations.get(operation.name);
    }
  }

  async findAnswer(
    question: string,
    category?: string,
    minPriority?: number
  ): Promise<{
    answer: string;
    sources: string[];
    confidence: 'high' | 'medium' | 'low';
  }> {
    if (!this.storeName) throw new Error('Not initialized');

    // Build filter
    const filters: string[] = [];
    if (category) filters.push(`category="${category}"`);
    if (minPriority) filters.push(`priority >= ${minPriority}`);
    const metadataFilter = filters.join(' AND ');

    const response = await this.client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: question,
      config: {
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [this.storeName],
            ...(metadataFilter && { metadataFilter })
          }
        }]
      }
    });

    // Extract sources from grounding metadata
    const metadata = response.candidates[0]?.groundingMetadata;
    const sources = (metadata?.groundingChunks || [])
      .map(chunk => chunk.web?.title)
      .filter(Boolean);

    // Estimate confidence based on number of sources
    const confidence = sources.length >= 3 ? 'high' 
                     : sources.length >= 2 ? 'medium' 
                     : 'low';

    return {
      answer: response.text,
      sources,
      confidence
    };
  }

  async updateCategories(): Promise<void> {
    // List all documents and update their metadata
    // Implementation depends on specific requirements
  }
}

// Usage
async function supportExample() {
  const kb = new SupportKnowledgeBase();
  await kb.initialize();

  // Add documents
  await kb.addDocument({
    content: 'Password reset instructions...',
    category: 'account',
    priority: 1
  }, 'password-reset.txt');

  await kb.addDocument({
    content: 'Billing cycle information...',
    category: 'billing',
    priority: 2
  }, 'billing-cycles.txt');

  // Find answers
  const result = await kb.findAnswer(
    'How do I reset my password?',
    'account'
  );

  console.log('Answer:', result.answer);
  console.log('Confidence:', result.confidence);
  console.log('Sources:', result.sources);
}

supportExample();
```

## Best Practices

### 1. Organize Documents by Store

Create separate file search stores for different domains:

```typescript
const stores = {
  legal: await createFileSearchStore('legal-documents'),
  hr: await createFileSearchStore('hr-policies'),
  engineering: await createFileSearchStore('technical-docs')
};
```

### 2. Use Descriptive Display Names

```typescript
// ✓ Good
const operation = await client.fileSearchStores.uploadToFileSearchStore({
  file: 'document.pdf',
  config: {
    displayName: '2024-Q1-Financial-Report'
  }
});

// ✗ Bad
const operation = await client.fileSearchStores.uploadToFileSearchStore({
  file: 'document.pdf',
  config: {
    displayName: 'doc1'
  }
});
```

### 3. Add Rich Metadata

```typescript
const metadata = [
  { key: 'document_type', stringValue: 'financial_report' },
  { key: 'quarter', stringValue: 'Q1' },
  { key: 'year', numericValue: 2024 },
  { key: 'department', stringValue: 'finance' },
  { key: 'confidentiality', stringValue: 'internal' }
];
```

### 4. Monitor Store Size

```typescript
async function checkStoreSize(storeName: string): Promise<void> {
  const client = new GoogleGenAI({});
  const store = await client.fileSearchStores.get({ name: storeName });
  
  // Check if approaching limits
  // Implementation depends on API providing size information
  console.log('Store:', store);
}
```

### 5. Handle Long-Running Operations

```typescript
async function waitForOperationWithProgress(
  operation: any,
  taskName: string
): Promise<any> {
  const client = new GoogleGenAI({});
  let iteration = 0;
  
  while (!operation.done) {
    iteration++;
    console.log(`${taskName}: still processing... (${iteration * 5}s)`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await client.operations.get(operation.name);
  }
  
  console.log(`${taskName}: complete ✓`);
  return operation;
}
```

### 6. Implement Retry Logic

```typescript
async function uploadWithRetry(
  storeName: string,
  filePath: string,
  maxRetries: number = 3
): Promise<any> {
  const client = new GoogleGenAI({});
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const operation = await client.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: storeName,
        file: filePath,
        config: { displayName: filePath }
      });
      
      return await waitForOperationWithProgress(operation, 'Upload');
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts`);
      }
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

## Error Handling

```typescript
class FileSearchError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'FileSearchError';
  }
}

async function safeFileSearch(
  storeName: string,
  query: string
): Promise<string> {
  const client = new GoogleGenAI({});
  
  try {
    // Verify store exists
    await client.fileSearchStores.get({ name: storeName });
    
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{
          fileSearch: {
            fileSearchStoreNames: [storeName]
          }
        }]
      }
    });

    if (!response.text) {
      throw new FileSearchError(
        'No response generated',
        'EMPTY_RESPONSE'
      );
    }

    return response.text;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw new FileSearchError(
          `Store not found: ${storeName}`,
          'STORE_NOT_FOUND'
        );
      }
      
      if (error.message.includes('quota')) {
        throw new FileSearchError(
          'Storage quota exceeded',
          'QUOTA_EXCEEDED'
        );
      }
    }
    
    throw error;
  }
}
```

## Summary

File Search transforms Gemini into a powerful RAG system that can:

- **Index and search large document collections** using semantic understanding
- **Provide accurate, grounded answers** with citations
- **Filter documents by metadata** for targeted searches
- **Store embeddings persistently** (unlike temporary file uploads)
- **Scale from gigabytes to terabytes** of documents

Key considerations for production use:

- **File search stores persist indefinitely** - manage and clean up regularly
- **Chunking configuration affects retrieval** - tune for your use case
- **Metadata enables filtering** - add rich metadata during upload
- **Citations provide transparency** - extract and display for user trust
- **Monitor costs** - $0.15 per 1M tokens for embedding generation
- **Optimal store size is under 20GB** - split larger datasets
- **Operations are async** - implement proper waiting and progress tracking

By combining TypeScript's type system with Gemini's File Search capabilities, you can build sophisticated knowledge bases and Q&A systems that provide accurate, verifiable answers grounded in your documents.