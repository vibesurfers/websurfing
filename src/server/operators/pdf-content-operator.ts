/**
 * PDF Content Operator
 *
 * Specialized operator for analyzing PDF content at the cell level.
 * Uses Gemini's URL Context tool to extract specific information
 * from academic papers and research documents based on column configuration.
 *
 * Features:
 * - URL validation and PDF detection
 * - Content extraction based on column prompts
 * - Academic paper analysis
 * - Citation and reference extraction
 * - Methodology and findings extraction
 * - Figure and table analysis
 */

import { getGeminiClient } from "@/server/gemini/client";
import { DEFAULT_MODEL } from "@/server/gemini/config";
import { resolveRedirectUrls } from "@/server/utils/url-resolver";
import type {
  URLContextInput,
  URLContextOutput,
  BaseOperator,
} from "@/types/operators";

export interface PDFContentInput extends URLContextInput {
  pdfUrl: string;
  analysisType?: 'abstract' | 'methodology' | 'findings' | 'citations' | 'custom';
  researchField?: string;
  specificPrompt?: string;
}

export interface PDFContentOutput extends URLContextOutput {
  extractedContent: string;
  contentType: string;
  confidence: number;
  isPdf: boolean;
  title?: string;
  authors?: string[];
}

export class PDFContentOperator implements BaseOperator<PDFContentInput, PDFContentOutput> {
  readonly name = "pdf_content";
  readonly inputType = "PDFContentInput";
  readonly outputType = "PDFContentOutput";

  /**
   * Execute PDF content extraction via Gemini URL Context
   */
  async operation(input: PDFContentInput): Promise<PDFContentOutput> {
    const client = getGeminiClient();

    try {
      console.log(`[PDF Content] Analyzing: ${input.pdfUrl}`);
      console.log(`[PDF Content] Analysis type: ${input.analysisType || 'custom'}`);

      // Validate and resolve URL
      const resolvedUrls = await resolveRedirectUrls([input.pdfUrl]);
      const resolvedUrl = resolvedUrls[0];

      if (!resolvedUrl) {
        throw new Error("Could not resolve PDF URL");
      }

      // Detect if URL is likely a PDF
      const isPdf = this.isPdfUrl(resolvedUrl);

      // Build extraction prompt based on analysis type and column context
      const prompt = this.buildExtractionPrompt(resolvedUrl, input);

      // Configure URL Context tool
      const config = {
        tools: [{ urlContext: {} }],
      };

      console.log(`[PDF Content] Using prompt:`, prompt);

      // Call Gemini with URL context
      const response = await client.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config,
      });

      const extractedText = response.text || "";

      console.log(`[PDF Content] Extracted ${extractedText.length} characters`);

      // Parse response to extract structured content
      const analysis = this.parseExtractedContent(extractedText, input.analysisType);

