/**
 * Result Validator
 *
 * Validates that operator outputs match column requirements and provides
 * feedback for retry attempts.
 */

/**
 * Column data types with specific validation rules
 */
export enum ColumnDataType {
  SHORT_TEXT = "short_text",      // Names, titles, locations (max 100 chars)
  LONG_TEXT = "long_text",        // Descriptions, summaries (unlimited)
  URL = "url",                    // Valid URLs
  EMAIL = "email",                // Valid email addresses
  NUMBER = "number",              // Numeric values
  CURRENCY = "currency",          // Money amounts
  DATE = "date",                  // Dates in various formats
  BOOLEAN = "boolean",            // Yes/No, True/False
  LIST = "list",                  // Comma-separated items
  JSON = "json",                  // Valid JSON objects
  PHONE = "phone",                // Phone numbers
  ADDRESS = "address",            // Physical addresses
  COMPANY = "company",            // Company names
  PERSON = "person"               // Person names
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  confidence: number;           // 0-1, how confident we are in the validation
  issues: ValidationIssue[];    // List of problems found
  suggestions: string[];        // Suggestions for improvement
  sanitized?: string;           // Cleaned-up version of the input
}

export interface ValidationIssue {
  type: 'format' | 'length' | 'content' | 'relevance';
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Column definition with validation rules
 */
export interface ValidatedColumn {
  id: string;
  title: string;
  dataType: ColumnDataType;
  maxLength?: number;
  minLength?: number;
  required: boolean;
  pattern?: RegExp;
  examples?: string[];
  description?: string;
}

export class ResultValidator {

  /**
   * Validate operator output against column requirements
   */
  static validate(output: string, column: ValidatedColumn): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      confidence: 1.0,
      issues: [],
      suggestions: []
    };

    // Skip validation for empty optional columns
    if (!output.trim() && !column.required) {
      return result;
    }

    // Check if required field is empty
    if (!output.trim() && column.required) {
      result.valid = false;
      result.confidence = 0;
      result.issues.push({
        type: 'content',
        message: 'Required field is empty',
        severity: 'error'
      });
      result.suggestions.push(`Please provide a value for ${column.title}`);
      return result;
    }

    // Validate based on data type
    const typeValidation = this.validateDataType(output, column);
    result.valid = result.valid && typeValidation.valid;
    result.confidence = Math.min(result.confidence, typeValidation.confidence);
    result.issues.push(...typeValidation.issues);
    result.suggestions.push(...typeValidation.suggestions);

    // Validate length constraints
    const lengthValidation = this.validateLength(output, column);
    result.valid = result.valid && lengthValidation.valid;
    result.confidence = Math.min(result.confidence, lengthValidation.confidence);
    result.issues.push(...lengthValidation.issues);
    result.suggestions.push(...lengthValidation.suggestions);

    // Validate against pattern if provided
    if (column.pattern && !column.pattern.test(output)) {
      result.valid = false;
      result.confidence = Math.min(result.confidence, 0.3);
      result.issues.push({
        type: 'format',
        message: `Does not match expected pattern for ${column.title}`,
        severity: 'error'
      });
    }

    // Check relevance to column title
    const relevanceValidation = this.validateRelevance(output, column);
    result.confidence = Math.min(result.confidence, relevanceValidation.confidence);
    result.issues.push(...relevanceValidation.issues);
    result.suggestions.push(...relevanceValidation.suggestions);

    // Sanitize output if possible
    result.sanitized = this.sanitizeOutput(output, column);

