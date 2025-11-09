/**
 * Format Constraints Utility
 *
 * Provides Gemini generation config constraints based on column data types
 * to improve output quality and consistency.
 */

import { ColumnDataType, type ValidatedColumn } from "./result-validator";

/**
 * Gemini generation config with constraints
 */
export interface ConstrainedGenerationConfig {
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  responseMimeType?: string;
  responseJsonSchema?: object;
  candidateCount?: number;
  stopSequences?: string[];
}

/**
 * Generate Gemini config constraints based on column data type
 */
export class FormatConstraints {

  /**
   * Get generation config constraints for a specific column type
   */
  static getConstraintsForColumn(column: ValidatedColumn): ConstrainedGenerationConfig {
    const constraints: ConstrainedGenerationConfig = {
      temperature: 0.3, // Lower temperature for more consistent results
      topP: 0.8,
      candidateCount: 1 // Only one response needed
    };

    switch (column.dataType) {
      case ColumnDataType.SHORT_TEXT:
        return {
          ...constraints,
          maxOutputTokens: 30, // ~100 characters
          temperature: 0.2, // Very consistent for short answers
          stopSequences: ['\n', '.', '!', '?'], // Stop at sentence ends
        };

      case ColumnDataType.LONG_TEXT:
        return {
          ...constraints,
          maxOutputTokens: 500, // ~2000 characters
          temperature: 0.4, // Slightly more creative for descriptions
        };

      case ColumnDataType.URL:
        return {
          ...constraints,
          maxOutputTokens: 50, // URLs shouldn't be too long
          temperature: 0.1, // Very deterministic for URLs
          responseMimeType: "text/plain",
          stopSequences: [' ', '\n', '\t'], // URLs don't have spaces
        };

      case ColumnDataType.EMAIL:
        return {
          ...constraints,
          maxOutputTokens: 30,
          temperature: 0.1,
          responseMimeType: "text/plain",
          stopSequences: [' ', '\n', '\t'],
        };

      case ColumnDataType.NUMBER:
        return {
          ...constraints,
          maxOutputTokens: 10,
          temperature: 0.1,
          responseMimeType: "text/plain",
          stopSequences: [' ', '\n', 'a', 'b', 'c'], // Stop at any letter
        };

      case ColumnDataType.CURRENCY:
        return {
          ...constraints,
          maxOutputTokens: 15,
          temperature: 0.1,
          responseMimeType: "text/plain",
        };

      case ColumnDataType.DATE:
        return {
          ...constraints,
          maxOutputTokens: 20,
          temperature: 0.1,
          responseMimeType: "text/plain",
        };

      case ColumnDataType.BOOLEAN:
        return {
          ...constraints,
          maxOutputTokens: 3, // "Yes", "No", "True", "False"
          temperature: 0.0, // Completely deterministic
          responseMimeType: "text/plain",
          stopSequences: ['.', ',', '\n'],
        };

      case ColumnDataType.LIST:
        return {
          ...constraints,
          maxOutputTokens: 200,
          temperature: 0.3,
        };

      case ColumnDataType.JSON:
        return {
          ...constraints,
          maxOutputTokens: 300,
          temperature: 0.2,
          responseMimeType: "application/json",
        };

      case ColumnDataType.PHONE:
        return {
          ...constraints,
          maxOutputTokens: 25,
          temperature: 0.1,
          responseMimeType: "text/plain",
        };

      case ColumnDataType.ADDRESS:
        return {
          ...constraints,
          maxOutputTokens: 100,
          temperature: 0.2,
        };

      case ColumnDataType.PERSON:
        return {
          ...constraints,
          maxOutputTokens: 20, // Most names fit in ~80 characters
          temperature: 0.1, // Names should be deterministic
          responseMimeType: "text/plain",
        };

      case ColumnDataType.COMPANY:
        return {
          ...constraints,
          maxOutputTokens: 30,
          temperature: 0.1,
          responseMimeType: "text/plain",
        };

      default:
        return constraints;
    }
  }

  /**
   * Get JSON schema for structured outputs based on column type
   */
  static getJsonSchemaForColumn(column: ValidatedColumn): object | undefined {
    switch (column.dataType) {
      case ColumnDataType.JSON:
        return {
          type: "object",
          properties: {
            result: {
              type: "string",
              description: `Value for ${column.title}`
            }
          },
          required: ["result"]
        };

      case ColumnDataType.LIST:
        return {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: { type: "string" },
              description: `List of items for ${column.title}`
            }
          },
          required: ["items"]
        };

      case ColumnDataType.BOOLEAN:
        return {
          type: "object",
          properties: {
            answer: {
              type: "string",
              enum: ["Yes", "No", "True", "False"],
              description: `Boolean answer for ${column.title}`
            }
          },
          required: ["answer"]
        };

      case ColumnDataType.NUMBER:
        return {
          type: "object",
          properties: {
            value: {
              type: "number",
              description: `Numeric value for ${column.title}`
            }
          },
          required: ["value"]
        };

      case ColumnDataType.CURRENCY:
        return {
          type: "object",
          properties: {
            amount: {
              type: "string",
              pattern: "^[\\$€£¥₹]?[\\d,]+\\.?\\d*[\\$€£¥₹]?$",
              description: `Currency amount for ${column.title}`
            }
          },
          required: ["amount"]
        };