      return {
        extractedContent: analysis.content,
        contentType: analysis.type,
        confidence: analysis.confidence,
        isPdf,
        title: analysis.title,
        authors: analysis.authors,
        results: [], // Legacy URLContextOutput field
        enrichedData: [], // Legacy URLContextOutput field
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `PDF content extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if URL is likely a PDF
   */
  private isPdfUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    return (
      urlLower.includes('.pdf') ||
      urlLower.includes('pdf') ||
      urlLower.includes('arxiv.org/pdf') ||
      urlLower.includes('biorxiv.org') ||
      urlLower.includes('medrxiv.org') ||
      urlLower.includes('researchgate.net') && urlLower.includes('publication')
    );
  }

  /**
   * Build extraction prompt based on analysis type and column configuration
   */
  private buildExtractionPrompt(url: string, input: PDFContentInput): string {
    const fieldContext = input.researchField
      ? `This document is from the ${input.researchField} field.`
      : '';

    const customPrompt = input.specificPrompt
      ? `\n\nSpecific extraction requirement: ${input.specificPrompt}`
      : '';

    const basePrompt = `You are analyzing a research document. ${fieldContext}

Document URL: ${url}`;

    switch (input.analysisType) {
      case 'abstract':
        return `${basePrompt}

Extract the abstract/summary of this paper. Return only the abstract text, complete and unmodified.
If no abstract is found, return a brief summary of the main points in 2-3 sentences.${customPrompt}`;

      case 'methodology':
        return `${basePrompt}

Extract the methodology/methods section of this research paper. Focus on:
- Research approach and design
- Data collection methods
- Tools and software used
- Statistical methods or algorithms
- Experimental setup

Return a clear, concise description of the methodology.${customPrompt}`;

      case 'findings':
        return `${basePrompt}

Extract the key findings and results from this research paper. Focus on:
- Main experimental results
- Key discoveries or insights
- Quantitative findings and metrics
- Significant outcomes
- Novel contributions

Return the most important findings in a clear, structured format.${customPrompt}`;

      case 'citations':
        return `${basePrompt}

Extract citation and reference information from this paper. Focus on:
- Total number of references
- Key cited works (most important 3-5 references)
- Author names and publication years of major citations
- Research areas of referenced work

Return structured citation information.${customPrompt}`;

      default:
        // Custom or unspecified analysis
        const defaultPrompt = input.extractionPrompt ||
          "Extract the most relevant information from this document based on the context.";

        return `${basePrompt}

${defaultPrompt}${customPrompt}

Please provide clear, accurate information extracted from the document.`;
    }
  }

  /**
   * Parse extracted content and determine type/confidence
   */
  private parseExtractedContent(text: string, analysisType?: string): {
    content: string;
    type: string;
    confidence: number;
    title?: string;
    authors?: string[];
  } {
    if (!text || text.trim().length === 0) {
      return {
        content: "",
        type: "empty",
        confidence: 0,
      };
    }

    // Determine content type
    const type = this.determineContentType(text, analysisType);

    // Calculate confidence based on content quality indicators
    const confidence = this.calculateConfidence(text, type);

    // Try to extract title and authors if present
    const title = this.extractTitle(text);
    const authors = this.extractAuthors(text);

    return {
      content: text.trim(),
      type,
      confidence,
      title,
      authors,
    };
  }

  /**
   * Determine the type of extracted content
   */
  private determineContentType(text: string, analysisType?: string): string {
    const textLower = text.toLowerCase();

    // Use analysis type if specified
    if (analysisType && ['abstract', 'methodology', 'findings', 'citations'].includes(analysisType)) {
      return analysisType;
    }

    // Auto-detect content type based on keywords
    if (textLower.includes('abstract') || textLower.includes('summary')) {
      return 'abstract';
    }

    if (textLower.includes('method') || textLower.includes('approach') || textLower.includes('experiment')) {
      return 'methodology';
    }

    if (textLower.includes('result') || textLower.includes('finding') || textLower.includes('conclusion')) {
      return 'findings';
    }

    if (textLower.includes('reference') || textLower.includes('citation') || textLower.includes('bibliography')) {
      return 'citations';
    }

    return 'general';
  }

  /**
   * Calculate confidence score for extracted content
   */
  private calculateConfidence(text: string, type: string): number {
    let confidence = 0.5; // Base confidence

    // Length indicators
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 50) confidence += 0.2;
    if (wordCount > 200) confidence += 0.1;

    // Academic indicators
    const academicTerms = ['research', 'study', 'analysis', 'method', 'result', 'conclusion', 'significant', 'p <', 'statistical'];
    const academicCount = academicTerms.filter(term => text.toLowerCase().includes(term)).length;
    confidence += Math.min(academicCount * 0.05, 0.2);

    // Structure indicators
    if (text.includes('\n') || text.includes('•') || text.includes('-')) {
      confidence += 0.1; // Well-structured content
    }

    // Type-specific indicators
    switch (type) {
      case 'abstract':
        if (text.toLowerCase().includes('abstract')) confidence += 0.1;
        if (wordCount >= 100 && wordCount <= 300) confidence += 0.1; // Typical abstract length
        break;
      case 'methodology':
        if (text.toLowerCase().includes('participants') || text.toLowerCase().includes('subjects')) confidence += 0.1;
        if (text.toLowerCase().includes('procedure') || text.toLowerCase().includes('protocol')) confidence += 0.1;
        break;
      case 'findings':
        if (text.includes('%') || text.includes('p =') || text.includes('significant')) confidence += 0.1;
        break;
      case 'citations':
        if (text.includes('et al.') || text.includes('(20')) confidence += 0.1;
        break;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Extract title from text
   */
  private extractTitle(text: string): string | undefined {
    // Look for title patterns
    const titlePatterns = [
      /title[:\s]*(.+?)(?:\n|$)/i,
      /^(.+?)(?:\n|$)/,
    ];

    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const title = match[1].trim();
        if (title.length > 10 && title.length < 200) {
          return title;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract authors from text
   */
  private extractAuthors(text: string): string[] | undefined {
    const authorPatterns = [
      /authors?[:\s]*(.+?)(?:\n|$)/i,
      /by[:\s]*(.+?)(?:\n|$)/i,
    ];

    for (const pattern of authorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const authorsText = match[1].trim();
        // Split by common delimiters
        const authors = authorsText
          .split(/[,;]|and\s/)
          .map(author => author.trim())
          .filter(author => author.length > 2 && author.length < 50);

        if (authors.length > 0 && authors.length <= 20) {
          return authors;
        }
      }
    }

    return undefined;
  }

  /**
   * Post-processing for PDF content results
   */
  async next?(output: PDFContentOutput): Promise<void> {
    console.log(`[PDF Content] Extracted ${output.extractedContent.length} chars`);
    console.log(`[PDF Content] Content type: ${output.contentType}`);
    console.log(`[PDF Content] Confidence: ${(output.confidence * 100).toFixed(1)}%`);

    if (output.title) {
      console.log(`[PDF Content] Title: ${output.title}`);
    }

    if (output.authors && output.authors.length > 0) {
      console.log(`[PDF Content] Authors: ${output.authors.join(', ')}`);
    }
  }

  /**
   * Error handling
   */
  async onError?(error: Error, input: PDFContentInput): Promise<void> {
    console.error(
      `[PDF Content] Error processing "${input.pdfUrl}":`,
      error
    );
  }
}