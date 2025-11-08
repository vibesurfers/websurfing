# Gemini Function Calling Skill

## Overview

Function calling lets you connect Gemini models to external tools and APIs. Instead of generating text responses, the model determines when to call specific functions and provides the necessary parameters to execute real-world actions. This allows the model to act as a bridge between natural language and real-world actions and data.

## Primary Use Cases

Function calling has three primary use cases:

1. **Augment Knowledge**: Access information from external sources like databases, APIs, and knowledge bases

2. **Extend Capabilities**: Use external tools to perform computations and extend model limitations (calculators, chart creation)

3. **Take Actions**: Interact with external systems using APIs (scheduling appointments, creating invoices, sending emails, controlling smart home devices)

## TypeScript Implementation

### Setup

Install required dependency:

```bash
pnpm install @google/genai
```

### Basic Example: Schedule Meeting

```typescript
import { GoogleGenAI, Type } from "@google/genai";

// Configure the client
const ai = new GoogleGenAI({});

// Define the function declaration for the model
const scheduleMeetingFunctionDeclaration = {
  name: "schedule_meeting",
  description:
    "Schedules a meeting with specified attendees at a given time and date.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      attendees: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of people attending the meeting.",
      },
      date: {
        type: Type.STRING,
        description: 'Date of the meeting (e.g., "2024-07-29")',
      },
      time: {
        type: Type.STRING,
        description: 'Time of the meeting (e.g., "15:00")',
      },
      topic: {
        type: Type.STRING,
        description: "The subject or topic of the meeting.",
      },
    },
    required: ["attendees", "date", "time", "topic"],
  },
};

// Send request with function declarations
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents:
    "Schedule a meeting with Bob and Alice for 03/27/2025 at 10:00 AM about the Q3 planning.",
  config: {
    tools: [
      {
        functionDeclarations: [scheduleMeetingFunctionDeclaration],
      },
    ],
  },
});

// Check for function calls in the response
if (response.functionCalls && response.functionCalls.length > 0) {
  const functionCall = response.functionCalls[0];
  console.log(`Function to call: ${functionCall.name}`);
  console.log(`Arguments: ${JSON.stringify(functionCall.args)}`);
  // In a real app, you would call your actual function here:
  // const result = await scheduleMeeting(functionCall.args);
} else {
  console.log("No function call found in the response.");
  console.log(response.text);
}
```

## How Function Calling Works

Function calling involves a structured interaction between your application, the model, and external functions:

1. **Define Function Declaration**: Define the function declaration in your application code. Function declarations describe the function's name, parameters, and purpose to the model.

2. **Call LLM with Function Declarations**: Send user prompt along with the function declaration(s) to the model. It analyzes the request and determines if a function call would be helpful. If so, it responds with a structured JSON object.

3. **Execute Function Code** (Your Responsibility): The model does NOT execute the function itself. Your application must:
   - Process the response and check for function calls
   - Extract the name and arguments
   - Execute the corresponding function
   - OR receive a direct text response if no function call is needed

4. **Create User-Friendly Response**: If a function was executed, capture the result and send it back to the model in a subsequent turn. The model uses the result to generate a final, user-friendly response.

This process can be repeated over multiple turns, allowing for complex interactions and workflows. The model also supports:

- **Parallel function calling**: Multiple functions in a single turn
- **Compositional function calling**: Functions called in sequence

## Step-by-Step Implementation

### Step 1: Define a Function Declaration

```typescript
import { Type } from "@google/genai";

// Define a function that the model can call to control smart lights
const setLightValuesFunctionDeclaration = {
  name: "set_light_values",
  description: "Sets the brightness and color temperature of a light.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      brightness: {
        type: Type.NUMBER,
        description:
          "Light level from 0 to 100. Zero is off and 100 is full brightness",
      },
      color_temp: {
        type: Type.STRING,
        enum: ["daylight", "cool", "warm"],
        description:
          "Color temperature of the light fixture, which can be `daylight`, `cool` or `warm`.",
      },
    },
    required: ["brightness", "color_temp"],
  },
};

/**
 * Set the brightness and color temperature of a room light. (mock API)
 * @param {number} brightness - Light level from 0 to 100
 * @param {string} colorTemp - Color temperature: 'daylight', 'cool', or 'warm'
 * @return {Object} A dictionary containing the set brightness and color temperature
 */
function setLightValues(brightness: number, colorTemp: string) {
  // In a real application, this would call an actual smart home API
  return {
    brightness: brightness,
    colorTemperature: colorTemp,
  };
}
```

