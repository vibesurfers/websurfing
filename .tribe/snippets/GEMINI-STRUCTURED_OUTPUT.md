# Gemini Structured Output Skill

## Overview

Gemini models can generate responses that strictly adhere to a provided JSON Schema. This capability ensures predictable, parsable results with format and type-safety, enabling programmatic detection of refusals and simplified prompting.

## When to Use Structured Outputs

Structured outputs are ideal for:

- **Data extraction**: Pull specific information from unstructured text (e.g., extracting names, dates, and amounts from invoices)
- **Structured classification**: Classify text into predefined categories with structured labels (e.g., categorizing customer feedback by sentiment and topic)
- **Agentic workflows**: Generate structured data for calling other tools or APIs (e.g., creating character sheets, filling out forms)

## TypeScript Implementation

### Setup

Install required dependencies:

```bash
npm install @google/genai zod zod-to-json-schema
```

### Basic Usage

```typescript
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const ai = new GoogleGenAI({});

// Define your schema using Zod
const schema = z.object({
  name: z.string(),
  age: z.number().int(),
  email: z.string().email(),
});

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: "Extract information about John Doe, age 30, john@example.com",
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(schema),
  },
});

const result = schema.parse(JSON.parse(response.text));
```

### Recursive Structures Example

This example demonstrates defining recursive schemas like organization charts:

```typescript
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const employeeSchema = z.object({
  name: z.string(),
  employee_id: z.number().int(),
  reports: z.lazy(() => z.array(employeeSchema))
    .describe("A list of employees reporting to this employee."),
});

const ai = new GoogleGenAI({});

const prompt = `
Generate an organization chart for a small team.
The manager is Alice, who manages Bob and Charlie. Bob manages David.
`;

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(employeeSchema),
  },
});

const employee = employeeSchema.parse(JSON.parse(response.text));
console.log(employee);
```

**Example Response:**

```json
{
  "name": "Alice",
  "employee_id": 101,
  "reports": [
    {
      "name": "Bob",
      "employee_id": 102,
      "reports": [
        {
          "name": "David",
          "employee_id": 104,
          "reports": []
        }
      ]
    },
    {
      "name": "Charlie",
      "employee_id": 103,
      "reports": []
    }
  ]
}
```

## Streaming Structured Outputs

Stream responses to start processing as they're generated without waiting for completion. Streamed chunks are valid partial JSON strings that concatenate into the final complete JSON object.

```typescript
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const ai = new GoogleGenAI({});
const prompt = "The new UI is incredibly intuitive and visually appealing. Great job! Add a very long summary to test streaming!";

const feedbackSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  summary: z.string(),
});

const stream = await ai.models.generateContentStream({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(feedbackSchema),
  },
});

for await (const chunk of stream) {
  console.log(chunk.candidates[0].content.parts[0].text);
}
```

## JSON Schema Support

### Supported Types

- `string`: For text
- `number`: For floating-point numbers
- `integer`: For whole numbers
- `boolean`: For true/false values
- `object`: For structured data with key-value pairs
- `array`: For lists of items
- `null`: To allow null values, include "null" in the type array: `{"type": ["string", "null"]}`

### Descriptive Properties

- `title`: Short description of a property
- `description`: Longer, detailed description of a property

### Type-Specific Properties

**For object values:**
- `properties`: Object where each key is a property name and value is its schema
- `required`: Array of strings listing mandatory properties
- `additionalProperties`: Controls whether unlisted properties are allowed (boolean or schema)

**For string values:**
- `enum`: Specific set of possible strings for classification
- `format`: Syntax specification (e.g., `date-time`, `date`, `time`)

**For number and integer values:**
- `enum`: Specific set of possible numeric values
- `minimum`: Minimum inclusive value
- `maximum`: Maximum inclusive value

**For array values:**
- `items`: Schema for all array items
- `prefixItems`: List of schemas for first N items (tuple-like structures)
- `minItems`: Minimum number of items
- `maxItems`: Maximum number of items

## Model Support

| Model | Structured Outputs |
|-------|-------------------|
| Gemini 2.5 Pro | ✔️ |
| Gemini 2.5 Flash | ✔️ |
| Gemini 2.5 Flash-Lite | ✔️ |
| Gemini 2.0 Flash | ✔️* |
| Gemini 2.0 Flash-Lite | ✔️* |

*Note: Gemini 2.0 requires an explicit `propertyOrdering` list within the JSON input to define preferred structure.

## Structured Outputs vs. Function Calling

| Feature | Primary Use Case |
|---------|-----------------|
| **Structured Outputs** | Formatting the final response to the user. Use when you want the model's answer in a specific format (e.g., extracting data from documents to save to a database). |
| **Function Calling** | Taking action during conversation. Use when the model needs to ask you to perform a task (e.g., "get current weather") before providing a final answer. |

## Best Practices

### 1. Clear Descriptions
Use the `description` field in your schema to provide clear instructions about what each property represents. This is crucial for guiding the model's output.

```typescript
const schema = z.object({
  customerName: z.string().describe("The full name of the customer as it appears in the document"),
  orderTotal: z.number().describe("The total order amount in USD, including tax"),
});
```

