/**
 * Test Suite for Result Validator
 *
 * Verifies that validation and format constraints improve operator consistency
 */

import { ResultValidator, ColumnDataType, type ValidatedColumn } from "../result-validator";

describe("ResultValidator", () => {

  describe("Data Type Validation", () => {

    test("SHORT_TEXT validation", () => {
      const column: ValidatedColumn = {
        id: "1",
        title: "Company Name",
        dataType: ColumnDataType.SHORT_TEXT,
        maxLength: 50,
        required: true
      };

      // Valid cases
      expect(ResultValidator.validate("Google Inc", column).valid).toBe(true);
      expect(ResultValidator.validate("Microsoft", column).valid).toBe(true);

      // Invalid cases - too long
      const longText = "This is a very long company name that exceeds the fifty character limit set for this field";
      expect(ResultValidator.validate(longText, column).valid).toBe(false);

      // Invalid cases - empty when required
      expect(ResultValidator.validate("", column).valid).toBe(false);
    });

    test("URL validation", () => {
      const column: ValidatedColumn = {
        id: "2",
        title: "Website URL",
        dataType: ColumnDataType.URL,
        required: true
      };

      // Valid cases
      expect(ResultValidator.validate("https://google.com", column).valid).toBe(true);
      expect(ResultValidator.validate("http://example.org", column).valid).toBe(true);

      // Invalid cases
      expect(ResultValidator.validate("not-a-url", column).valid).toBe(false);
      expect(ResultValidator.validate("google.com", column).valid).toBe(false); // No protocol
      expect(ResultValidator.validate("", column).valid).toBe(false); // Required field
    });

    test("EMAIL validation", () => {
      const column: ValidatedColumn = {
        id: "3",
        title: "Contact Email",
        dataType: ColumnDataType.EMAIL,
        required: true
      };

      // Valid cases
      expect(ResultValidator.validate("john@example.com", column).valid).toBe(true);
      expect(ResultValidator.validate("user.name+tag@domain.co.uk", column).valid).toBe(true);

      // Invalid cases
      expect(ResultValidator.validate("not-an-email", column).valid).toBe(false);
      expect(ResultValidator.validate("@domain.com", column).valid).toBe(false);
      expect(ResultValidator.validate("user@", column).valid).toBe(false);
    });

    test("NUMBER validation", () => {
      const column: ValidatedColumn = {
        id: "4",
        title: "Employee Count",
        dataType: ColumnDataType.NUMBER,
        required: true
      };

      // Valid cases
      expect(ResultValidator.validate("100", column).valid).toBe(true);
      expect(ResultValidator.validate("1000.5", column).valid).toBe(true);
      expect(ResultValidator.validate("-50", column).valid).toBe(true);

      // Invalid cases
      expect(ResultValidator.validate("100 employees", column).valid).toBe(false);
      expect(ResultValidator.validate("not a number", column).valid).toBe(false);
      expect(ResultValidator.validate("", column).valid).toBe(false);
    });

    test("BOOLEAN validation", () => {
      const column: ValidatedColumn = {
        id: "5",
        title: "Is Public Company",
        dataType: ColumnDataType.BOOLEAN,
        required: true
      };

      // Valid cases
      expect(ResultValidator.validate("Yes", column).valid).toBe(true);
      expect(ResultValidator.validate("No", column).valid).toBe(true);
      expect(ResultValidator.validate("true", column).valid).toBe(true);
      expect(ResultValidator.validate("false", column).valid).toBe(true);
      expect(ResultValidator.validate("1", column).valid).toBe(true);
      expect(ResultValidator.validate("0", column).valid).toBe(true);

      // Invalid cases
      expect(ResultValidator.validate("maybe", column).valid).toBe(false);
      expect(ResultValidator.validate("it depends", column).valid).toBe(false);
      expect(ResultValidator.validate("", column).valid).toBe(false);
    });

    test("PERSON name validation", () => {
      const column: ValidatedColumn = {
        id: "6",
        title: "CEO Name",
        dataType: ColumnDataType.PERSON,
        required: true
      };

      // Valid cases (high confidence)
      expect(ResultValidator.validate("John Smith", column).valid).toBe(true);
      expect(ResultValidator.validate("Mary Johnson", column).confidence).toBeGreaterThan(0.5);

      // Invalid/Low confidence cases
      expect(ResultValidator.validate("Google Inc", column).confidence).toBeLessThan(0.8);
      expect(ResultValidator.validate("john smith", column).confidence).toBeLessThan(0.8); // Not capitalized
      expect(ResultValidator.validate("", column).valid).toBe(false);
    });
  });

  describe("Sanitization", () => {

    test("SHORT_TEXT sanitization", () => {
      const column: ValidatedColumn = {
        id: "1",
        title: "Company",
        dataType: ColumnDataType.SHORT_TEXT,
        maxLength: 50,
        required: false
      };

      const longInput = "This is a very long company name that needs to be truncated because it exceeds the maximum length";
      const result = ResultValidator.validate(longInput, column);

      expect(result.sanitized?.length).toBeLessThanOrEqual(100); // Should be truncated
      expect(result.sanitized?.endsWith("...")).toBe(true);
    });

    test("URL sanitization", () => {
      const column: ValidatedColumn = {
        id: "2",
        title: "Website",
        dataType: ColumnDataType.URL,
        required: false
      };

      // Should add protocol
      const result = ResultValidator.validate("example.com", column);
      expect(result.sanitized).toBe("https://example.com");
    });

    test("BOOLEAN sanitization", () => {
      const column: ValidatedColumn = {
        id: "3",
        title: "Is Active",
        dataType: ColumnDataType.BOOLEAN,
        required: false
      };

      expect(ResultValidator.validate("yes", column).sanitized).toBe("Yes");
      expect(ResultValidator.validate("TRUE", column).sanitized).toBe("Yes");
      expect(ResultValidator.validate("no", column).sanitized).toBe("No");
      expect(ResultValidator.validate("false", column).sanitized).toBe("No");
    });
  });

  describe("Improvement Suggestions", () => {

    test("Generates helpful improvement prompts", () => {
      const column: ValidatedColumn = {
        id: "1",
        title: "CEO Name",
        dataType: ColumnDataType.PERSON,
        required: true,
        examples: ["John Smith", "Jane Doe"]
      };

      const originalPrompt = "Tell me about the company's leadership";
      const validation = ResultValidator.validate("The company has great leadership", column);

      const improvedPrompt = ResultValidator.generateImprovementPrompt(
        originalPrompt,
        column,
        validation
      );

      expect(improvedPrompt).toContain("Provide only a person's full name");
      expect(improvedPrompt).toContain("Examples: John Smith, Jane Doe");
      expect(improvedPrompt).toContain("CEO Name");
    });
  });

  describe("Real-world Test Cases", () => {

    const testCases = [
      {
        input: "Sundar Pichai",
        column: {
          id: "1",
          title: "CEO",
          dataType: ColumnDataType.PERSON,
          required: true
        } as ValidatedColumn,
        expectedValid: true,
        expectedConfidence: 0.8,
        description: "Valid CEO name"
      },
      {
        input: "https://www.google.com/about/careers/",
        column: {
          id: "2",
          title: "Careers Page URL",
          dataType: ColumnDataType.URL,
          required: true
        } as ValidatedColumn,
        expectedValid: true,
        expectedConfidence: 0.9,
        description: "Valid careers page URL"
      },
      {
        input: "Founded in 1998, Google has grown to become one of the world's largest technology companies.",
        column: {
          id: "3",
          title: "Company Name",
          dataType: ColumnDataType.SHORT_TEXT,
          maxLength: 50,
          required: true
        } as ValidatedColumn,
        expectedValid: false,
        expectedConfidence: 0.3,
        description: "Description instead of company name - should be invalid"
      },
      {
        input: "$100 billion",
        column: {
          id: "4",
          title: "Market Cap",
          dataType: ColumnDataType.CURRENCY,
          required: true
        } as ValidatedColumn,
        expectedValid: true,
        expectedConfidence: 0.8,
        description: "Valid currency amount"
      },
      {
        input: "It depends on the market conditions and regulatory environment",
        column: {
          id: "5",
          title: "Is Profitable",
          dataType: ColumnDataType.BOOLEAN,
          required: true
        } as ValidatedColumn,
        expectedValid: false,
        expectedConfidence: 0.1,
        description: "Explanation instead of Yes/No - should be invalid"
      }
    ];

    testCases.forEach(({ input, column, expectedValid, expectedConfidence, description }) => {
      test(description, () => {
        const result = ResultValidator.validate(input, column);

        expect(result.valid).toBe(expectedValid);

        if (expectedConfidence !== undefined) {
          expect(result.confidence).toBeGreaterThanOrEqual(expectedConfidence);
        }

        // All results should have some feedback
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(result.issues)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });
  });

  describe("Performance Requirements", () => {

    test("Validation completes quickly", () => {
      const column: ValidatedColumn = {
        id: "1",
        title: "Description",
        dataType: ColumnDataType.LONG_TEXT,
        maxLength: 1000,
        required: false
      };

      const largeInput = "Lorem ipsum ".repeat(100); // 1200 characters

      const startTime = Date.now();
      const result = ResultValidator.validate(largeInput, column);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      expect(result.valid).toBe(false); // Too long
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });
});

describe("Integration Tests", () => {

  test("End-to-end validation flow", () => {
    // Simulate a complete validation workflow
    const columns: ValidatedColumn[] = [
      {
        id: "1",
        title: "Company Name",
        dataType: ColumnDataType.SHORT_TEXT,
        maxLength: 100,
        required: true
      },
      {
        id: "2",
        title: "Website",
        dataType: ColumnDataType.URL,
        required: true
      },
      {
        id: "3",
        title: "CEO",
        dataType: ColumnDataType.PERSON,
        required: true
      },
      {
        id: "4",
        title: "Employee Count",
        dataType: ColumnDataType.NUMBER,
        required: false
      }
    ];

    const testInputs = [
      "Google Inc", // Valid company name
      "https://www.google.com", // Valid URL
      "Sundar Pichai", // Valid person name
      "150000" // Valid number
    ];

    // Validate each input against corresponding column
    const results = testInputs.map((input, index) =>
      ResultValidator.validate(input, columns[index]!)
    );

    // All should be valid
    expect(results.every(r => r.valid)).toBe(true);

    // All should have reasonable confidence
    expect(results.every(r => r.confidence > 0.6)).toBe(true);

    // None should have critical issues
    expect(results.every(r =>
      r.issues.every(issue => issue.severity !== 'error')
    )).toBe(true);
  });
});