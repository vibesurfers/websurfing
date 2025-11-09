import { z } from "zod";
import { getGeminiClient } from "../gemini/client";
import { DEFAULT_GENERATION_CONFIG, GEMINI_MODELS } from "../gemini/config";

// Schema for a single column configuration
const columnConfigSchema = z.object({
  title: z.string().describe("Column header title"),
  position: z.number().int().describe("0-based position in the spreadsheet"),
  operatorType: z
    .enum(["google_search", "url_context", "structured_output", "function_calling"])
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

  const systemInstruction = `You are a template configuration expert for a web scraping and AI-powered spreadsheet application.

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

Common Patterns:
- Research pipeline: Search query → URLs → Extract data → Classify/score
- Lead generation: Company name → Website → Contact pages → Extract emails
- Content analysis: URL → Fetch content → Summarize → Sentiment analysis

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
    const result = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH_2_0,
      contents: [
        {
          role: "user",
          parts: [{ text: systemInstruction + "\n\n" + prompt }],
        },
      ],
      config: {
        ...DEFAULT_GENERATION_CONFIG,
        responseMimeType: "application/json",
        responseSchema: templateConfigSchema,
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
    const result = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH_2_0,
      contents: [
        {
          role: "user",
          parts: [{ text: systemInstruction + "\n\n" + prompt }],
        },
      ],
      config: {
        ...DEFAULT_GENERATION_CONFIG,
        responseMimeType: "application/json",
        responseSchema: templateConfigSchema,
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
    const result = await client.models.generateContent({
      model: GEMINI_MODELS.FLASH_2_0,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        ...DEFAULT_GENERATION_CONFIG,
        responseMimeType: "application/json",
        responseSchema: suggestionSchema,
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