### 2. Strong Typing
Use specific types (`integer`, `string`, `enum`) whenever possible. For parameters with limited valid values, use enums.

```typescript
const schema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  priority: z.number().int().min(1).max(5),
});
```

### 3. Prompt Engineering
Clearly state in your prompt what you want the model to do.

```typescript
const prompt = `
Extract the following information from the text:
- Customer name
- Order date
- Total amount
- List of ordered items

Text: [your text here]
`;
```

### 4. Validation
While structured output guarantees syntactically correct JSON, it doesn't guarantee semantically correct values. Always validate the final output in your application code before using it.

```typescript
const result = schema.parse(JSON.parse(response.text));

// Additional business logic validation
if (result.orderTotal < 0) {
  throw new Error("Order total cannot be negative");
}
```

### 5. Error Handling
Implement robust error handling to gracefully manage cases where the model's output, while schema-compliant, may not meet your business logic requirements.

```typescript
try {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: zodToJsonSchema(schema),
    },
  });
  
  const result = schema.parse(JSON.parse(response.text));
  
  // Additional validation
  if (!isValidBusinessLogic(result)) {
    throw new Error("Business logic validation failed");
  }
  
  return result;
} catch (error) {
  console.error("Failed to generate structured output:", error);
  // Implement fallback or retry logic
}
```

## Limitations

### Schema Subset
Not all features of the JSON Schema specification are supported. The model ignores unsupported properties.

### Schema Complexity
The API may reject very large or deeply nested schemas. If you encounter errors, try:
- Shortening property names
- Reducing nesting levels
- Limiting the number of constraints
- Breaking complex schemas into smaller, focused schemas

### Output Ordering
The model produces outputs in the same order as the keys in the schema. For Gemini 2.0 models, you may need to specify explicit `propertyOrdering` to control output structure.

## TypeScript Tips

### Type Safety with Zod

Zod provides excellent TypeScript integration. Extract the inferred type from your schema:

```typescript
const schema = z.object({
  name: z.string(),
  age: z.number().int(),
});

type Person = z.infer<typeof schema>;
// Type: { name: string; age: number; }

function processPerson(person: Person) {
  // Full type safety
  console.log(person.name.toUpperCase());
}
```

### Reusable Schema Patterns

Create reusable schema components:

```typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
});

const customerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
});
```

### Optional and Nullable Fields

Handle optional and nullable fields properly:

```typescript
const schema = z.object({
  required: z.string(),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
  optionalAndNullable: z.string().optional().nullable(),
});

type SchemaType = z.infer<typeof schema>;
// {
//   required: string;
//   optional?: string | undefined;
//   nullable: string | null;
//   optionalAndNullable?: string | null | undefined;
// }
```

## Complete Example: Invoice Extraction

```typescript
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const invoiceItemSchema = z.object({
  description: z.string().describe("Item description"),
  quantity: z.number().int().positive().describe("Quantity ordered"),
  unitPrice: z.number().positive().describe("Price per unit in USD"),
  total: z.number().positive().describe("Total price (quantity × unitPrice)"),
});

const invoiceSchema = z.object({
  invoiceNumber: z.string().describe("Unique invoice identifier"),
  date: z.string().describe("Invoice date in YYYY-MM-DD format"),
  customerName: z.string().describe("Customer's full name"),
  items: z.array(invoiceItemSchema).describe("List of items on the invoice"),
  subtotal: z.number().positive().describe("Subtotal before tax"),
  tax: z.number().nonnegative().describe("Tax amount"),
  total: z.number().positive().describe("Total amount including tax"),
});

async function extractInvoiceData(invoiceText: string) {
  const ai = new GoogleGenAI({});
  
  const prompt = `
  Extract all invoice information from the following text and structure it according to the schema.
  Ensure all monetary values are in USD and dates are in YYYY-MM-DD format.
  
  Invoice text:
  ${invoiceText}
  `;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: zodToJsonSchema(invoiceSchema),
      },
    });
    
    const invoice = invoiceSchema.parse(JSON.parse(response.text));
    
    // Validate business logic
    const calculatedSubtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
    if (Math.abs(calculatedSubtotal - invoice.subtotal) > 0.01) {
      console.warn("Subtotal mismatch detected");
    }
    
    return invoice;
  } catch (error) {
    console.error("Failed to extract invoice data:", error);
    throw error;
  }
}

// Usage
const invoiceText = `
Invoice #INV-2024-001
Date: November 8, 2025
Customer: John Smith

Items:
1. Widget Pro (x2) @ $50.00 each = $100.00
2. Premium Service (x1) @ $75.00 each = $75.00

Subtotal: $175.00
Tax (10%): $17.50
Total: $192.50
`;

const invoice = await extractInvoiceData(invoiceText);
console.log(invoice);
```

## Summary

Gemini's structured output capability provides a powerful way to ensure type-safe, predictable responses from AI models. By combining TypeScript with Zod schemas, you get full compile-time type safety and runtime validation. Always remember to validate business logic beyond schema compliance and implement proper error handling for production applications.