    return result;
  }

  /**
   * Validate based on column data type
   */
  private static validateDataType(output: string, column: ValidatedColumn): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      confidence: 1.0,
      issues: [],
      suggestions: []
    };

    const trimmed = output.trim();

    switch (column.dataType) {
      case ColumnDataType.SHORT_TEXT:
        if (trimmed.length > 100) {
          result.valid = false;
          result.issues.push({
            type: 'length',
            message: 'Text too long for short text field',
            severity: 'error'
          });
          result.suggestions.push('Please provide a shorter, more concise answer');
        }
        break;

      case ColumnDataType.URL:
        if (!this.isValidUrl(trimmed)) {
          result.valid = false;
          result.issues.push({
            type: 'format',
            message: 'Invalid URL format',
            severity: 'error'
          });
          result.suggestions.push('Please provide a valid URL starting with http:// or https://');
        }
        break;

      case ColumnDataType.EMAIL:
        if (!this.isValidEmail(trimmed)) {
          result.valid = false;
          result.issues.push({
            type: 'format',
            message: 'Invalid email format',
            severity: 'error'
          });
          result.suggestions.push('Please provide a valid email address');
        }
        break;

      case ColumnDataType.NUMBER:
        if (!this.isValidNumber(trimmed)) {
          result.valid = false;
          result.issues.push({
            type: 'format',
            message: 'Not a valid number',
            severity: 'error'
          });
          result.suggestions.push('Please provide a numeric value');
        }
        break;

      case ColumnDataType.CURRENCY:
        if (!this.isValidCurrency(trimmed)) {
          result.valid = false;
          result.issues.push({
            type: 'format',
            message: 'Invalid currency format',
            severity: 'error'
          });
          result.suggestions.push('Please provide currency amount (e.g., $100, €50, ¥1000)');
        }
        break;

      case ColumnDataType.DATE:
        if (!this.isValidDate(trimmed)) {
          result.valid = false;
          result.issues.push({
            type: 'format',
            message: 'Invalid date format',
            severity: 'error'
          });
          result.suggestions.push('Please provide a valid date (e.g., 2024-01-15, January 15, 2024)');
        }
        break;

      case ColumnDataType.BOOLEAN:
        if (!this.isValidBoolean(trimmed)) {
          result.valid = false;
          result.issues.push({
            type: 'format',
            message: 'Invalid boolean value',
            severity: 'error'
          });
          result.suggestions.push('Please provide Yes/No, True/False, or 1/0');
        }
        break;

      case ColumnDataType.LIST:
        if (!this.isValidList(trimmed)) {
          result.issues.push({
            type: 'format',
            message: 'May not be properly formatted as a list',
            severity: 'warning'
          });
          result.confidence = 0.7;
          result.suggestions.push('Consider formatting as comma-separated items');
        }
        break;

      case ColumnDataType.JSON:
        if (!this.isValidJson(trimmed)) {
          result.valid = false;
          result.issues.push({
            type: 'format',
            message: 'Invalid JSON format',
            severity: 'error'
          });
          result.suggestions.push('Please provide valid JSON object');
        }
        break;

      case ColumnDataType.PHONE:
        if (!this.isValidPhone(trimmed)) {
          result.valid = false;
          result.issues.push({
            type: 'format',
            message: 'Invalid phone number format',
            severity: 'error'
          });
          result.suggestions.push('Please provide a valid phone number');
        }
        break;

      case ColumnDataType.PERSON:
        if (!this.isValidPersonName(trimmed)) {
          result.confidence = 0.6;
          result.issues.push({
            type: 'content',
            message: 'May not be a person name',
            severity: 'warning'
          });
          result.suggestions.push('Please provide a person\'s full name');
        }
        break;

      case ColumnDataType.COMPANY:
        if (!this.isValidCompanyName(trimmed)) {
          result.confidence = 0.6;
          result.issues.push({
            type: 'content',
            message: 'May not be a company name',
            severity: 'warning'
          });
          result.suggestions.push('Please provide a company name');
        }
        break;
    }

    return result;
  }

  /**
   * Validate length constraints
   */
  private static validateLength(output: string, column: ValidatedColumn): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      confidence: 1.0,
      issues: [],
      suggestions: []
    };

    if (column.maxLength && output.length > column.maxLength) {
      result.valid = false;
      result.issues.push({
        type: 'length',
        message: `Too long (${output.length} chars, max ${column.maxLength})`,
        severity: 'error'
      });
      result.suggestions.push(`Please shorten to under ${column.maxLength} characters`);
    }

    if (column.minLength && output.length < column.minLength) {
      result.valid = false;
      result.issues.push({
        type: 'length',
        message: `Too short (${output.length} chars, min ${column.minLength})`,
        severity: 'error'
      });
      result.suggestions.push(`Please provide at least ${column.minLength} characters`);
    }

    return result;
  }

  /**
   * Validate relevance to column title and description
   */
  private static validateRelevance(output: string, column: ValidatedColumn): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      confidence: 1.0,
      issues: [],
      suggestions: []
    };

    // Simple keyword matching for relevance
    const columnKeywords = this.extractKeywords(column.title);
    const outputKeywords = this.extractKeywords(output.toLowerCase());

    const relevanceScore = this.calculateRelevanceScore(columnKeywords, outputKeywords);

    if (relevanceScore < 0.3) {
      result.confidence = relevanceScore;
      result.issues.push({
        type: 'relevance',
        message: `Output may not be relevant to "${column.title}"`,
        severity: 'warning'
      });
      result.suggestions.push(`Please ensure the answer specifically addresses "${column.title}"`);
    }

    return result;
  }

  /**
   * Sanitize output based on column type
   */
  private static sanitizeOutput(output: string, column: ValidatedColumn): string {
    let sanitized = output.trim();

    switch (column.dataType) {
      case ColumnDataType.SHORT_TEXT:
        // Remove line breaks and extra spaces
        sanitized = sanitized.replace(/\s+/g, ' ');
        if (sanitized.length > 100) {
          sanitized = sanitized.substring(0, 97) + '...';
        }
        break;

      case ColumnDataType.URL:
        // Ensure URL has protocol
        if (!/^https?:\/\//.test(sanitized) && sanitized.includes('.')) {
          sanitized = 'https://' + sanitized;
        }
        break;

      case ColumnDataType.EMAIL:
        sanitized = sanitized.toLowerCase();
        break;

      case ColumnDataType.PHONE:
        // Remove common phone number formatting
        sanitized = sanitized.replace(/[^\d+]/g, '');
        break;

      case ColumnDataType.BOOLEAN:
        const normalized = sanitized.toLowerCase();
        if (['yes', 'true', '1', 'y'].includes(normalized)) {
          sanitized = 'Yes';
        } else if (['no', 'false', '0', 'n'].includes(normalized)) {
          sanitized = 'No';
        }
        break;

      case ColumnDataType.LIST:
        // Ensure proper comma separation
        if (sanitized.includes(',')) {
          sanitized = sanitized.split(',').map(s => s.trim()).join(', ');
        }
        break;
    }

    return sanitized;
  }

  // Validation helper methods
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidNumber(value: string): boolean {
    return !isNaN(parseFloat(value)) && isFinite(parseFloat(value));
  }

  private static isValidCurrency(value: string): boolean {
    const currencyRegex = /^[\$€£¥₹]?[\d,]+\.?\d*[\$€£¥₹]?$/;
    return currencyRegex.test(value.replace(/\s/g, ''));
  }

  private static isValidDate(value: string): boolean {
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  private static isValidBoolean(value: string): boolean {
    const normalized = value.toLowerCase().trim();
    return ['yes', 'no', 'true', 'false', '1', '0', 'y', 'n'].includes(normalized);
  }

  private static isValidList(value: string): boolean {
    // Check if it has list-like characteristics
    return value.includes(',') || value.includes(';') || value.includes('\n');
  }

  private static isValidJson(value: string): boolean {
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  private static isValidPhone(value: string): boolean {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
    return phoneRegex.test(value);
  }

  private static isValidPersonName(value: string): boolean {
    // Check for typical person name patterns
    const words = value.trim().split(/\s+/);
    if (words.length < 1 || words.length > 4) return false;

    // Check that each word starts with capital letter
    return words.every(word => /^[A-Z][a-z]+/.test(word));
  }

  private static isValidCompanyName(value: string): boolean {
    // Basic heuristics for company names
    const companyIndicators = ['inc', 'corp', 'ltd', 'llc', 'company', 'co', 'group', 'enterprises'];
    const normalized = value.toLowerCase();

    // Has company indicator OR is capitalized properly
    return companyIndicators.some(indicator => normalized.includes(indicator)) ||
           /^[A-Z]/.test(value);
  }

  private static extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private static calculateRelevanceScore(columnKeywords: string[], outputKeywords: string[]): number {
    if (columnKeywords.length === 0) return 1.0;

    const matches = columnKeywords.filter(keyword =>
      outputKeywords.some(output =>
        output.includes(keyword) || keyword.includes(output)
      )
    );

    return matches.length / columnKeywords.length;
  }

  /**
   * Generate improvement suggestions based on validation results
   */
  static generateImprovementPrompt(
    originalPrompt: string,
    column: ValidatedColumn,
    validation: ValidationResult
  ): string {
    const improvements: string[] = [];

    // Add format constraints
    improvements.push(`IMPORTANT: Your response must be suitable for the "${column.title}" column.`);

    // Add data type specific instructions
    switch (column.dataType) {
      case ColumnDataType.SHORT_TEXT:
        improvements.push('Provide a concise answer (under 100 characters).');
        break;
      case ColumnDataType.URL:
        improvements.push('Provide only a valid URL starting with http:// or https://');
        break;
      case ColumnDataType.EMAIL:
        improvements.push('Provide only an email address.');
        break;
      case ColumnDataType.NUMBER:
        improvements.push('Provide only a number, no text.');
        break;
      case ColumnDataType.BOOLEAN:
        improvements.push('Answer with only Yes or No.');
        break;
      case ColumnDataType.PERSON:
        improvements.push('Provide only a person\'s full name.');
        break;
    }

    // Add specific suggestions from validation
    if (validation.suggestions.length > 0) {
      improvements.push(...validation.suggestions);
    }

    // Add examples if available
    if (column.examples && column.examples.length > 0) {
      improvements.push(`Examples: ${column.examples.join(', ')}`);
    }

    const improvementText = improvements.join(' ');

    return `${improvementText}\n\n${originalPrompt}`;
  }
}