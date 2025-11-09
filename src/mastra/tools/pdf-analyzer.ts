import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { vertex } from "@ai-sdk/google-vertex";
import { generateText } from "ai";

/**
 * PDF Analyzer Tool
 *
 * Uses Gemini's URL Context tool to analyze academic PDFs and extract
 * structured content including abstracts, methodologies, key findings,
 * citations, and research implications.
 *
 * Features:
 * - Deep content extraction from scientific papers
 * - Citation analysis and reference extraction
 * - Methodology identification
 * - Key findings summarization
 * - Figure and table descriptions
 */
export const pdfAnalyzerTool = createTool({
  id: "pdf-analyzer",
  description: "Analyze academic PDFs to extract abstracts, methodologies, key findings, citations, and research insights. Optimized for scientific papers and research documents.",
  inputSchema: z.object({
    pdfUrl: z.string().url().describe("The URL of the PDF to analyze"),
    analysisType: z.enum([
      "comprehensive", // Full analysis with all components
      "abstract", // Focus on abstract and summary
      "methodology", // Focus on research methods
      "findings", // Focus on results and conclusions
      "citations", // Focus on references and citations
      "figures" // Focus on figures and tables
    ]).default("comprehensive").describe("Type of analysis to perform"),
    researchField: z.string().optional().describe("The research field/domain to provide context (e.g., 'machine learning', 'biology', 'physics')"),
    specificQuestions: z.array(z.string()).optional().describe("Specific questions to answer about the paper"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    title: z.string().optional(),
    authors: z.array(z.string()).optional(),
    abstract: z.string().optional(),
    keyFindings: z.array(z.string()).optional(),
    methodology: z.object({
      approach: z.string().optional(),
      datasets: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
      metrics: z.array(z.string()).optional(),
    }).optional(),
    citations: z.object({
      totalReferences: z.number().optional(),
      keyReferences: z.array(z.object({
        title: z.string(),
        authors: z.string(),
        year: z.number().optional(),
      })).optional(),
      citationCount: z.number().optional(),
    }).optional(),
    figures: z.array(z.object({
      caption: z.string(),
      description: z.string(),
      insights: z.string(),
    })).optional(),
    implications: z.array(z.string()).optional(),
    limitations: z.array(z.string()).optional(),
    futureWork: z.array(z.string()).optional(),
    relatedTopics: z.array(z.string()).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { pdfUrl, analysisType, researchField, specificQuestions } = context;

      console.log(`[PDF Analyzer] Analyzing PDF: "${pdfUrl}" (type: ${analysisType})`);

      // Build analysis prompt based on type
      const prompt = buildAnalysisPrompt(pdfUrl, analysisType, researchField, specificQuestions);

      // Use Gemini with URL Context tool for PDF analysis
      const result = await generateText({
        model: vertex("gemini-2.5-flash"),
        tools: { url_context: vertex.tools.urlContext({}) },
        prompt,
      });

      console.log(`[PDF Analyzer] Raw analysis result:`, result.text);

      // Parse structured response
      const analysis = await parseAnalysisResponse(result.text, analysisType);

      return {
        success: true,
        ...analysis,
      };
    } catch (error) {
      console.error('[PDF Analyzer] Error:', error);
      return {
        success: false,
        error: `PDF analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});

/**
 * Build analysis prompt based on requested analysis type
 */
function buildAnalysisPrompt(
  pdfUrl: string,
  analysisType: string,
  researchField?: string,
  specificQuestions?: string[]
): string {
  const fieldContext = researchField ? `This is a ${researchField} research paper.` : '';
  const questionsContext = specificQuestions && specificQuestions.length > 0
    ? `\n\nSpecific questions to address:\n${specificQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : '';

  const basePrompt = `You are an expert academic researcher analyzing a scientific paper. ${fieldContext}

Analyze this PDF: ${pdfUrl}`;

  switch (analysisType) {
    case "comprehensive":
      return `${basePrompt}

Provide a comprehensive analysis in this JSON format:
{
  "title": "Paper title",
  "authors": ["Author 1", "Author 2"],
  "abstract": "Complete abstract text",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "methodology": {
    "approach": "Research approach/methodology used",
    "datasets": ["Dataset 1", "Dataset 2"],
    "tools": ["Tool/Software 1", "Tool 2"],
    "metrics": ["Metric 1", "Metric 2"]
  },
  "citations": {
    "totalReferences": 45,
    "keyReferences": [
      {"title": "Important Paper", "authors": "Smith et al.", "year": 2023}
    ],
    "citationCount": 127
  },
  "figures": [
    {
      "caption": "Figure caption",
      "description": "What the figure shows",
      "insights": "Key insights from this figure"
    }
  ],
  "implications": ["Implication 1", "Implication 2"],
  "limitations": ["Limitation 1", "Limitation 2"],
  "futureWork": ["Future direction 1", "Future direction 2"],
  "relatedTopics": ["Related topic 1", "Related topic 2"]
}${questionsContext}`;

    case "abstract":
      return `${basePrompt}

Extract and analyze the abstract and provide a summary in this JSON format:
{
  "title": "Paper title",
  "authors": ["Author names"],
  "abstract": "Complete abstract text",
  "keyFindings": ["Main finding 1", "Main finding 2"],
  "relatedTopics": ["Related topic 1", "Related topic 2"]
}${questionsContext}`;

    case "methodology":
      return `${basePrompt}

Focus on the research methodology and provide analysis in this JSON format:
{
  "methodology": {
    "approach": "Detailed research approach",
    "datasets": ["Dataset names and descriptions"],
    "tools": ["Software, tools, frameworks used"],
    "metrics": ["Evaluation metrics and measures"]
  },
  "limitations": ["Methodological limitations"],
  "implications": ["Methodological implications"]
}${questionsContext}`;

    case "findings":
      return `${basePrompt}

Focus on results and key findings in this JSON format:
{
  "keyFindings": ["Key finding 1 with details", "Key finding 2"],
  "figures": [
    {
      "caption": "Figure caption",
      "description": "What it shows",
      "insights": "Key insights"
    }
  ],
  "implications": ["Practical implication 1", "Theoretical implication 2"],
  "futureWork": ["Future research direction 1"]
}${questionsContext}`;

    case "citations":
      return `${basePrompt}

Focus on citations and references in this JSON format:
{
  "citations": {
    "totalReferences": 50,
    "keyReferences": [
      {"title": "Important Paper Title", "authors": "Author names", "year": 2023},
      {"title": "Another Key Paper", "authors": "Author names", "year": 2022}
    ],
    "citationCount": 89
  },
  "relatedTopics": ["Research area 1", "Research area 2"]
}${questionsContext}`;

    case "figures":
      return `${basePrompt}

Focus on figures, tables, and visual content in this JSON format:
{
  "figures": [
    {
      "caption": "Figure/Table caption from paper",
      "description": "Detailed description of what is shown",
      "insights": "Key insights and implications from this visual"
    }
  ],
  "keyFindings": ["Finding supported by visuals"]
}${questionsContext}`;

    default:
      return `${basePrompt}\n\nProvide a comprehensive analysis of this paper.${questionsContext}`;
  }
}

/**
 * Parse analysis response into structured format
 */
async function parseAnalysisResponse(responseText: string, analysisType: string): Promise<any> {
  try {
    // Remove markdown code blocks if present
    let jsonText = responseText;
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

    // Try to extract JSON from the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Fallback: create basic structure from text
    console.warn("[PDF Analyzer] Could not parse JSON, creating fallback structure");
    return createFallbackStructure(responseText, analysisType);
  } catch (parseError) {
    console.warn("[PDF Analyzer] JSON parsing failed, using fallback:", parseError);
    return createFallbackStructure(responseText, analysisType);
  }
}

/**
 * Create fallback structure when JSON parsing fails
 */
function createFallbackStructure(text: string, analysisType: string): any {
  const baseStructure = {
    title: extractTitle(text) || "Document Analysis",
    keyFindings: extractBulletPoints(text, /(?:key findings?|results?|conclusions?):/i) || [text.slice(0, 500)],
  };

  switch (analysisType) {
    case "comprehensive":
      return {
        ...baseStructure,
        abstract: extractSection(text, /abstract:?/i) || text.slice(0, 300),
        authors: extractAuthors(text),
        methodology: {
          approach: extractSection(text, /methodology|methods?:/i),
          datasets: extractBulletPoints(text, /datasets?:/i),
          tools: extractBulletPoints(text, /tools?|software:/i),
          metrics: extractBulletPoints(text, /metrics?:/i),
        },
        implications: extractBulletPoints(text, /implications?:/i),
        limitations: extractBulletPoints(text, /limitations?:/i),
        futureWork: extractBulletPoints(text, /future\s*work|future\s*research:/i),
        relatedTopics: extractBulletPoints(text, /related\s*topics?:/i),
      };
    case "methodology":
      return {
        methodology: {
          approach: extractSection(text, /approach|methodology:/i) || text.slice(0, 400),
          datasets: extractBulletPoints(text, /datasets?:/i),
          tools: extractBulletPoints(text, /tools?:/i),
          metrics: extractBulletPoints(text, /metrics?:/i),
        },
      };
    default:
      return baseStructure;
  }
}

/**
 * Helper functions for text extraction
 */
function extractTitle(text: string): string | null {
  const titleMatch = text.match(/title[:\s]*(.+?)(?:\n|$)/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

function extractAuthors(text: string): string[] {
  const authorMatch = text.match(/authors?[:\s]*(.+?)(?:\n|$)/i);
  if (authorMatch) {
    return authorMatch[1].split(/[,;]/).map(a => a.trim()).filter(Boolean);
  }
  return [];
}

function extractSection(text: string, pattern: RegExp): string | null {
  const match = text.match(new RegExp(pattern.source + '\\s*(.+?)(?:\\n\\n|$)', 'is'));
  return match ? match[1].trim() : null;
}

function extractBulletPoints(text: string, sectionPattern: RegExp): string[] | null {
  const sectionMatch = text.match(new RegExp(sectionPattern.source + '\\s*([\\s\\S]*?)(?:\\n\\n|$)', 'i'));
  if (sectionMatch) {
    const section = sectionMatch[1];
    const bullets = section.match(/[-•*]\s*(.+?)(?=\n|$)/g);
    return bullets ? bullets.map(b => b.replace(/^[-•*]\s*/, '').trim()) : null;
  }
  return null;
}