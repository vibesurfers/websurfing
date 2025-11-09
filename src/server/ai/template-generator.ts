import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { getGeminiClient } from "../gemini/client";
import { DEFAULT_GENERATION_CONFIG, GEMINI_MODELS } from "../gemini/config";

// Schema for a single column configuration
const columnConfigSchema = z.object({
  title: z.string().describe("Column header title"),
  position: z.number().int().describe("0-based position in the spreadsheet"),
  operatorType: z
    .enum(["google_search", "url_context", "structured_output", "function_calling", "academic_search", "similarity_expansion"])
    .describe("Type of AI operator to use for this column"),
  prompt: z
    .string()
    .describe("Instructions for the AI on how to fill this column"),
  dataType: z
    .enum(["text", "url", "email", "number", "json"])
    .default("text")
    .describe("Expected data type for this column"),
  dependencies: z
    .array(z.number())
    .optional()
    .describe("Positions of columns this depends on (e.g., [0, 1] means use data from first two columns)"),
  isRequired: z.boolean().default(false).describe("Whether this column must have a value"),
  operatorConfig: z
    .record(z.any())
    .optional()
    .describe("Operator-specific configuration"),
});

// Schema for the complete template
const templateConfigSchema = z.object({
  name: z.string().describe("Template name (e.g., 'LinkedIn Lead Finder')"),
  description: z
    .string()
    .describe("Brief description of what this template does"),
  icon: z
    .string()
    .optional()
    .describe("Emoji or icon identifier (e.g., '🔍', '📊')"),
  isAutonomous: z
    .boolean()
    .default(false)
    .describe("Whether the template runs autonomously (fills all columns without user intervention)"),
  systemPrompt: z
    .string()
    .optional()
    .describe("Overall guidance for the AI when using this template"),
  columns: z.array(columnConfigSchema).describe("Array of column configurations"),
});

export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export type ColumnConfig = z.infer<typeof columnConfigSchema>;

/**
 * Generate a template configuration from a natural language description
 *
 * @param userDescription - User's description of the workflow they want to create
 * @param userId - User ID for context (optional)
 * @returns Generated template configuration
 *
 * @example
 * const config = await generateTemplateFromDescription(
 *   "I want to find LinkedIn profiles for companies. Start with company name, find their website, then get LinkedIn company page, then find key people."
 * );
 */