### Step 2: Call the Model with Function Declarations

```typescript
import { GoogleGenAI } from "@google/genai";

// Generation config with function declaration
const config = {
  tools: [
    {
      functionDeclarations: [setLightValuesFunctionDeclaration],
    },
  ],
};

// Configure the client
const ai = new GoogleGenAI({});

// Define user prompt
const contents = [
  {
    role: "user",
    parts: [{ text: "Turn the lights down to a romantic level" }],
  },
];

// Send request with function declarations
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: contents,
  config: config,
});

console.log(response.functionCalls[0]);
```

**Response:**

```json
{
  "name": "set_light_values",
  "args": {
    "brightness": 25,
    "color_temp": "warm"
  }
}
```

### Step 3: Execute Function Code

```typescript
// Extract tool call details
const toolCall = response.functionCalls[0];

let result;
if (toolCall.name === "set_light_values") {
  result = setLightValues(toolCall.args.brightness, toolCall.args.color_temp);
  console.log(`Function execution result: ${JSON.stringify(result)}`);
}
```

### Step 4: Send Result Back to Model

```typescript
// Create a function response part
const functionResponsePart = {
  name: toolCall.name,
  response: { result },
};

// Append function call and result to contents
contents.push(response.candidates[0].content);
contents.push({
  role: "user",
  parts: [{ functionResponse: functionResponsePart }],
});

// Get the final response from the model
const finalResponse = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: contents,
  config: config,
});

console.log(finalResponse.text);
```

## Function Declarations

Function declarations are defined using JSON with a subset of the OpenAPI schema format.

### Declaration Structure

```typescript
interface FunctionDeclaration {
  name: string; // Unique function name (use underscores or camelCase)
  description: string; // Clear explanation of function's purpose
  parameters: {
    type: "object";
    properties: {
      [key: string]: {
        type: "string" | "number" | "integer" | "boolean" | "array" | "object";
        description: string;
        enum?: string[]; // For fixed set of values
        items?: object; // For array types
      };
    };
    required: string[]; // Mandatory parameters
  };
}
```

### Best Practices for Declarations

1. **Use Descriptive Names**: Clear function names without spaces or special characters

   ```typescript
   // ✓ Good
   name: "get_weather_forecast";
   name: "sendEmail";

   // ✗ Bad
   name: "get weather";
   name: "fn1";
   ```

2. **Write Detailed Descriptions**: Be specific about what the function does

   ```typescript
   // ✓ Good
   description: "Finds theaters based on location and optionally movie title which is currently playing in theaters.";

   // ✗ Bad
   description: "Gets theaters";
   ```

3. **Use Enum for Fixed Values**: Improves accuracy over just describing in text

   ```typescript
   // ✓ Good
   color_temp: {
     type: Type.STRING,
     enum: ['daylight', 'cool', 'warm'],
     description: 'Color temperature of the light fixture.'
   }

   // ✗ Less effective
   color_temp: {
     type: Type.STRING,
     description: 'Color temperature: can be daylight, cool, or warm.'
   }
   ```

4. **Provide Parameter Examples**: Help the model understand format

   ```typescript
   date: {
     type: Type.STRING,
     description: 'Date of the meeting in YYYY-MM-DD format, e.g., "2024-07-29"'
   }
   ```

5. **Mark Required Parameters**: Always specify which parameters are mandatory
   ```typescript
   required: ["attendees", "date", "time", "topic"];
   ```

## Function Calling with Thinking

