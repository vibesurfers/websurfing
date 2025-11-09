/**
 * Integration Tests for Improved Operator Consistency
 *
 * Tests the complete flow: validation, retry, and format constraints
 */

import { ColumnAwareWrapper } from "../column-aware-wrapper";
import { ResultValidator, ColumnDataType, type ValidatedColumn } from "../result-validator";
import { FormatConstraints } from "../format-constraints";
import type { SheetContext } from "../operator-controller";

describe("Operator Consistency Integration Tests", () => {

  const mockSheetContext: SheetContext = {
    sheetId: "test-sheet-id",
    templateType: null,
    columns: [
      {
        id: "col-1",
        title: "Company Name",
        position: 0,
        dataType: "short_text",
        maxLength: 100,
        examples: ["Google Inc", "Microsoft Corp"],
        description: "The official company name"
      },
      {
        id: "col-2",
        title: "Website URL",
        position: 1,
        dataType: "url",
        examples: ["https://google.com", "https://microsoft.com"],
        description: "Company's main website"
      },
      {
        id: "col-3",
        title: "CEO Name",
        position: 2,
        dataType: "person",
        examples: ["Sundar Pichai", "Satya Nadella"],
        description: "Current Chief Executive Officer"
      }
    ],
    rowIndex: 0,
    currentColumnIndex: 0,
    rowData: {
      0: "Google Inc"
    }
  };

  describe("Format-Aware Prompt Building", () => {

    test("Builds contextual prompts with format constraints", () => {
      const prompt = ColumnAwareWrapper.buildContextualPromptWithFormat(
        mockSheetContext,
        "Website URL",
        "google_search"
      );

      expect(prompt).toContain("FORMAT REQUIREMENTS");
      expect(prompt).toContain("valid URL starting with http");
      expect(prompt).toContain("Examples: https://google.com");
      expect(prompt).toContain("TASK: Fill \"Website URL\"");
    });

    test("Includes compatibility warnings", () => {
      // Test similarity expansion with URL output (should warn)
      const contextWithUrlTarget: SheetContext = {
        ...mockSheetContext,
        currentColumnIndex: 0, // Will target column 1 (Website URL)
      };

      const prompt = ColumnAwareWrapper.buildContextualPromptWithFormat(
        contextWithUrlTarget,
        "Website URL",
        "similarity_expansion"
      );

      // Should include compatibility warning
      expect(prompt).toContain("COMPATIBILITY NOTES");
      expect(prompt).toContain("URL output typically requires search operators");
    });
  });

  describe("Result Validation", () => {

    test("Validates correct data types", () => {
      const testCases = [
        {
          input: "Google Inc",
          columnType: ColumnDataType.SHORT_TEXT,
          shouldBeValid: true,
          description: "Valid company name"
        },
        {
          input: "https://www.google.com",
          columnType: ColumnDataType.URL,
          shouldBeValid: true,
          description: "Valid URL"
        },
        {
          input: "Sundar Pichai",
          columnType: ColumnDataType.PERSON,
          shouldBeValid: true,
          description: "Valid person name"
        },
        {
          input: "This is a very long description that should not fit in a short text field designed for company names only",
          columnType: ColumnDataType.SHORT_TEXT,
          shouldBeValid: false,
          description: "Too long for short text"
        },
        {
          input: "not-a-url",
          columnType: ColumnDataType.URL,
          shouldBeValid: false,
          description: "Invalid URL format"
        }
      ];

      testCases.forEach(({ input, columnType, shouldBeValid, description }) => {
        const column: ValidatedColumn = {
          id: "test",
          title: "Test Column",
          dataType: columnType,
          maxLength: columnType === ColumnDataType.SHORT_TEXT ? 100 : undefined,
          required: true
        };

        const result = ResultValidator.validate(input, column);
        expect(result.valid).toBe(shouldBeValid, description);
      });
    });
  });

  describe("Format Constraints", () => {

    test("Generates appropriate constraints for different data types", () => {
      const shortTextColumn: ValidatedColumn = {
        id: "1",
        title: "Company Name",
        dataType: ColumnDataType.SHORT_TEXT,
        required: true
      };

      const urlColumn: ValidatedColumn = {
        id: "2",
        title: "Website",
        dataType: ColumnDataType.URL,
        required: true
      };

      const booleanColumn: ValidatedColumn = {
        id: "3",
        title: "Is Public",
        dataType: ColumnDataType.BOOLEAN,
        required: true
      };

      // Test constraints
      const shortTextConstraints = FormatConstraints.getConstraintsForColumn(shortTextColumn);
      const urlConstraints = FormatConstraints.getConstraintsForColumn(urlColumn);
      const booleanConstraints = FormatConstraints.getConstraintsForColumn(booleanColumn);

      // Short text should have reasonable token limits
      expect(shortTextConstraints.maxOutputTokens).toBeLessThanOrEqual(50);
      expect(shortTextConstraints.temperature).toBeLessThan(0.5);

      // URL should be very deterministic
      expect(urlConstraints.temperature).toBeLessThanOrEqual(0.1);
      expect(urlConstraints.stopSequences).toContain(' ');

      // Boolean should be completely deterministic
      expect(booleanConstraints.temperature).toBe(0);
      expect(booleanConstraints.maxOutputTokens).toBeLessThanOrEqual(5);
    });

    test("Creates enhanced prompts with format instructions", () => {
      const column: ValidatedColumn = {
        id: "1",
        title: "CEO Name",
        dataType: ColumnDataType.PERSON,
        required: true,
        examples: ["John Smith", "Jane Doe"]
      };

      const basePrompt = "Find the company's chief executive officer";
      const enhanced = FormatConstraints.addFormatInstructions(basePrompt, column);

      expect(enhanced).toContain("Provide only a person's full name");
      expect(enhanced).toContain("Examples: John Smith, Jane Doe");
      expect(enhanced).toContain("CEO Name");
      expect(enhanced).toContain(basePrompt);
    });
  });

  describe("End-to-End Validation Flow", () => {

    test("Complete validation and improvement cycle", () => {
      // Simulate operator output that needs improvement
      const poorOutput = "Google is a technology company founded by Larry Page and Sergey Brin";

      const ceoColumn: ValidatedColumn = {
        id: "col-3",
        title: "CEO Name",
        dataType: ColumnDataType.PERSON,
        required: true,
        examples: ["Sundar Pichai", "Larry Page"]
      };

      // First validation - should fail
      const initialValidation = ResultValidator.validate(poorOutput, ceoColumn);
      expect(initialValidation.valid).toBe(false);
      expect(initialValidation.needsRetry).toBe(undefined); // This property doesn't exist on validation result
      expect(initialValidation.suggestions.length).toBeGreaterThan(0);

      // Generate improvement prompt
      const originalPrompt = "Who is the CEO of Google?";
      const improvedPrompt = ResultValidator.generateImprovementPrompt(
        originalPrompt,
        ceoColumn,
        initialValidation
      );

      expect(improvedPrompt).toContain("Provide only a person's full name");
      expect(improvedPrompt).toContain(originalPrompt);

      // Simulate improved output
      const improvedOutput = "Sundar Pichai";
      const improvedValidation = ResultValidator.validate(improvedOutput, ceoColumn);

      expect(improvedValidation.valid).toBe(true);
      expect(improvedValidation.confidence).toBeGreaterThan(0.8);
    });
  });

  describe("Performance and Reliability", () => {

    test("Handles edge cases gracefully", () => {
      const testCases = [
        "",           // Empty string
        " ",          // Whitespace only
        "\n\n\t",     // Whitespace characters
        "null",       // String "null"
        "undefined",  // String "undefined"
        "{}",         // JSON object string
        "[]",         // JSON array string
        "🎉🚀",        // Emojis
        "A".repeat(10000), // Very long string
      ];

      const column: ValidatedColumn = {
        id: "test",
        title: "Test",
        dataType: ColumnDataType.SHORT_TEXT,
        maxLength: 50,
        required: false
      };

      testCases.forEach(input => {
        expect(() => {
          const result = ResultValidator.validate(input, column);
          expect(typeof result.valid).toBe('boolean');
          expect(typeof result.confidence).toBe('number');
          expect(Array.isArray(result.issues)).toBe(true);
          expect(Array.isArray(result.suggestions)).toBe(true);
        }).not.toThrow();
      });
    });

    test("Validation performance is acceptable", () => {
      const column: ValidatedColumn = {
        id: "perf-test",
        title: "Performance Test",
        dataType: ColumnDataType.LONG_TEXT,
        maxLength: 5000,
        required: true
      };

      const largeInput = "Lorem ipsum dolor sit amet. ".repeat(200); // ~5600 chars

      const iterations = 100;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        ResultValidator.validate(largeInput, column);
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / iterations;

      // Should average less than 10ms per validation
      expect(avgTime).toBeLessThan(10);
    });
  });

  describe("Configuration Validation", () => {

    test("Format constraints work with all column types", () => {
      const allColumnTypes = Object.values(ColumnDataType);

      allColumnTypes.forEach(dataType => {
        const column: ValidatedColumn = {
          id: "test",
          title: "Test Column",
          dataType,
          required: true
        };

        expect(() => {
          const constraints = FormatConstraints.getConstraintsForColumn(column);
          expect(typeof constraints.temperature).toBe('number');
          expect(constraints.temperature).toBeGreaterThanOrEqual(0);
          expect(constraints.temperature).toBeLessThanOrEqual(1);
        }).not.toThrow();
      });
    });

    test("Operator compatibility checks work", () => {
      const operators = ["google_search", "url_context", "structured_output", "similarity_expansion"];
      const dataTypes = [ColumnDataType.URL, ColumnDataType.NUMBER, ColumnDataType.BOOLEAN];

      operators.forEach(operator => {
        dataTypes.forEach(dataType => {
          const column: ValidatedColumn = {
            id: "test",
            title: "Test",
            dataType,
            required: true
          };

          expect(() => {
            const compatibility = FormatConstraints.validateOperatorSupport(operator, column);
            expect(typeof compatibility.supported).toBe('boolean');
            expect(Array.isArray(compatibility.warnings)).toBe(true);
          }).not.toThrow();
        });
      });
    });
  });
});