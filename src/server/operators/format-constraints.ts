/**
 * Format Constraints
 *
 * Validates operator compatibility with column data types.
 * PERMISSIVE: All operators can produce any type, but unusual combinations generate warnings.
 */

import { ColumnDataType, type ValidatedColumn } from './result-validator';

export interface CompatibilityResult {
  compatible: boolean; // Always true in permissive mode
  warnings: string[];
  suggestions: string[];
}

/**
 * Format Constraints - Permissive operator compatibility checker
 */
export class FormatConstraints {
  /**
   * Validate if an operator is compatible with a column data type
   * PERMISSIVE: Always compatible, but warns for unusual combinations
   */
  static validateOperatorSupport(
    operatorName: string,
    column: ValidatedColumn
  ): CompatibilityResult {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Define expected pairings (but don't enforce them)
    const expectedPairings: Record<string, ColumnDataType[]> = {
      google_search: [
        ColumnDataType.URL,
        ColumnDataType.LONG_TEXT,
        ColumnDataType.SHORT_TEXT
      ],
      academic_search: [
        ColumnDataType.URL,
        ColumnDataType.LONG_TEXT
      ],
      url_context: [
        ColumnDataType.LONG_TEXT,
        ColumnDataType.SHORT_TEXT,
        ColumnDataType.PERSON,
        ColumnDataType.COMPANY,
        ColumnDataType.EMAIL
      ],
      structured_output: [
        ColumnDataType.LONG_TEXT, // JSON as text
        ColumnDataType.SHORT_TEXT,
        ColumnDataType.NUMBER,
        ColumnDataType.CURRENCY,
        ColumnDataType.DATE,
        ColumnDataType.BOOLEAN,
        ColumnDataType.PERSON,
        ColumnDataType.COMPANY,
        ColumnDataType.EMAIL
      ],
      function_calling: [
        // Can produce any type depending on function
        ...Object.values(ColumnDataType)
      ],
      similarity_expansion: [
        ColumnDataType.LIST,
        ColumnDataType.LONG_TEXT,
        ColumnDataType.SHORT_TEXT
      ]
    };

    // Check if this is an unusual pairing
    const expected = expectedPairings[operatorName];
    if (expected && !expected.includes(column.dataType)) {
      warnings.push(
        `Operator "${operatorName}" typically produces ${expected.join(', ')}, but column "${column.title}" expects ${column.dataType}`
      );
      suggestions.push(
        `Consider using a different operator or changing the column data type`
      );
    }

    // Specific unusual combinations
    if (operatorName === 'google_search' && column.dataType === ColumnDataType.NUMBER) {
      warnings.push(
        'Google Search typically returns URLs or text, not numbers. Consider using structured_output instead.'
      );
    }

    if (operatorName === 'google_search' && column.dataType === ColumnDataType.EMAIL) {
      warnings.push(
        'Google Search typically returns URLs, not email addresses directly. Consider using url_context to extract emails from found pages.'
      );
    }

    if (operatorName === 'url_context' && column.dataType === ColumnDataType.URL) {
      warnings.push(
        'URL Context extracts information FROM URLs, not new URLs. Consider using google_search if you need to find URLs.'
      );
    }

    // Check if operator needs specific configuration
    if (operatorName === 'structured_output') {
      if (!column.description && column.examples?.length === 0) {
        warnings.push(
          'Structured Output works best with clear description or examples in column configuration'
        );
        suggestions.push(
          'Add description or examples to guide the AI'
        );
      }
    }

    // Always return compatible in permissive mode
    return {
      compatible: true,
      warnings,
      suggestions
    };
  }

  /**
   * Get recommended operators for a column data type
   */
  static getRecommendedOperators(dataType: ColumnDataType): string[] {
    const recommendations: Record<ColumnDataType, string[]> = {
      [ColumnDataType.URL]: ['google_search', 'academic_search'],
      [ColumnDataType.EMAIL]: ['url_context', 'structured_output'],
      [ColumnDataType.PERSON]: ['url_context', 'structured_output'],
      [ColumnDataType.COMPANY]: ['url_context', 'structured_output'],
      [ColumnDataType.NUMBER]: ['structured_output', 'function_calling'],
      [ColumnDataType.CURRENCY]: ['structured_output', 'function_calling'],
      [ColumnDataType.DATE]: ['structured_output', 'url_context'],
      [ColumnDataType.BOOLEAN]: ['structured_output', 'function_calling'],
      [ColumnDataType.LIST]: ['similarity_expansion', 'structured_output'],
      [ColumnDataType.SHORT_TEXT]: ['structured_output', 'url_context', 'google_search'],
      [ColumnDataType.LONG_TEXT]: ['url_context', 'structured_output', 'google_search'],
    };

    return recommendations[dataType] || ['structured_output'];
  }

  /**
   * Check if operator requires specific configuration
   */
  static getRequiredConfiguration(operatorName: string): string[] {
    const requirements: Record<string, string[]> = {
      structured_output: [
        'Clear prompt or description',
        'Optional: JSON schema for validation'
      ],
      function_calling: [
        'Function declarations in operatorConfig',
        'Function implementations registered'
      ],
      url_context: [
        'URLs must be present in row data or dependencies'
      ],
      google_search: [
        'Search query in prompt or row data'
      ],
      academic_search: [
        'Research query in prompt or row data'
      ],
      similarity_expansion: [
        'Base concept in row data'
      ]
    };

    return requirements[operatorName] || [];
  }

  /**
   * Validate that column configuration is complete for operator
   */
  static validateColumnConfiguration(
    operatorName: string,
    column: ValidatedColumn,
    operatorConfig: any
  ): CompatibilityResult {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check for missing prompt/description
    if (!column.description && !operatorConfig?.prompt) {
      warnings.push(
        `Operator "${operatorName}" may benefit from clear instructions in column description or operator config`
      );
      suggestions.push('Add a description or custom prompt to guide the AI');
    }

    // Operator-specific validation
    if (operatorName === 'function_calling') {
      if (!operatorConfig?.functions || operatorConfig.functions.length === 0) {
        warnings.push(
          'Function Calling operator requires function declarations in operatorConfig'
        );
        suggestions.push('Add functions array to operatorConfig');
      }
    }

    if (operatorName === 'structured_output') {
      if (column.dataType !== ColumnDataType.LONG_TEXT && !operatorConfig?.schema) {
        warnings.push(
          `Structured Output for ${column.dataType} should include JSON schema in operatorConfig for best results`
        );
        suggestions.push('Add Zod schema to operatorConfig');
      }
    }

    return {
      compatible: true,
      warnings,
      suggestions
    };
  }
}
