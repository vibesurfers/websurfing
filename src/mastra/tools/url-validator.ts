import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * URL Validation Tool
 *
 * Validates all URLs in AI responses to ensure they are:
 * - Properly formatted
 * - Accessible (returns 200 status)
 * - Not redirect URLs
 * - Clean and direct website URLs
 *
 * This tool ensures citation quality and prevents broken links.
 */
export const urlValidatorTool = createTool({
  id: "url-validator",
  description: "Validates all URLs in a response to ensure they are valid, accessible, and properly formatted. Returns structured output with validation results for each URL.",
  inputSchema: z.object({
    content: z.string().describe("The content containing URLs to validate"),
    validateAccessibility: z.boolean().optional().default(true).describe("Whether to check if URLs are accessible (HTTP HEAD request)"),
    extractUrls: z.boolean().optional().default(true).describe("Whether to extract all URLs from the content"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    totalUrls: z.number(),
    validUrls: z.number(),
    invalidUrls: z.number(),
    urls: z.array(z.object({
      url: z.string(),
      isValid: z.boolean(),
      isAccessible: z.boolean().optional(),
      statusCode: z.number().optional(),
      error: z.string().optional(),
      cleanedUrl: z.string().optional(),
      isRedirect: z.boolean().optional(),
    })),
    summary: z.string(),
    validatedContent: z.string().optional().describe("Content with invalid URLs marked or removed"),
  }),
  execute: async ({ context }) => {
    const { content, validateAccessibility, extractUrls } = context;

    // Extract URLs from content
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
    const matches = extractUrls ? content.match(urlRegex) || [] : [];

    // Deduplicate URLs
    const uniqueUrls = Array.from(new Set(matches));

    console.log(`[URL Validator] Found ${uniqueUrls.length} unique URLs to validate`);

    // Validate each URL
    const validationResults = await Promise.all(
      uniqueUrls.map(async (url) => {
        const result: any = {
          url,
          isValid: false,
          isAccessible: undefined,
          statusCode: undefined,
          error: undefined,
          cleanedUrl: undefined,
          isRedirect: false,
        };

        try {
          // Check if URL is properly formatted
          const urlObj = new URL(url);
          result.isValid = true;

          // Clean the URL (remove tracking params, etc.)
          const cleanUrl = new URL(urlObj.origin + urlObj.pathname);
          result.cleanedUrl = cleanUrl.toString();

          // Check for common redirect patterns
          if (url.includes('redirect') ||
              url.includes('grounding-api') ||
              url.includes('bit.ly') ||
              url.includes('tinyurl') ||
              url.includes('goo.gl')) {
            result.isRedirect = true;
            result.error = "Redirect URL detected";
          }

          // Check accessibility if requested
          if (validateAccessibility && result.isValid && !result.isRedirect) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

              const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                  'User-Agent': 'VibeSurfers-URLValidator/1.0',
                },
              });

              clearTimeout(timeoutId);

              result.isAccessible = response.ok;
              result.statusCode = response.status;

              if (!response.ok) {
                result.error = `HTTP ${response.status}`;
              }
            } catch (fetchError: any) {
              result.isAccessible = false;
              result.error = fetchError.message || 'Failed to access URL';
              console.warn(`[URL Validator] Failed to check ${url}:`, fetchError.message);
            }
          }
        } catch (parseError: any) {
          result.isValid = false;
          result.error = 'Invalid URL format';
        }

        return result;
      })
    );

    // Count results
    const validCount = validationResults.filter(r => r.isValid && !r.isRedirect).length;
    const invalidCount = validationResults.filter(r => !r.isValid || r.isRedirect).length;
    const accessibleCount = validationResults.filter(r => r.isAccessible === true).length;

    // Generate summary
    let summary = `Validated ${uniqueUrls.length} URLs: ${validCount} valid`;
    if (invalidCount > 0) {
      summary += `, ${invalidCount} invalid/redirect`;
    }
    if (validateAccessibility) {
      summary += `, ${accessibleCount} accessible`;
    }

    // Create validated content (mark or remove invalid URLs)
    let validatedContent = content;
    for (const result of validationResults) {
      if (!result.isValid || result.isRedirect) {
        // Mark invalid URLs
        validatedContent = validatedContent.replace(
          result.url,
          `[INVALID: ${result.url}]`
        );
      } else if (result.cleanedUrl && result.cleanedUrl !== result.url) {
        // Replace with cleaned URL
        validatedContent = validatedContent.replace(
          result.url,
          result.cleanedUrl
        );
      }
    }

    console.log(`[URL Validator] Validation complete: ${summary}`);

    return {
      success: true,
      totalUrls: uniqueUrls.length,
      validUrls: validCount,
      invalidUrls: invalidCount,
      urls: validationResults,
      summary,
      validatedContent: validatedContent !== content ? validatedContent : undefined,
    };
  },
});