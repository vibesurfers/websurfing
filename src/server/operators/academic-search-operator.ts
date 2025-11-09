/**
 * Academic PDF Search Operator
 *
 * Specialized operator for finding highly referenced scientific papers and PDFs.
 * Optimizes search queries specifically for academic literature discovery.
 *
 * Features:
 * - PDF-focused search queries
 * - Citation count optimization
 * - Academic database targeting
 * - Research quality filtering
 */

import { getGeminiClient } from "@/server/gemini/client";
import { DEFAULT_MODEL } from "@/server/gemini/config";
import type {
  GoogleSearchInput,
  GoogleSearchOutput,
  BaseOperator,
  SearchResult,
} from "@/types/operators";

export interface AcademicSearchInput extends GoogleSearchInput {
  topic: string;
  researchField?: string; // e.g., "machine learning", "biology", "physics"
  yearRange?: { start?: number; end?: number };
  minCitations?: number;
  includeReviews?: boolean; // Include review papers
  authorFilter?: string; // Specific authors to search for
}

export interface AcademicSearchOutput extends GoogleSearchOutput {
  academicResults: AcademicResult[];
  totalPdfsFound: number;
  averageCitations?: number;
}

export interface AcademicResult extends SearchResult {
  estimatedCitations?: number;
  publicationYear?: number;
  journal?: string;
  isPdfDirect?: boolean;
  isHighImpact?: boolean;
  academicSource?: 'arxiv' | 'pubmed' | 'scholar' | 'researchgate' | 'semantic_scholar' | 'other';
}

export class AcademicPDFSearchOperator implements BaseOperator<AcademicSearchInput, AcademicSearchOutput> {
  readonly name = "academic_pdf_search";
  readonly inputType = "AcademicSearchInput";
  readonly outputType = "AcademicSearchOutput";