export async function generateTemplateFromDescription(
  userDescription: string,
  userId?: string
): Promise<TemplateConfig> {
  const client = await getGeminiClient();

  // Detect if this is a science-focused request
  const isScienceTrack = detectScienceTrack(userDescription);

  const baseSystemInstruction = `You are a template configuration expert for a web scraping and AI-powered spreadsheet application.`;

  const scienceEnhancement = isScienceTrack ? `

SCIENCE TRACK SPECIALIZATION:
This request appears to be science/academic focused. Apply these specialized guidelines:

1. PRIORITIZE academic_search operator for finding research papers and scientific literature
2. Use similarity_expansion to discover related concepts and research areas
3. Focus on finding highly cited, peer-reviewed sources
4. Structure workflows to extract academic metadata (citations, authors, publication details)
5. Include quality indicators for research papers (impact factor, citation count)
6. Target academic databases: arXiv, PubMed, Google Scholar, ResearchGate
7. Emphasize PDF discovery for direct access to papers
8. Consider review papers for comprehensive field overviews

ACADEMIC SEARCH BEST PRACTICES:
- Use academic_search for initial literature discovery
- Follow with url_context to extract detailed paper information
- Use structured_output to organize bibliographic data
- Apply similarity_expansion to find related research areas
- Always aim to provide PDF links when available` : '';

  const systemInstruction = baseSystemInstruction + scienceEnhancement + `

The application works like this:
1. Users create spreadsheets with columns
2. Each column can use different AI operators to fetch and process data
3. Columns can depend on previous columns (left to right processing)
4. The AI fills cells progressively using internet data

Available Operators:
- google_search: Uses Google Search to find information, URLs, snippets
- url_context: Fetches content from URLs and extracts information
- structured_output: Processes data and extracts structured information (JSON)
- function_calling: Calls custom functions (advanced)
- academic_search: Specialized search for academic papers, PDFs, and highly cited research
- similarity_expansion: Finds similar concepts, keywords, and related terms

Common Patterns:
- Research pipeline: Search query → URLs → Extract data → Classify/score
- Lead generation: Company name → Website → Contact pages → Extract emails
- Content analysis: URL → Fetch content → Summarize → Sentiment analysis
- Academic research: Topic → Academic search → PDF extraction → Citation analysis
- Science discovery: Concept → Similar concepts → Literature review → Key findings

Your task: Convert the user's description into a complete template configuration with:
1. Clear column titles
2. Appropriate operator selection for each column
3. Well-crafted prompts that guide the AI
4. Correct dependencies between columns
5. Sensible data types

Be creative but practical. Consider what's feasible with web search and URL scraping.`;

  const prompt = `Create a template configuration for the following use case:

${userDescription}

Generate a complete, ready-to-use template that:
- Has 3-6 columns (not too many, not too few)
- Uses appropriate operators for each step
- Has clear, actionable prompts
- Sets up dependencies correctly (each column can only depend on columns to its left)
- Includes a helpful description and icon

Think step-by-step about the data flow from left to right.`;

  try {
    // Convert Zod schema to JSON Schema for Gemini API
    const jsonSchema = zodToJsonSchema(templateConfigSchema);

    // Combine system instruction and prompt
    const fullPrompt = systemInstruction + "\n\n" + prompt;

    const result = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH, // Use gemini-2.5-flash
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        ...DEFAULT_GENERATION_CONFIG,
      },
    });

    const text = result.text || "";

    // Parse the JSON response
    const config = JSON.parse(text) as TemplateConfig;

    // Validate with Zod
    const validated = templateConfigSchema.parse(config);

    return validated;
  } catch (error) {
    console.error("Error generating template:", error);
    throw new Error(
      `Failed to generate template: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Refine an existing template configuration based on user feedback
 *
 * @param existingConfig - Current template configuration
 * @param userFeedback - User's request for changes
 * @returns Updated template configuration
 *
 * @example
 * const refined = await refineTemplate(currentConfig, "Add a column to extract email addresses");
 */
export async function refineTemplate(
  existingConfig: TemplateConfig,
  userFeedback: string
): Promise<TemplateConfig> {
  const client = await getGeminiClient();

  const systemInstruction = `You are refining a template configuration based on user feedback.

The user has an existing template and wants to make changes. Your task:
1. Understand their requested change
2. Modify the template accordingly
3. Ensure dependencies still make sense
4. Keep the template coherent and practical

Available Operators:
- google_search: Uses Google Search to find information
- url_context: Fetches and analyzes web page content
- structured_output: Extracts structured data
- function_calling: Custom function execution

Rules:
- Columns process left to right
- A column can only depend on columns to its left
- Keep prompts clear and actionable
- Maintain data type consistency`;

  const prompt = `Here is the current template:

${JSON.stringify(existingConfig, null, 2)}

User feedback: ${userFeedback}

Update the template based on this feedback. Return the complete updated configuration.`;

  try {
    // Convert Zod schema to JSON Schema for Gemini API
    const jsonSchema = zodToJsonSchema(templateConfigSchema);

    // Combine system instruction and prompt
    const fullPrompt = systemInstruction + "\n\n" + prompt;

    const result = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH, // Use gemini-2.5-flash
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        ...DEFAULT_GENERATION_CONFIG,
      },
    });

    const text = result.text || "";

    const config = JSON.parse(text) as TemplateConfig;
    const validated = templateConfigSchema.parse(config);

    return validated;
  } catch (error) {
    console.error("Error refining template:", error);
    throw new Error(
      `Failed to refine template: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Suggest improvements to a template configuration
 *
 * @param config - Template configuration to analyze
 * @returns Array of suggested improvements with descriptions
 */
export async function suggestTemplateImprovements(
  config: TemplateConfig
): Promise<Array<{ suggestion: string; reasoning: string; priority: "low" | "medium" | "high" }>> {
  const client = await getGeminiClient();

  const suggestionSchema = z.object({
    suggestions: z.array(
      z.object({
        suggestion: z.string().describe("The suggested improvement"),
        reasoning: z.string().describe("Why this would improve the template"),
        priority: z.enum(["low", "medium", "high"]).describe("Priority level"),
      })
    ),
  });

  const prompt = `Analyze this template configuration and suggest improvements:

${JSON.stringify(config, null, 2)}

Consider:
- Are the prompts clear and actionable?
- Are operators used appropriately?
- Are dependencies correct?
- Could the data flow be more efficient?
- Are there missing validation rules?
- Is the template practical and likely to work well?

Provide 2-5 concrete, actionable suggestions.`;

  try {
    // Convert Zod schema to JSON Schema for Gemini API
    const jsonSchema = zodToJsonSchema(suggestionSchema);

    const result = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH, // Use gemini-2.5-flash
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchema,
        ...DEFAULT_GENERATION_CONFIG,
      },
    });

    const text = result.text || "";

    const parsed = JSON.parse(text);
    return parsed.suggestions;
  } catch (error) {
    console.error("Error suggesting improvements:", error);
    return [];
  }
}

/**
 * Detect if a user description is science/academic focused
 */
function detectScienceTrack(userDescription: string): boolean {
  const description = userDescription.toLowerCase();

  const scienceKeywords = [
    // Academic terms
    'research', 'paper', 'papers', 'study', 'studies', 'publication', 'journal',
    'article', 'academic', 'scholar', 'citation', 'bibliography', 'literature',
    'thesis', 'dissertation', 'peer review', 'peer-reviewed', 'manuscript',

    // File formats
    'pdf', 'doi', 'arxiv', 'pubmed',

    // Scientific fields
    'science', 'scientific', 'biology', 'physics', 'chemistry', 'mathematics',
    'medicine', 'engineering', 'computer science', 'machine learning', 'ai',
    'psychology', 'neuroscience', 'genomics', 'bioinformatics', 'statistics',

    // Research activities
    'experiment', 'hypothesis', 'theory', 'analysis', 'methodology', 'dataset',
    'survey', 'review', 'meta-analysis', 'systematic review',

    // Academic sources
    'google scholar', 'nature', 'science magazine', 'plos', 'ieee', 'acm',
    'springer', 'elsevier', 'wiley', 'oxford', 'cambridge',

    // Research indicators
    'highly cited', 'impact factor', 'h-index', 'breakthrough', 'seminal',
    'landmark study', 'cutting edge', 'state of the art'
  ];

  // Check for presence of science keywords
  const keywordMatches = scienceKeywords.filter(keyword =>
    description.includes(keyword)
  ).length;

  // If 2 or more science keywords are found, classify as science track
  return keywordMatches >= 2;
}
