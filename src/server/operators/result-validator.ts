/**
 * Result Validator
 *
 * Validates operator results against column data types with LENIENT validation.
 * Accepts all results but provides warnings and confidence scores for quality monitoring.
 */

/**
 * Column data type definitions
 */
export enum ColumnDataType {
  SHORT_TEXT = 'SHORT_TEXT',
  LONG_TEXT = 'LONG_TEXT',
  URL = 'URL',
  EMAIL = 'EMAIL',
  NUMBER = 'NUMBER',
  CURRENCY = 'CURRENCY',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  LIST = 'LIST',
  PERSON = 'PERSON',
  COMPANY = 'COMPANY',
}

/**
 * Column validation configuration
 */
export interface ValidatedColumn {
  id: string;
  title: string;
  dataType: ColumnDataType;
  required: boolean;
  maxLength?: number;
  minLength?: number;
  examples?: string[];
  description?: string;
}

/**
 * Validation issue
 */
export interface ValidationIssue {
  message: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean; // Always true for lenient validation
  confidence: number; // 0.0 - 1.0 quality score
  issues: ValidationIssue[];
  suggestions: string[];
  sanitized?: string; // Cleaned/normalized version of content
}

/**
 * Result Validator - Lenient validation with quality scoring
 */
export class ResultValidator {
  /**
   * Validate content against column specification
   * LENIENT: Always returns valid=true, but provides confidence score and warnings
   */
  static validate(content: string, column: ValidatedColumn): ValidationResult {
    const issues: ValidationIssue[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;
    let sanitized = content.trim();

    // Handle empty content
    if (!sanitized) {
      if (column.required) {
        issues.push({
          message: `Required field "${column.title}" is empty`,
          severity: 'warning'
        });
        confidence *= 0.3;
      } else {
        issues.push({
          message: `Field "${column.title}" is empty`,
          severity: 'info'
        });
        confidence *= 0.5;
      }
      return { valid: true, confidence, issues, suggestions, sanitized };
    }

    // Validate based on data type
    switch (column.dataType) {
      case ColumnDataType.SHORT_TEXT:
        this.validateShortText(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.URL:
        sanitized = this.validateURL(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.EMAIL:
        this.validateEmail(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.NUMBER:
        this.validateNumber(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.CURRENCY:
        this.validateCurrency(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.DATE:
        this.validateDate(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.BOOLEAN:
        sanitized = this.validateBoolean(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.LIST:
        this.validateList(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.PERSON:
        this.validatePerson(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.COMPANY:
        this.validateCompany(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;

      case ColumnDataType.LONG_TEXT:
      default:
        this.validateLongText(sanitized, column, issues, suggestions, ref => confidence = ref);
        break;
    }

    // Check length constraints
    if (column.maxLength && sanitized.length > column.maxLength) {
      issues.push({
        message: `Content exceeds max length (${sanitized.length} > ${column.maxLength})`,
        severity: 'warning'
      });
      suggestions.push(`Truncate to ${column.maxLength} characters`);
      confidence *= 0.8;
    }

    if (column.minLength && sanitized.length < column.minLength) {
      issues.push({
        message: `Content below min length (${sanitized.length} < ${column.minLength})`,
        severity: 'warning'
      });
      suggestions.push(`Expand to at least ${column.minLength} characters`);
      confidence *= 0.7;
    }

    return {
      valid: true, // Always valid in lenient mode
      confidence: Math.max(0, Math.min(1, confidence)),
      issues,
      suggestions,
      sanitized: sanitized !== content ? sanitized : undefined
    };
  }

  /**
   * Validate SHORT_TEXT format
   */
  private static validateShortText(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): void {
    if (content.length > 100) {
      issues.push({
        message: 'Short text should be under 100 characters',
        severity: 'warning'
      });
      suggestions.push('Shorten to a concise summary');
      setConfidence(0.7);
    }

    // Check for explanatory text (should be direct answer)
    if (content.includes(':') || content.includes(' - ')) {
      issues.push({
        message: 'Short text should be a direct answer without explanations',
        severity: 'info'
      });
      setConfidence(0.85);
    }
  }

  /**
   * Validate URL format
   */
  private static validateURL(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): string {
    let sanitized = content;

    // Check for valid URL
    if (!content.startsWith('http://') && !content.startsWith('https://')) {
      issues.push({
        message: 'URL should start with http:// or https://',
        severity: 'warning'
      });
      suggestions.push('Ensure URL includes protocol');
      setConfidence(0.6);
    } else {
      try {
        const url = new URL(content);
        sanitized = url.toString(); // Normalize URL
      } catch (e) {
        issues.push({
          message: 'Invalid URL format',
          severity: 'warning'
        });
        suggestions.push('Provide a valid URL');
        setConfidence(0.5);
      }
    }

    // Check for redirect URLs (should be avoided)
    if (content.includes('redirect') || content.includes('grounding-api-redirect')) {
      issues.push({
        message: 'URL appears to be a redirect link',
        severity: 'warning'
      });
      suggestions.push('Use direct URL instead of redirect');
      setConfidence(0.4);
    }

    return sanitized;
  }

  /**
   * Validate EMAIL format
   */
  private static validateEmail(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(content)) {
      issues.push({
        message: 'Invalid email format',
        severity: 'warning'
      });
      suggestions.push('Use format: name@domain.com');
      setConfidence(0.5);
    }
  }

  /**
   * Validate NUMBER format
   */
  private static validateNumber(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): void {
    const numberRegex = /^-?\d+(\.\d+)?$/;

    if (!numberRegex.test(content)) {
      issues.push({
        message: 'Should contain only numbers (no units or text)',
        severity: 'warning'
      });
      suggestions.push('Remove non-numeric characters');
      setConfidence(0.6);
    }
  }

  /**
   * Validate CURRENCY format
   */
  private static validateCurrency(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): void {
    const currencyRegex = /^[\$€£¥₹]?\s?-?\d+(\.\d{2})?(\s?[\$€£¥₹])?$/;

    if (!currencyRegex.test(content)) {
      issues.push({
        message: 'Should be in currency format (e.g., $100, €50)',
        severity: 'warning'
      });
      suggestions.push('Use currency symbol with number');
      setConfidence(0.7);
    }
  }

  /**
   * Validate DATE format
   */
  private static validateDate(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): void {
    // Try to parse as date
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^[A-Za-z]+\s+\d{1,2},\s+\d{4}$/, // Month DD, YYYY
      /^\d{1,2}\/\d{1,2}\/\d{4}$/ // MM/DD/YYYY
    ];

    const isValidDate = datePatterns.some(pattern => pattern.test(content));

    if (!isValidDate) {
      issues.push({
        message: 'Date format not recognized',
        severity: 'warning'
      });
      suggestions.push('Use YYYY-MM-DD or Month DD, YYYY format');
      setConfidence(0.6);
    }
  }

  /**
   * Validate BOOLEAN format
   */
  private static validateBoolean(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): string {
    const lower = content.toLowerCase();

    // Normalize to Yes/No
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return 'Yes';
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return 'No';
    }

    // Check if it's already Yes/No
    if (lower !== 'yes' && lower !== 'no') {
      issues.push({
        message: 'Should be "Yes" or "No"',
        severity: 'warning'
      });
      suggestions.push('Use only "Yes" or "No"');
      setConfidence(0.7);
    }

    return content;
  }

  /**
   * Validate LIST format
   */
  private static validateList(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): void {
    if (!content.includes(',')) {
      issues.push({
        message: 'List should be comma-separated',
        severity: 'info'
      });
      suggestions.push('Use format: item1, item2, item3');
      setConfidence(0.8);
    }
  }

  /**
   * Validate PERSON format
   */
  private static validatePerson(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): void {
    // Check if it looks like a name (at least 2 words)
    const words = content.trim().split(/\s+/);

    if (words.length < 2) {
      issues.push({
        message: 'Person name should include first and last name',
        severity: 'info'
      });
      suggestions.push('Provide full name');
      setConfidence(0.8);
    }

    // Check for non-name content
    if (content.includes('http') || content.includes('@')) {
      issues.push({
        message: 'Should be a person\'s name, not a URL or email',
        severity: 'warning'
      });
      setConfidence(0.5);
    }
  }

  /**
   * Validate COMPANY format
   */
  private static validateCompany(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): void {
    // Check for non-company content
    if (content.includes('http') || content.includes('@')) {
      issues.push({
        message: 'Should be a company name, not a URL or email',
        severity: 'warning'
      });
      setConfidence(0.5);
    }
  }

  /**
   * Validate LONG_TEXT format
   */
  private static validateLongText(
    content: string,
    column: ValidatedColumn,
    issues: ValidationIssue[],
    suggestions: string[],
    setConfidence: (conf: number) => void
  ): void {
    // No specific validation for long text
    // Just check if it's too short for a "long" text field
    if (content.length < 10) {
      issues.push({
        message: 'Long text field has very short content',
        severity: 'info'
      });
      setConfidence(0.9);
    }
  }

  /**
   * Generate improved prompt for retry based on validation issues
   */
  static generateImprovementPrompt(
    originalPrompt: string,
    column: ValidatedColumn,
    validation: ValidationResult
  ): string {
    const prompt: string[] = [];

    prompt.push('RETRY - Previous response had quality issues.');
    prompt.push('');
    prompt.push('ISSUES:');
    validation.issues.forEach(issue => {
      prompt.push(`- ${issue.message}`);
    });
    prompt.push('');

    if (validation.suggestions.length > 0) {
      prompt.push('SUGGESTIONS:');
      validation.suggestions.forEach(suggestion => {
        prompt.push(`- ${suggestion}`);
      });
      prompt.push('');
    }

    prompt.push('REQUIREMENTS:');
    prompt.push(`- Data type: ${column.dataType}`);
    if (column.maxLength) {
      prompt.push(`- Maximum ${column.maxLength} characters`);
    }
    if (column.minLength) {
      prompt.push(`- Minimum ${column.minLength} characters`);
    }
    if (column.examples && column.examples.length > 0) {
      prompt.push(`- Examples: ${column.examples.join(', ')}`);
    }
    prompt.push('');

    prompt.push('ORIGINAL TASK:');
    prompt.push(originalPrompt);

    return prompt.join('\n');
  }

  /**
   * Parse validationRules JSON to extract validation metadata
   */
  static parseValidationRules(validationRules: any): Partial<ValidatedColumn> {
    if (!validationRules || typeof validationRules !== 'object') {
      return {};
    }

    return {
      maxLength: validationRules.maxLength,
      minLength: validationRules.minLength,
      examples: Array.isArray(validationRules.examples) ? validationRules.examples : undefined,
      description: validationRules.description,
    };
  }
}