Enabling "thinking" can improve function call performance by allowing the model to reason through a request before suggesting function calls.

### Thought Signatures

A **thought signature** is an encrypted representation of the model's internal thought process. You pass it back to the model on subsequent turns to preserve reasoning context.

**Standard Pattern** (No code changes required):

```typescript
// Simply append the complete model response to conversation history
// The content object includes thought_signatures automatically
contents.push(response.candidates[0].content);
```

### Manually Managing Thought Signatures

If you modify conversation history manually, follow these rules:

1. **Always send the thought_signature back** inside its original Part
2. **Don't merge Parts** with different signature states
3. **Don't combine two Parts** that both contain signatures

### Inspecting Thought Signatures

```typescript
// After receiving a response from a model with thinking enabled
const part = response.candidates[0].content.parts[0];
if (part.thoughtSignature) {
  console.log("Thought signature:", part.thoughtSignature);
}
```

## Parallel Function Calling

Parallel function calling executes multiple functions at once when they're not dependent on each other. Useful for:

- Gathering data from multiple independent sources
- Checking inventory across various warehouses
- Performing multiple simultaneous actions

### Example: Party Mode

```typescript
import { Type } from "@google/genai";

const powerDiscoBall = {
  name: "power_disco_ball",
  description: "Powers the spinning disco ball.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      power: {
        type: Type.BOOLEAN,
        description: "Whether to turn the disco ball on or off.",
      },
    },
    required: ["power"],
  },
};

const startMusic = {
  name: "start_music",
  description: "Play some music matching the specified parameters.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      energetic: {
        type: Type.BOOLEAN,
        description: "Whether the music is energetic or not.",
      },
      loud: {
        type: Type.BOOLEAN,
        description: "Whether the music is loud or not.",
      },
    },
    required: ["energetic", "loud"],
  },
};

const dimLights = {
  name: "dim_lights",
  description: "Dim the lights.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      brightness: {
        type: Type.NUMBER,
        description: "The brightness of the lights, 0.0 is off, 1.0 is full.",
      },
    },
    required: ["brightness"],
  },
};
```

### Configure for Parallel Calling

```typescript
import { GoogleGenAI } from "@google/genai";

const houseFns = [powerDiscoBall, startMusic, dimLights];

const config = {
  tools: [
    {
      functionDeclarations: houseFns,
    },
  ],
  // Force the model to call 'any' function, instead of chatting
  toolConfig: {
    functionCallingConfig: {
      mode: "any",
    },
  },
};

const ai = new GoogleGenAI({});

const chat = ai.chats.create({
  model: "gemini-2.5-flash",
  config: config,
});

const response = await chat.sendMessage({
  message: "Turn this place into a party!",
});

// Print out each function call requested
console.log("Parallel function calling:");
for (const fn of response.functionCalls) {
  const args = Object.entries(fn.args)
    .map(([key, val]) => `${key}=${val}`)
    .join(", ");
  console.log(`${fn.name}(${args})`);
}
```

**Output:**

```
power_disco_ball(power=true)
start_music(energetic=true, loud=true)
dim_lights(brightness=0.5)
```

## Compositional Function Calling

Compositional (sequential) function calling allows Gemini to chain multiple function calls together to fulfill complex requests. For example: "Get the temperature in my current location" might invoke `get_current_location()` followed by `get_weather()`.

### Example: Weather-Based Thermostat Control

