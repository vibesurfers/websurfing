# Similarity & Concept Expansion Operator

The Similarity & Concept Expansion Operator generates related keywords, similar concepts, and expanded search terms using Gemini's semantic understanding. It's particularly useful for populating search keyword columns and finding related concepts.

## Features

- **Multi-type Expansion**: Keywords, synonyms, related concepts, search terms, categories
- **Domain-Specific Results**: Contextual expansion based on specified domains
- **Confidence Scoring**: Quality assessment of generated results
- **Flexible Configuration**: Multiple expansion types and result limits
- **Structured Output**: JSON schema validation for consistent results

## Usage

### Basic Usage

```typescript
import { SimilarityExpansionOperator } from "@/server/operators/similarity-operator";

const operator = new SimilarityExpansionOperator();

const result = await operator.operation({
  concept: "artificial intelligence",
  expansionType: "all",
  maxResults: 10,
  domain: "technology"
});

console.log(result.similarTerms); // ["machine learning", "neural networks", ...]
```

### Expansion Types

#### 1. Keywords (`"keywords"`)
Generates SEO-optimized keywords and search terms.

```typescript
const keywordResults = await operator.operation({
  concept: "sustainable energy",
  expansionType: "keywords",
  maxResults: 15,
  domain: "environmental technology",
  context: "Generate SEO-friendly keywords for content optimization"
});

// Results: ["renewable energy", "green technology", "solar power", "wind energy", ...]
```

#### 2. Synonyms (`"synonyms"`)
Finds alternative ways to express the same concept.

```typescript
const synonymResults = await operator.operation({
  concept: "customer satisfaction",
  expansionType: "synonyms",
  maxResults: 10,
  domain: "business"
});

// Results: ["client happiness", "user satisfaction", "customer delight", ...]
```

#### 3. Related Concepts (`"related_concepts"`)
Discovers concepts in the same domain or category.

```typescript
const relatedResults = await operator.operation({
  concept: "blockchain",
  expansionType: "related_concepts",
  maxResults: 12,
  domain: "cryptocurrency"
});

// Results: ["smart contracts", "decentralized finance", "NFTs", "consensus mechanisms", ...]
```

#### 4. Search Terms (`"search_terms"`)
Generates effective search engine queries.

```typescript
const searchResults = await operator.operation({
  concept: "climate change",
  expansionType: "search_terms",
  maxResults: 10,
  domain: "environmental science"
});

// Results: ["global warming research", "climate change data", "carbon emissions studies", ...]
```

#### 5. Categories (`"categories"`)
Provides taxonomic classifications and groupings.

```typescript
const categoryResults = await operator.operation({
  concept: "Python programming",
  expansionType: "categories",
  maxResults: 8,
  domain: "software development"
});

// Results: ["Programming Languages", "Web Development", "Data Science", ...]
```

#### 6. All (`"all"`)
Comprehensive expansion with all types.

```typescript
const allResults = await operator.operation({
  concept: "digital marketing",
  expansionType: "all",
  maxResults: 12,
  domain: "marketing"
});

// Returns all fields: similarTerms, synonyms, relatedConcepts, searchTerms, categories
```

## Preset Configurations

Use predefined presets for common use cases:

### SEO Keywords
```typescript
import { SimilarityPresets } from "@/server/operators/similarity-operator";

const seoConfig = SimilarityPresets.seoKeywords("content marketing", "digital marketing");
const result = await operator.operation(seoConfig);
```

### Academic Research
```typescript
const researchConfig = SimilarityPresets.researchTerms("quantum computing", "physics");
const result = await operator.operation(researchConfig);
```

### Product Categories
```typescript
const productConfig = SimilarityPresets.productCategories("wireless headphones");
const result = await operator.operation(productConfig);
```

### Content Ideas
```typescript
const contentConfig = SimilarityPresets.contentIdeas("sustainable fashion", "lifestyle");
const result = await operator.operation(contentConfig);
```

### Data Enrichment
```typescript
const enrichmentConfig = SimilarityPresets.dataEnrichment("machine learning", "technology");
const result = await operator.operation(enrichmentConfig);
```

## Helper Functions

### Quick Concept Expansion
```typescript
import { expandConcept } from "@/server/operators/similarity-operator";

// Using preset configuration
const result = await expandConcept("artificial intelligence", "dataEnrichment", "technology");
```

### Generate Search Keywords
```typescript
import { generateSearchKeywords } from "@/server/operators/similarity-operator";

// Returns flat array of search keywords
const keywords = await generateSearchKeywords("e-commerce platform", "retail technology", 20);
```

## Use Cases

### 1. SEO Content Optimization
```typescript
// Expand blog topic into SEO keywords
const blogTopic = "remote work productivity";
const seoKeywords = await generateSearchKeywords(blogTopic, "business", 25);

// Use keywords for:
// - Meta descriptions
// - Alt text
// - Header tags
// - Content optimization
```

### 2. Product Discovery & Search
```typescript
// Enhance product search with related terms
const product = "gaming laptop";
const result = await operator.operation({
  concept: product,
  expansionType: "all",
  maxResults: 15,
  domain: "consumer electronics"
});

// Use for:
// - Search suggestions
// - Related products
// - Category navigation
// - Filter options
```