  /**
   * Execute specialized academic search for highly referenced PDFs
   */
  async operation(input: AcademicSearchInput): Promise<AcademicSearchOutput> {
    const client = getGeminiClient();
    const maxResults = input.maxResults ?? 15;

    try {
      // Build academic-focused search query
      const academicQuery = this.buildAcademicQuery(input);

      console.log('[AcademicPDFSearchOperator] Constructed academic query:', academicQuery);

      // Configure Google Search with academic focus
      const config = {
        tools: [{ googleSearch: {} }],
      };

      // Execute search with academic optimization prompt
      const response = await client.models.generateContent({
        model: DEFAULT_MODEL,
        contents: this.buildAcademicSearchPrompt(academicQuery, input),
        config,
      });

      // Extract grounding metadata
      const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

      // Process results with academic focus
      const results: SearchResult[] = [];
      const academicResults: AcademicResult[] = [];

      if (groundingMetadata?.groundingChunks) {
        for (let i = 0; i < Math.min(groundingMetadata.groundingChunks.length, maxResults); i++) {
          const chunk = groundingMetadata.groundingChunks[i];
          if (chunk?.web?.uri) {
            const result: SearchResult = {
              title: chunk.web.title ?? "Academic Paper",
              url: chunk.web.uri,
              snippet: this.extractSnippet(response.text ?? "", groundingMetadata, i),
            };

            results.push(result);

            // Enhance with academic metadata
            const academicResult = this.enhanceWithAcademicMetadata(result, input);
            academicResults.push(academicResult);
          }
        }
      }

      const pdfResults = academicResults.filter(r => r.isPdfDirect || r.url.includes('.pdf'));

      return {
        results,
        academicResults,
        totalPdfsFound: pdfResults.length,
        averageCitations: this.calculateAverageCitations(academicResults),
        webSearchQueries: groundingMetadata?.webSearchQueries || [],
        groundingMetadata,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Academic PDF Search operation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Build academic-focused search query
   */
  private buildAcademicQuery(input: AcademicSearchInput): string {
    let query = input.topic;

    // Add academic keywords for better targeting
    const academicKeywords = [
      'filetype:pdf',
      'research paper',
      'journal article',
      'study',
      'citation'
    ];

    // Add field-specific terms
    if (input.researchField) {
      query = `${input.researchField} ${query}`;
    }

    // Add site-specific searches for academic databases
    const academicSites = [
      'site:arxiv.org',
      'site:pubmed.ncbi.nlm.nih.gov',
      'site:scholar.google.com',
      'site:researchgate.net',
      'site:semanticscholar.org',
      'site:academia.edu',
      'site:ieee.org',
      'site:acm.org',
      'site:springer.com',
      'site:nature.com',
      'site:science.org'
    ];

    // Priority search: direct PDF files from academic sources
    const pdfQuery = `${query} ${academicKeywords[0]} (${academicSites.slice(0, 6).join(' OR ')})`;

    // Secondary search: academic articles with citation indicators
    const citationQuery = `${query} "cited by" "citations" (${academicKeywords.slice(1).join(' OR ')})`;

    // Year filtering
    if (input.yearRange) {
      if (input.yearRange.start && input.yearRange.end) {
        query += ` after:${input.yearRange.start} before:${input.yearRange.end}`;
      } else if (input.yearRange.start) {
        query += ` after:${input.yearRange.start}`;
      }
    }

    // Author filtering
    if (input.authorFilter) {
      query += ` author:"${input.authorFilter}"`;
    }

    // Combine queries for comprehensive search
    return `(${pdfQuery}) OR (${citationQuery})`;
  }

  /**
   * Build academic search prompt for Gemini
   */
  private buildAcademicSearchPrompt(query: string, input: AcademicSearchInput): string {
    const prompt = `You are an academic research assistant specializing in finding high-quality, peer-reviewed research papers and scientific literature.

SEARCH FOCUS: ${input.topic}
${input.researchField ? `RESEARCH FIELD: ${input.researchField}` : ''}

SEARCH STRATEGY:
1. Prioritize peer-reviewed journal articles and conference papers
2. Focus on papers with high citation counts (${input.minCitations || 'any'} citations minimum)
3. Look for direct PDF links when possible
4. Include seminal papers and recent breakthrough research
5. Target academic databases and repositories

QUALITY INDICATORS to look for:
- Papers published in high-impact journals
- Articles with substantial citation counts
- Research from established institutions
- Papers with comprehensive bibliographies
- Review articles summarizing the field

SEARCH QUERY: ${query}

Please search for the most relevant, highly-cited academic papers and provide results that include:
- Direct PDF access when available
- Publication details (journal, year, authors)
- Citation indicators
- Research significance markers

Focus on finding the most authoritative and influential research on this topic.`;

    return prompt;
  }

  /**
   * Extract snippet text for a specific grounding chunk
   */
  private extractSnippet(
    responseText: string,
    groundingMetadata: NonNullable<GoogleSearchOutput["groundingMetadata"]>,
    chunkIndex: number
  ): string {
    // Find all segments that reference this chunk
    const relevantSegments = groundingMetadata.groundingSupports?.filter(
      (support) =>
        support.groundingChunkIndices?.includes(chunkIndex)
    );

    if (!relevantSegments || relevantSegments.length === 0) {
      return responseText.slice(0, 300) + (responseText.length > 300 ? "..." : "");
    }

    const firstSegment = relevantSegments[0]?.segment;
    if (firstSegment?.text) {
      return firstSegment.text;
    }

    if (firstSegment?.startIndex !== undefined && firstSegment?.endIndex !== undefined) {
      return responseText.slice(firstSegment.startIndex, firstSegment.endIndex);
    }

    return responseText.slice(0, 300) + (responseText.length > 300 ? "..." : "");
  }

  /**
   * Enhance search result with academic metadata
   */
  private enhanceWithAcademicMetadata(result: SearchResult, input: AcademicSearchInput): AcademicResult {
    const url = result.url.toLowerCase();
    const title = result.title.toLowerCase();
    const snippet = result.snippet.toLowerCase();

    // Detect academic source
    let academicSource: AcademicResult['academicSource'] = 'other';
    if (url.includes('arxiv.org')) academicSource = 'arxiv';
    else if (url.includes('pubmed') || url.includes('ncbi.nlm.nih.gov')) academicSource = 'pubmed';
    else if (url.includes('scholar.google')) academicSource = 'scholar';
    else if (url.includes('researchgate')) academicSource = 'researchgate';
    else if (url.includes('semanticscholar')) academicSource = 'semantic_scholar';

    // Detect direct PDF
    const isPdfDirect = url.includes('.pdf') || url.includes('pdf') || title.includes('pdf');

    // Estimate citations from snippet
    const estimatedCitations = this.extractCitationCount(snippet);

    // Extract publication year
    const publicationYear = this.extractYear(snippet + ' ' + title);

    // Extract journal name
    const journal = this.extractJournal(snippet + ' ' + title);

    // Determine if high impact
    const isHighImpact = this.isHighImpactResult(result, estimatedCitations, academicSource);

    return {
      ...result,
      estimatedCitations,
      publicationYear,
      journal,
      isPdfDirect,
      isHighImpact,
      academicSource,
    };
  }

  /**
   * Extract citation count from text
   */
  private extractCitationCount(text: string): number | undefined {
    const citationPatterns = [
      /cited by (\d+)/i,
      /(\d+) citations?/i,
      /citations?: (\d+)/i,
      /\((\d+) cit/i,
    ];

    for (const pattern of citationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }

  /**
   * Extract publication year
   */
  private extractYear(text: string): number | undefined {
    const currentYear = new Date().getFullYear();
    const yearPattern = /\b(19[89]\d|20[0-9]\d)\b/g;
    const matches = text.match(yearPattern);

    if (matches) {
      // Return the most recent reasonable year
      const years = matches.map(y => parseInt(y, 10)).filter(y => y <= currentYear);
      return Math.max(...years);
    }

    return undefined;
  }

  /**
   * Extract journal name
   */
  private extractJournal(text: string): string | undefined {
    const journalPatterns = [
      /published in ([^.,;]+)/i,
      /journal of ([^.,;]+)/i,
      /proceedings of ([^.,;]+)/i,
      /nature ([^.,;]+)?/i,
      /science ([^.,;]+)?/i,
    ];

    for (const pattern of journalPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    return undefined;
  }

  /**
   * Determine if result is high impact
   */
  private isHighImpactResult(
    result: SearchResult,
    citations?: number,
    source?: string
  ): boolean {
    const url = result.url.toLowerCase();
    const title = result.title.toLowerCase();

    // High citation count
    if (citations && citations > 100) return true;

    // Prestigious journals/sources
    if (url.includes('nature.com') || url.includes('science.org')) return true;
    if (title.includes('nature') || title.includes('science')) return true;

    // ArXiv papers (often cutting-edge)
    if (source === 'arxiv') return true;

    // Review papers are generally high impact
    if (title.includes('review') || title.includes('survey')) return true;

    return false;
  }

  /**
   * Calculate average citations across results
   */
  private calculateAverageCitations(results: AcademicResult[]): number | undefined {
    const citedResults = results.filter(r => r.estimatedCitations !== undefined);
    if (citedResults.length === 0) return undefined;

    const totalCitations = citedResults.reduce((sum, r) => sum + (r.estimatedCitations || 0), 0);
    return Math.round(totalCitations / citedResults.length);
  }

  /**
   * Post-processing for academic results
   */
  async next?(output: AcademicSearchOutput): Promise<void> {
    console.log(
      `[AcademicPDFSearchOperator] Found ${output.academicResults.length} academic papers, ${output.totalPdfsFound} direct PDFs`
    );

    const highImpactCount = output.academicResults.filter(r => r.isHighImpact).length;
    console.log(`[AcademicPDFSearchOperator] ${highImpactCount} high-impact papers identified`);

    if (output.averageCitations) {
      console.log(`[AcademicPDFSearchOperator] Average citations: ${output.averageCitations}`);
    }
  }

  /**
   * Error handling
   */
  async onError?(error: Error, input: AcademicSearchInput): Promise<void> {
    console.error(
      `[AcademicPDFSearchOperator] Error processing academic search for "${input.topic}":`,
      error
    );
  }
}