```typescript
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({});

// Example Functions
function getWeatherForecast({ location }: { location: string }) {
  console.log(`Tool Call: get_weather_forecast(location=${location})`);
  // TODO: Make actual API call
  console.log("Tool Response: {'temperature': 25, 'unit': 'celsius'}");
  return { temperature: 25, unit: "celsius" };
}

function setThermostatTemperature({ temperature }: { temperature: number }) {
  console.log(
    `Tool Call: set_thermostat_temperature(temperature=${temperature})`,
  );
  // TODO: Make actual API call
  console.log("Tool Response: {'status': 'success'}");
  return { status: "success" };
}

const toolFunctions: Record<string, Function> = {
  get_weather_forecast: getWeatherForecast,
  set_thermostat_temperature: setThermostatTemperature,
};

const tools = [
  {
    functionDeclarations: [
      {
        name: "get_weather_forecast",
        description:
          "Gets the current weather temperature for a given location.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            location: {
              type: Type.STRING,
            },
          },
          required: ["location"],
        },
      },
      {
        name: "set_thermostat_temperature",
        description: "Sets the thermostat to a desired temperature.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            temperature: {
              type: Type.NUMBER,
            },
          },
          required: ["temperature"],
        },
      },
    ],
  },
];

// Prompt for the model
let contents = [
  {
    role: "user",
    parts: [
      {
        text: "If it's warmer than 20°C in London, set the thermostat to 20°C, otherwise set it to 18°C.",
      },
    ],
  },
];

// Loop until the model has no more function calls to make
while (true) {
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: { tools },
  });

  if (result.functionCalls && result.functionCalls.length > 0) {
    const functionCall = result.functionCalls[0];
    const { name, args } = functionCall;

    if (!toolFunctions[name]) {
      throw new Error(`Unknown function: ${name}`);
    }

    // Execute the function
    const functionResult = toolFunctions[name](args);

    // Append the function call and response to contents
    contents.push(result.candidates[0].content);
    contents.push({
      role: "user",
      parts: [
        {
          functionResponse: {
            name: name,
            response: { result: functionResult },
          },
        },
      ],
    });
  } else {
    // No more function calls, print final response
    console.log("\nFinal Response:", result.text);
    break;
  }
}
```

## Function Calling Configuration

### Tool Config Options

```typescript
interface ToolConfig {
  functionCallingConfig?: {
    mode?: "auto" | "any" | "none";
    allowedFunctionNames?: string[];
  };
}
```

**Modes:**

- **`auto`** (default): Model decides whether to call functions or respond with text
- **`any`**: Model must call at least one function (no text-only responses)
- **`none`**: Disables function calling (model only generates text)

### Example: Force Specific Function

```typescript
const config = {
  tools: [
    {
      functionDeclarations: [func1, func2, func3],
    },
  ],
  toolConfig: {
    functionCallingConfig: {
      mode: "any",
      allowedFunctionNames: ["func1", "func2"], // Only allow these
    },
  },
};
```

## Type Safety with TypeScript

### Define Types for Function Arguments

```typescript
interface ScheduleMeetingArgs {
  attendees: string[];
  date: string;
  time: string;
  topic: string;
}

interface MeetingResult {
  meetingId: string;
  status: "scheduled" | "failed";
  message: string;
}

async function scheduleMeeting(
  args: ScheduleMeetingArgs,
): Promise<MeetingResult> {
  // Implementation
  return {
    meetingId: "meeting-123",
    status: "scheduled",
    message: `Meeting scheduled for ${args.date} at ${args.time}`,
  };
}
```

### Type-Safe Function Call Handler

```typescript
type FunctionMap = {
  [key: string]: (args: any) => Promise<any>;
};

interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

async function executeFunctionCall<T>(
  functionCall: FunctionCall,
  functionMap: FunctionMap,
): Promise<T> {
  const func = functionMap[functionCall.name];

  if (!func) {
    throw new Error(`Function ${functionCall.name} not found`);
  }

  return await func(functionCall.args);
}

// Usage
const functions: FunctionMap = {
  schedule_meeting: scheduleMeeting,
  send_email: sendEmail,
  get_weather: getWeather,
};

const result = await executeFunctionCall(response.functionCalls[0], functions);
```

## Complete Examples

### Example 1: Customer Service Bot