### 3. Research & Academic Work
```typescript
// Expand research topic for comprehensive literature search
const researchTopic = "neural network optimization";
const academicTerms = await operator.operation({
  concept: researchTopic,
  expansionType: "search_terms",
  maxResults: 20,
  domain: "artificial intelligence",
  context: "Generate scholarly search terms for academic databases"
});

// Use for:
// - PubMed searches
// - Google Scholar queries
// - Database searches
// - Citation analysis
```

### 4. Content Strategy & Planning
```typescript
// Generate content ideas from core topic
const coreTopic = "sustainable living";
const contentIdeas = await operator.operation({
  concept: coreTopic,
  expansionType: "related_concepts",
  maxResults: 30,
  domain: "lifestyle",
  context: "Generate content topics for blog and social media"
});

// Use for:
// - Blog post ideas
// - Social media content
// - Video topics
// - Podcast episodes
```

### 5. E-commerce Category Management
```typescript
// Organize products into categories
const productType = "wireless earbuds";
const categories = await operator.operation({
  concept: productType,
  expansionType: "categories",
  maxResults: 12,
  domain: "consumer electronics"
});

// Use for:
// - Navigation menus
// - Product filters
// - Recommendation systems
// - Search facets
```

## Output Structure

```typescript
interface SimilarityOutput {
  originalConcept: string;          // The input concept
  similarTerms: string[];           // Main similar terms (always populated)
  synonyms?: string[];              // Alternative phrases (optional)
  relatedConcepts?: string[];       // Related concepts (optional)
  searchTerms?: string[];           // Search-optimized terms (optional)
  categories?: string[];            // Classifications (optional)
  confidence: number;               // Quality score (0-1)
  reasoning?: string;               // Explanation of relationships
}
```

## Best Practices

### 1. Choose Appropriate Expansion Type
- Use `"keywords"` for SEO and search optimization
- Use `"synonyms"` for content variation and readability
- Use `"related_concepts"` for discovery and exploration
- Use `"search_terms"` for research and database queries
- Use `"categories"` for organization and classification
- Use `"all"` for comprehensive analysis

### 2. Set Reasonable Result Limits
```typescript
// Good: Specific, manageable results
maxResults: 15

// Avoid: Too many results (overwhelming)
maxResults: 100

// Avoid: Too few results (limited value)
maxResults: 3
```

### 3. Provide Domain Context
```typescript
// Good: Specific domain
domain: "healthcare technology"

// Good: Industry-specific
domain: "financial services"

// Avoid: Too broad
domain: "business"
```

### 4. Use Descriptive Context
```typescript
// Good: Clear purpose
context: "Generate academic search terms for peer-reviewed journals"

// Good: Specific use case
context: "SEO keywords for product descriptions in e-commerce"

// Avoid: Vague context
context: "help me find stuff"
```

### 5. Handle Results Appropriately
```typescript
const result = await operator.operation(input);

// Check confidence before using results
if (result.confidence < 0.7) {
  console.warn("Low confidence results, consider refining input");
}

// Combine different result types
const allTerms = [
  ...result.similarTerms,
  ...(result.synonyms ?? []),
  ...(result.searchTerms ?? [])
].slice(0, 20); // Limit final results
```

## Integration Examples

### With Google Search Operator
```typescript
// 1. Expand concept to get search terms
const expansionResult = await similarityOperator.operation({
  concept: "quantum computing applications",
  expansionType: "search_terms",
  domain: "technology"
});

// 2. Use expanded terms for comprehensive search
for (const searchTerm of expansionResult.searchTerms.slice(0, 5)) {
  const searchResult = await googleSearchOperator.operation({
    query: searchTerm,
    maxResults: 10
  });
  // Process search results...
}
```

### With Structured Output Operator
```typescript
// 1. Get related concepts
const concepts = await similarityOperator.operation({
  concept: "sustainable packaging",
  expansionType: "related_concepts",
  domain: "environmental technology"
});

// 2. Extract structured data about each concept
for (const concept of concepts.relatedConcepts ?? []) {
  const structuredData = await structuredOutputOperator.operation({
    rawData: `Research ${concept} in the context of sustainable packaging`,
    outputSchema: z.object({
      definition: z.string(),
      applications: z.array(z.string()),
      benefits: z.array(z.string())
    })
  });
  // Use structured data...
}
```

## Error Handling

```typescript
try {
  const result = await operator.operation(input);

  // Check for empty results
  if (result.similarTerms.length === 0) {
    console.warn("No similar terms found, consider adjusting input");
  }

  // Check confidence
  if (result.confidence < 0.5) {
    console.warn("Low confidence results");
  }

} catch (error) {
  if (error.message.includes("Schema validation failed")) {
    // Handle validation errors
    console.error("Invalid response format:", error);
  } else {
    // Handle other errors
    console.error("Similarity expansion failed:", error);
  }
}
```

## Performance Considerations

- **Result Limits**: Keep `maxResults` reasonable (10-25) for optimal performance
- **Caching**: Consider caching results for frequently requested concepts
- **Batch Processing**: For multiple concepts, process them sequentially to avoid rate limits
- **Domain Specificity**: More specific domains generally produce better results faster

## Templates Integration

The similarity operator can be used in sheet templates for automatic concept expansion:

```typescript
// Template column configuration
{
  title: "Related Keywords",
  operatorType: "similarity_expansion",
  operatorConfig: {
    expansionType: "keywords",
    maxResults: 15,
    domain: "digital marketing"
  }
}
```

When a user enters a concept in the previous column, the similarity operator will automatically generate related keywords in this column.