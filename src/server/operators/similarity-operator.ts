/**
 * Similarity & Concept Expansion Operator
 *
 * Generates similar concepts, related keywords, and expanded search terms
 * using Gemini's semantic understanding. Perfect for populating search
 * keyword columns and finding related concepts.
 */

import { getGeminiClient } from "@/server/gemini/client";
import { CONSERVATIVE_GENERATION_CONFIG, DEFAULT_MODEL } from "@/server/gemini/config";
import type { BaseOperator } from "@/types/operators";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Input for similarity/concept expansion operation
 */
export interface SimilarityInput {
  /** The concept, keyword, or phrase to expand upon */
  concept: string;
  /** Type of expansion needed */
  expansionType: "keywords" | "synonyms" | "related_concepts" | "search_terms" | "categories" | "all";
  /** Number of results to generate (default: 10) */
  maxResults?: number;
  /** Domain or context to focus on (e.g., "technology", "marketing", "healthcare") */
  domain?: string;
  /** Additional context or constraints */
  context?: string;
}

/**
 * Output from similarity/concept expansion
 */
export interface SimilarityOutput {
  /** The original concept that was expanded */
  originalConcept: string;
  /** Generated similar terms/concepts */
  similarTerms: string[];
  /** Synonyms and alternative phrases */
  synonyms?: string[];
  /** Related concepts in the same domain */
  relatedConcepts?: string[];
  /** Optimized search terms for search engines */
  searchTerms?: string[];
  /** Categories the concept belongs to */
  categories?: string[];
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning for the suggestions */
  reasoning?: string;
}

/**
 * Schema for structured similarity output
 */
const SimilarityOutputSchema = z.object({
  similarTerms: z.array(z.string()).describe("Similar terms and keywords"),
  synonyms: z.array(z.string()).optional().describe("Synonyms and alternative phrases"),
  relatedConcepts: z.array(z.string()).optional().describe("Related concepts in the same domain"),
  searchTerms: z.array(z.string()).optional().describe("Optimized search terms"),
  categories: z.array(z.string()).optional().describe("Categories the concept belongs to"),
  reasoning: z.string().optional().describe("Brief explanation of the relationships")
});