```typescript
import { GoogleGenAI, Type } from "@google/genai";

// Database mock functions
async function getCustomerInfo(customerId: string) {
  // Mock database call
  return {
    id: customerId,
    name: "John Doe",
    email: "john@example.com",
    accountStatus: "active",
  };
}

async function getOrderStatus(orderId: string) {
  // Mock API call
  return {
    orderId: orderId,
    status: "shipped",
    trackingNumber: "TRACK123",
    estimatedDelivery: "2025-03-15",
  };
}

async function createSupportTicket(issue: string, customerId: string) {
  // Mock ticket creation
  return {
    ticketId: "TICKET-" + Date.now(),
    status: "open",
    assignedTo: "support-team",
  };
}

// Function declarations
const customerServiceFunctions = [
  {
    name: "get_customer_info",
    description: "Retrieves customer information from the database",
    parameters: {
      type: Type.OBJECT,
      properties: {
        customer_id: {
          type: Type.STRING,
          description: "The unique customer identifier",
        },
      },
      required: ["customer_id"],
    },
  },
  {
    name: "get_order_status",
    description: "Gets the current status of an order",
    parameters: {
      type: Type.OBJECT,
      properties: {
        order_id: {
          type: Type.STRING,
          description: "The unique order identifier",
        },
      },
      required: ["order_id"],
    },
  },
  {
    name: "create_support_ticket",
    description: "Creates a new support ticket for customer issues",
    parameters: {
      type: Type.OBJECT,
      properties: {
        issue: {
          type: Type.STRING,
          description: "Description of the customer issue",
        },
        customer_id: {
          type: Type.STRING,
          description: "The customer ID for the ticket",
        },
      },
      required: ["issue", "customer_id"],
    },
  },
];

const functionMap: Record<string, Function> = {
  get_customer_info: ({ customer_id }) => getCustomerInfo(customer_id),
  get_order_status: ({ order_id }) => getOrderStatus(order_id),
  create_support_ticket: ({ issue, customer_id }) =>
    createSupportTicket(issue, customer_id),
};

async function handleCustomerQuery(query: string) {
  const ai = new GoogleGenAI({});

  let contents = [
    {
      role: "user",
      parts: [{ text: query }],
    },
  ];

  const config = {
    tools: [{ functionDeclarations: customerServiceFunctions }],
  };

  // Handle multi-turn conversation with function calls
  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config,
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      // Execute all function calls
      const functionCalls = response.functionCalls;

      contents.push(response.candidates[0].content);

      for (const call of functionCalls) {
        console.log(`Executing: ${call.name}(${JSON.stringify(call.args)})`);
        const result = await functionMap[call.name](call.args);

        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: call.name,
                response: { result },
              },
            },
          ],
        });
      }
    } else {
      return response.text;
    }
  }
}

// Usage
const response = await handleCustomerQuery(
  "Customer C123 wants to know about order ORD456 status",
);
console.log(response);
```

### Example 2: Smart Home Controller

```typescript
import { GoogleGenAI, Type } from "@google/genai";

interface DeviceState {
  [deviceId: string]: any;
}

class SmartHomeController {
  private devices: DeviceState = {};

  async setDevice(deviceId: string, state: any): Promise<{ success: boolean }> {
    this.devices[deviceId] = state;
    console.log(`Device ${deviceId} set to:`, state);
    return { success: true };
  }

  async getDevice(deviceId: string): Promise<any> {
    return this.devices[deviceId] || { status: "unknown" };
  }

  async getDeviceList(): Promise<string[]> {
    return Object.keys(this.devices);
  }
}

const controller = new SmartHomeController();

const smartHomeFunctions = [
  {
    name: "set_device_state",
    description: "Sets the state of a smart home device",
    parameters: {
      type: Type.OBJECT,
      properties: {
        device_id: {
          type: Type.STRING,
          description: 'Device identifier (e.g., "living_room_light")',
        },
        state: {
          type: Type.OBJECT,
          description: "New state for the device",
        },
      },
      required: ["device_id", "state"],
    },
  },
  {
    name: "get_device_state",
    description: "Gets the current state of a smart home device",
    parameters: {
      type: Type.OBJECT,
      properties: {
        device_id: {
          type: Type.STRING,
          description: "Device identifier",
        },
      },
      required: ["device_id"],
    },
  },
  {
    name: "list_devices",
    description: "Lists all available smart home devices",
    parameters: {
      type: Type.OBJECT,
      properties: {},
      required: [],
    },
  },
];

async function processSmartHomeCommand(command: string) {
  const ai = new GoogleGenAI({});

  const functionMap: Record<string, Function> = {
    set_device_state: ({ device_id, state }) =>
      controller.setDevice(device_id, state),
    get_device_state: ({ device_id }) => controller.getDevice(device_id),
    list_devices: () => controller.getDeviceList(),
  };

  let contents = [{ role: "user", parts: [{ text: command }] }];
  const config = { tools: [{ functionDeclarations: smartHomeFunctions }] };

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config,
    });

    if (response.functionCalls?.length) {
      contents.push(response.candidates[0].content);

      for (const call of response.functionCalls) {
        const result = await functionMap[call.name](call.args);
        contents.push({
          role: "user",
          parts: [
            { functionResponse: { name: call.name, response: { result } } },
          ],
        });
      }
    } else {
      return response.text;
    }
  }
}

// Usage
await processSmartHomeCommand(
  "Set the living room light to 50% brightness and warm color",
);
```