      case ColumnDataType.DATE:
        return {
          type: "object",
          properties: {
            date: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$|^\\w+ \\d{1,2}, \\d{4}$|^\\d{1,2}/\\d{1,2}/\\d{4}$",
              description: `Date for ${column.title} (YYYY-MM-DD, Month DD, YYYY, or MM/DD/YYYY)`
            }
          },
          required: ["date"]
        };

      default:
        return undefined;
    }
  }

  /**
   * Create enhanced prompt with format instructions
   */
  static addFormatInstructions(originalPrompt: string, column: ValidatedColumn): string {
    const instructions: string[] = [];

    instructions.push(`IMPORTANT: Provide ONLY the ${column.title} value. Do not include explanations, context, or additional information.`);

    switch (column.dataType) {
      case ColumnDataType.SHORT_TEXT:
        instructions.push('Keep your response under 100 characters.');
        instructions.push('Provide a concise, direct answer.');
        break;

      case ColumnDataType.URL:
        instructions.push('Provide only a valid URL starting with http:// or https://');
        instructions.push('Do not include any text before or after the URL.');
        break;

      case ColumnDataType.EMAIL:
        instructions.push('Provide only a valid email address.');
        instructions.push('Format: name@domain.com');
        break;

      case ColumnDataType.NUMBER:
        instructions.push('Provide only a number (digits and decimal point if needed).');
        instructions.push('Do not include units, currency symbols, or text.');
        break;

      case ColumnDataType.CURRENCY:
        instructions.push('Provide amount with currency symbol (e.g., $100, €50, £25).');
        instructions.push('Use standard currency formats.');
        break;

      case ColumnDataType.DATE:
        instructions.push('Provide date in a standard format (YYYY-MM-DD, Month DD, YYYY, or MM/DD/YYYY).');
        break;

      case ColumnDataType.BOOLEAN:
        instructions.push('Answer with only "Yes" or "No".');
        instructions.push('Do not provide explanations or qualifications.');
        break;

      case ColumnDataType.LIST:
        instructions.push('Provide a comma-separated list of items.');
        instructions.push('Format: item1, item2, item3');
        break;

      case ColumnDataType.PHONE:
        instructions.push('Provide a valid phone number.');
        instructions.push('Include country code if international.');
        break;

      case ColumnDataType.PERSON:
        instructions.push('Provide only the person\'s full name.');
        instructions.push('Format: First Last or First Middle Last');
        break;

      case ColumnDataType.COMPANY:
        instructions.push('Provide only the company name.');
        instructions.push('Include common suffixes (Inc., Corp., Ltd.) if part of official name.');
        break;

      case ColumnDataType.ADDRESS:
        instructions.push('Provide a complete physical address.');
        instructions.push('Include street, city, state/province, and postal code.');
        break;
    }

    // Add length constraints if specified
    if (column.maxLength) {
      instructions.push(`Maximum length: ${column.maxLength} characters.`);
    }

    if (column.minLength) {
      instructions.push(`Minimum length: ${column.minLength} characters.`);
    }

    // Add examples if available
    if (column.examples && column.examples.length > 0) {
      instructions.push(`Examples: ${column.examples.join(', ')}`);
    }

    const instructionText = instructions.join(' ');

    return `${instructionText}\n\n${originalPrompt}`;
  }

  /**
   * Get combined config for operator based on column type
   */
  static getOperatorConfig(column: ValidatedColumn, basePrompt: string): {
    prompt: string;
    config: ConstrainedGenerationConfig;
  } {
    const constraints = this.getConstraintsForColumn(column);
    const jsonSchema = this.getJsonSchemaForColumn(column);
    const enhancedPrompt = this.addFormatInstructions(basePrompt, column);

    const config: ConstrainedGenerationConfig = {
      ...constraints,
      ...(jsonSchema && { responseJsonSchema: jsonSchema, responseMimeType: "application/json" })
    };

    return {
      prompt: enhancedPrompt,
      config
    };
  }

  /**
   * Validate that operator supports the required constraints
   */
  static validateOperatorSupport(operatorName: string, column: ValidatedColumn): {
    supported: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let supported = true;

    // Check if operator can handle specific data types
    switch (column.dataType) {
      case ColumnDataType.JSON:
        if (!['structured_output'].includes(operatorName)) {
          warnings.push('JSON output works best with structured_output operator');
        }
        break;

      case ColumnDataType.URL:
        if (!['google_search', 'url_context', 'academic_search'].includes(operatorName)) {
          warnings.push('URL output typically requires search operators');
        }
        break;

      case ColumnDataType.BOOLEAN:
        if (operatorName === 'similarity_expansion') {
          warnings.push('Boolean answers not ideal for similarity expansion');
        }
        break;

      case ColumnDataType.NUMBER:
      case ColumnDataType.CURRENCY:
        if (['similarity_expansion'].includes(operatorName)) {
          warnings.push('Numeric output not suitable for similarity expansion');
          supported = false;
        }
        break;
    }

    return { supported, warnings };
  }
}