export class SimilarityExpansionOperator
  implements BaseOperator<SimilarityInput, SimilarityOutput>
{
  readonly name = "similarity_expansion";
  readonly inputType = "SimilarityInput";
  readonly outputType = "SimilarityOutput";

  /**
   * Generate similar concepts and expanded terms
   */
  async operation(input: SimilarityInput): Promise<SimilarityOutput> {
    const client = getGeminiClient();
    const maxResults = input.maxResults ?? 10;

    try {
      const prompt = this.buildPrompt(input, maxResults);
      const jsonSchema = zodToJsonSchema(SimilarityOutputSchema);

      // Call Gemini with structured output
      const response = await client.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          ...CONSERVATIVE_GENERATION_CONFIG,
        },
      });

      const structuredData = SimilarityOutputSchema.parse(
        JSON.parse(response.text ?? "{}")
      );

      // Build the final output
      const output: SimilarityOutput = {
        originalConcept: input.concept,
        similarTerms: structuredData.similarTerms,
        confidence: this.calculateConfidence(response, structuredData.similarTerms.length),
        ...(structuredData.synonyms && { synonyms: structuredData.synonyms }),
        ...(structuredData.relatedConcepts && { relatedConcepts: structuredData.relatedConcepts }),
        ...(structuredData.searchTerms && { searchTerms: structuredData.searchTerms }),
        ...(structuredData.categories && { categories: structuredData.categories }),
        ...(structuredData.reasoning && { reasoning: structuredData.reasoning }),
      };

      return output;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Schema validation failed: ${error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
        );
      }

      throw new Error(
        `Similarity expansion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Build the prompt based on expansion type and context
   */
  private buildPrompt(input: SimilarityInput, maxResults: number): string {
    const { concept, expansionType, domain, context } = input;

    let basePrompt = `Generate similar concepts and related terms for: "${concept}"`;

    if (domain) {
      basePrompt += `\nDomain/Context: ${domain}`;
    }

    if (context) {
      basePrompt += `\nAdditional context: ${context}`;
    }

    basePrompt += `\nGenerate up to ${maxResults} results for each category where applicable.`;

    switch (expansionType) {
      case "keywords":
        return `${basePrompt}

Focus on generating SEO-optimized keywords and search terms. Include:
- Direct keywords related to the concept
- Long-tail keyword variations
- Terms people might search for when looking for this concept

Provide results primarily in 'similarTerms' and 'searchTerms' arrays.`;

      case "synonyms":
        return `${basePrompt}

Focus on finding synonyms and alternative ways to express the same concept. Include:
- Direct synonyms
- Alternative phrases
- Different ways to say the same thing
- Industry-specific terminology

Provide results primarily in 'similarTerms' and 'synonyms' arrays.`;

      case "related_concepts":
        return `${basePrompt}

Focus on finding related concepts and ideas in the same domain. Include:
- Concepts that are closely related
- Concepts in the same category
- Complementary concepts
- Concepts that often appear together

Provide results primarily in 'similarTerms' and 'relatedConcepts' arrays.`;

      case "search_terms":
        return `${basePrompt}

Focus on generating effective search engine queries and terms. Include:
- Search queries people would use
- Google search variations
- Academic search terms
- Research keywords

Provide results primarily in 'similarTerms' and 'searchTerms' arrays.`;

      case "categories":
        return `${basePrompt}

Focus on categorization and classification. Include:
- Categories the concept belongs to
- Taxonomic classifications
- Industry categories
- Conceptual groupings

Provide results primarily in 'categories' and 'relatedConcepts' arrays.`;

      case "all":
      default:
        return `${basePrompt}

Provide comprehensive expansion including:
1. Similar terms and keywords
2. Synonyms and alternative phrases
3. Related concepts in the same domain
4. Optimized search terms for search engines
5. Categories and classifications

Fill all applicable arrays with relevant results.`;
    }
  }

  /**
   * Calculate confidence based on response quality and result count
   */
  private calculateConfidence(
    response: { candidates?: Array<{ finishReason?: string }> },
    resultCount: number
  ): number {
    const finishReason = response.candidates?.[0]?.finishReason;

    let baseConfidence: number;
    switch (finishReason) {
      case "STOP":
        baseConfidence = 1.0;
        break;
      case "MAX_TOKENS":
        baseConfidence = 0.7;
        break;
      case "SAFETY":
        baseConfidence = 0.3;
        break;
      case "RECITATION":
        baseConfidence = 0.5;
        break;
      default:
        baseConfidence = 0.8;
    }

    // Adjust confidence based on result count
    // More results generally indicate better understanding
    const resultQuality = Math.min(resultCount / 5, 1.0); // Normalize to 5+ results = full quality

    return Math.round((baseConfidence * 0.7 + resultQuality * 0.3) * 100) / 100;
  }

  /**
   * Post-processing: Log the expansion results
   */
  async next?(output: SimilarityOutput): Promise<void> {
    console.log(
      `[SimilarityOperator] Expanded "${output.originalConcept}" into ${output.similarTerms.length} similar terms with ${output.confidence * 100}% confidence`
    );
  }

  /**
   * Error handling
   */
  async onError?(error: Error, input: SimilarityInput): Promise<void> {
    console.error(
      `[SimilarityOperator] Failed to expand concept "${input.concept}":`,
      error
    );
  }
}

/**
 * Predefined expansion presets for common use cases
 */
export const SimilarityPresets = {
  /**
   * SEO keyword expansion for content marketing
   */
  seoKeywords: (concept: string, domain?: string): SimilarityInput => ({
    concept,
    expansionType: "keywords",
    maxResults: 15,
    domain: domain ?? "digital marketing",
    context: "Generate SEO-friendly keywords for content optimization and search ranking"
  }),

  /**
   * Academic research terms
   */
  researchTerms: (concept: string, domain?: string): SimilarityInput => ({
    concept,
    expansionType: "search_terms",
    maxResults: 12,
    domain: domain ?? "academic research",
    context: "Generate scholarly search terms for academic databases and research"
  }),

  /**
   * Product category expansion for e-commerce
   */
  productCategories: (concept: string): SimilarityInput => ({
    concept,
    expansionType: "categories",
    maxResults: 10,
    domain: "e-commerce",
    context: "Generate product categories and classifications for online stores"
  }),

  /**
   * Content ideation and brainstorming
   */
  contentIdeas: (concept: string, domain?: string): SimilarityInput => ({
    concept,
    expansionType: "related_concepts",
    maxResults: 20,
    domain,
    context: "Generate related topics and ideas for content creation and brainstorming"
  }),

  /**
   * Comprehensive expansion for data enrichment
   */
  dataEnrichment: (concept: string, domain?: string): SimilarityInput => ({
    concept,
    expansionType: "all",
    maxResults: 12,
    domain,
    context: "Comprehensive concept expansion for data enrichment and knowledge graphs"
  })
};

/**
 * Helper: Quick concept expansion with preset configurations
 */
export async function expandConcept(
  concept: string,
  preset: keyof typeof SimilarityPresets = "dataEnrichment",
  domain?: string
): Promise<SimilarityOutput> {
  const operator = new SimilarityExpansionOperator();
  const input = SimilarityPresets[preset](concept, domain);

  return operator.operation(input);
}

/**
 * Helper: Generate search keywords specifically
 */
export async function generateSearchKeywords(
  concept: string,
  domain?: string,
  maxResults = 15
): Promise<string[]> {
  const operator = new SimilarityExpansionOperator();
  const result = await operator.operation({
    concept,
    expansionType: "keywords",
    maxResults,
    domain,
    context: "Focus on search engine optimization and discoverability"
  });

  return [
    ...result.similarTerms,
    ...(result.searchTerms ?? []),
    ...(result.synonyms ?? [])
  ].slice(0, maxResults);
}