### Example 3: Data Analysis Assistant

```typescript
import { GoogleGenAI, Type } from "@google/genai";

interface DataQuery {
  query: string;
  filters?: Record<string, any>;
}

interface AnalysisResult {
  summary: string;
  data: any[];
  insights: string[];
}

async function queryDatabase(query: DataQuery): Promise<any[]> {
  // Mock database query
  console.log("Querying database:", query);
  return [
    { date: "2025-01-01", revenue: 50000, users: 1000 },
    { date: "2025-02-01", revenue: 55000, users: 1100 },
    { date: "2025-03-01", revenue: 60000, users: 1200 },
  ];
}

async function performCalculation(expression: string): Promise<number> {
  // Mock calculation
  console.log("Calculating:", expression);
  return eval(expression); // Note: Never use eval in production!
}

async function generateChart(data: any[], chartType: string): Promise<string> {
  // Mock chart generation
  console.log(`Generating ${chartType} chart with ${data.length} data points`);
  return `chart_${Date.now()}.png`;
}

const dataAnalysisFunctions = [
  {
    name: "query_database",
    description: "Queries the database and returns matching records",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "SQL-like query string",
        },
        filters: {
          type: Type.OBJECT,
          description: "Additional filters to apply",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "perform_calculation",
    description: "Performs mathematical calculations",
    parameters: {
      type: Type.OBJECT,
      properties: {
        expression: {
          type: Type.STRING,
          description: "Mathematical expression to evaluate",
        },
      },
      required: ["expression"],
    },
  },
  {
    name: "generate_chart",
    description: "Creates a visualization chart from data",
    parameters: {
      type: Type.OBJECT,
      properties: {
        data: {
          type: Type.ARRAY,
          description: "Data points to visualize",
        },
        chart_type: {
          type: Type.STRING,
          enum: ["line", "bar", "pie", "scatter"],
          description: "Type of chart to generate",
        },
      },
      required: ["data", "chart_type"],
    },
  },
];

async function analyzeData(question: string): Promise<string> {
  const ai = new GoogleGenAI({});

  const functionMap: Record<string, Function> = {
    query_database: queryDatabase,
    perform_calculation: performCalculation,
    generate_chart: generateChart,
  };

  let contents = [{ role: "user", parts: [{ text: question }] }];
  const config = { tools: [{ functionDeclarations: dataAnalysisFunctions }] };

  while (true) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config,
    });

    if (response.functionCalls?.length) {
      contents.push(response.candidates[0].content);

      for (const call of response.functionCalls) {
        console.log(`\nExecuting: ${call.name}`);
        const result = await functionMap[call.name](call.args);
        contents.push({
          role: "user",
          parts: [
            { functionResponse: { name: call.name, response: { result } } },
          ],
        });
      }
    } else {
      return response.text;
    }
  }
}

// Usage
const analysis = await analyzeData(
  "What was our average monthly revenue growth rate? Create a line chart showing the trend.",
);
console.log("\nAnalysis:", analysis);
```

## Best Practices

### 1. Validate Function Arguments

```typescript
function validateArgs<T>(args: any, schema: any): args is T {
  // Implement validation logic
  return true; // Simplified
}

async function safeExecuteFunction(functionCall: FunctionCall) {
  if (!validateArgs(functionCall.args, expectedSchema)) {
    throw new Error("Invalid arguments");
  }

  return await functions[functionCall.name](functionCall.args);
}
```

### 2. Handle Errors Gracefully

```typescript
async function executeFunctionWithErrorHandling(call: FunctionCall) {
  try {
    const result = await functionMap[call.name](call.args);
    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error(`Error executing ${call.name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### 3. Log Function Calls for Debugging

```typescript
function logFunctionCall(call: FunctionCall, result: any) {
  console.log("\n🔧 Function Call:");
  console.log(`  Name: ${call.name}`);
  console.log(`  Args: ${JSON.stringify(call.args, null, 2)}`);
  console.log(`  Result: ${JSON.stringify(result, null, 2)}`);
}
```

### 4. Set Timeouts for Long-Running Functions

```typescript
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Function timeout")), timeoutMs),
    ),
  ]);
}
```

### 5. Use Strongly Typed Function Maps

```typescript
type FunctionHandler<TArgs = any, TResult = any> = (
  args: TArgs,
) => Promise<TResult>;

interface TypedFunctionMap {
  [key: string]: FunctionHandler;
}

const typedFunctions: TypedFunctionMap = {
  get_weather: async (args: { location: string }) => {
    // Type-safe implementation
    return { temp: 25, condition: "sunny" };
  },
};
```

## Error Handling

### Comprehensive Error Handler

```typescript
class FunctionCallError extends Error {
  constructor(
    message: string,
    public functionName: string,
    public args: any,
    public cause?: Error,
  ) {
    super(message);
    this.name = "FunctionCallError";
  }
}

async function robustFunctionCalling(
  prompt: string,
  functions: Record<string, Function>,
  declarations: any[],
): Promise<string> {
  const ai = new GoogleGenAI({});

  let contents = [{ role: "user", parts: [{ text: prompt }] }];
  const config = { tools: [{ functionDeclarations: declarations }] };

  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    iterations++;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config,
      });

      if (!response.functionCalls?.length) {
        return response.text;
      }

      contents.push(response.candidates[0].content);

      for (const call of response.functionCalls) {
        if (!functions[call.name]) {
          throw new FunctionCallError(
            `Unknown function: ${call.name}`,
            call.name,
            call.args,
          );
        }

        try {
          const result = await functions[call.name](call.args);
          contents.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: { result },
                },
              },
            ],
          });
        } catch (error) {
          // Send error back to model to handle
          contents.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: call.name,
                  response: {
                    error:
                      error instanceof Error
                        ? error.message
                        : "Function execution failed",
                  },
                },
              },
            ],
          });
        }
      }
    } catch (error) {
      console.error("Error in function calling loop:", error);
      throw error;
    }
  }

  throw new Error(`Max iterations (${maxIterations}) reached`);
}
```

## Summary

Function calling transforms Gemini into an agent that can:

- **Connect to external APIs and databases** for real-time information
- **Execute computations and actions** beyond text generation
- **Chain multiple function calls** for complex workflows
- **Handle parallel operations** for efficiency

Key considerations for production use:

- **Model doesn't execute functions** - your application must handle execution
- **Validate all arguments** before executing functions
- **Handle errors gracefully** and communicate them back to the model
- **Set appropriate timeouts** for long-running operations
- **Use thinking mode** for improved performance on complex requests
- **Log function calls** for debugging and monitoring
- **Use TypeScript types** for type safety across function interfaces

By combining TypeScript's type system with Gemini's function calling capabilities, you can build robust AI agents that seamlessly interact with real-world systems and APIs.
