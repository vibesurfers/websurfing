/**
 * Test script for Function Calling Operator
 *
 * Run with: npx tsx tests/gemini/test-function-calling.ts
 */

// Load environment variables FIRST, before any other imports
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (two levels up from tests/gemini/)
config({ path: resolve(__dirname, "../../.env") });

// Skip full env validation for tests - we only need VERTEX_API_KEY
process.env.SKIP_ENV_VALIDATION = "true";

import {
  FunctionCallingOperator,
  FunctionRegistry,
  CommonFunctionDeclarations,
} from "../../src/server/operators/function-calling-operator";

async function testFunctionCalling() {
  console.log("🔧 Testing Function Calling Operator\n");

  const operator = new FunctionCallingOperator();
  const registry = new FunctionRegistry();

  // Register mock function implementations
  registry.register("get_current_time", async (args) => {
    const timezone = args.timezone as string;
    const now = new Date();
    return {
      timezone,
      time: now.toLocaleTimeString("en-US", { timeZone: timezone }),
      date: now.toLocaleDateString("en-US", { timeZone: timezone }),
    };
  });

  registry.register("schedule_meeting", async (args) => {
    console.log("\n📅 Mock: Scheduling meeting with:", args);
    return {
      success: true,
      meetingId: "mtg-" + Math.random().toString(36).slice(2, 11),
      message: "Meeting scheduled successfully",
    };
  });

  // Test 1: Get current time
  console.log("Test 1: Get current time");
  console.log('Prompt: "What time is it in New York?"\n');

  try {
    const getCurrentTimeFunc = CommonFunctionDeclarations.getCurrentTime;
    if (!getCurrentTimeFunc) throw new Error("Function declaration not found");

    const result = await operator.operation({
      prompt: "What time is it in New York?",
      availableFunctions: [getCurrentTimeFunc],
    });

    console.log("✅ Success!");
    console.log(`Requires execution: ${result.requiresExecution}`);

    if (result.functionCalls.length > 0) {
      console.log("\nFunction Calls:");
      result.functionCalls.forEach((call, i) => {
        console.log(`${i + 1}. ${call.name}(${JSON.stringify(call.args)})`);
      });

      // Execute the function
      for (const call of result.functionCalls) {
        if (registry.has(call.name)) {
          const execResult = await registry.execute(call.name, call.args);
          console.log("\nExecution Result:");
          console.log(JSON.stringify(execResult, null, 2));
        }
      }
    }

    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 2: Schedule meeting
  console.log("Test 2: Schedule meeting");
  console.log(
    'Prompt: "Schedule a team sync with alice@example.com and bob@example.com for tomorrow at 2pm to discuss Q1 goals"\n'
  );

  try {
    const scheduleMeetingFunc = CommonFunctionDeclarations.scheduleMeeting;
    if (!scheduleMeetingFunc) throw new Error("Function declaration not found");

    const result = await operator.operation({
      prompt:
        "Schedule a team sync with alice@example.com and bob@example.com for tomorrow at 2pm to discuss Q1 goals",
      availableFunctions: [scheduleMeetingFunc],
    });

    console.log("✅ Success!");

    if (result.functionCalls.length > 0) {
      console.log("\nFunction Calls:");
      result.functionCalls.forEach((call, i) => {
        console.log(`${i + 1}. ${call.name}(`);
        Object.entries(call.args).forEach(([key, value]) => {
          console.log(`     ${key}: ${JSON.stringify(value)}`);
        });
        console.log(")");
      });

      // Execute the function
      for (const call of result.functionCalls) {
        if (registry.has(call.name)) {
          const execResult = await registry.execute(call.name, call.args);
          console.log("\nExecution Result:");
          console.log(JSON.stringify(execResult, null, 2));
        }
      }
    }

    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }

  // Test 3: Multiple functions available
  console.log("Test 3: Multiple functions available");
  console.log(
    'Prompt: "Schedule a meeting with the team at 3pm UTC and also tell me what time that is in Tokyo"\n'
  );

  try {
    const scheduleMeetingFunc = CommonFunctionDeclarations.scheduleMeeting;
    const getCurrentTimeFunc = CommonFunctionDeclarations.getCurrentTime;
    if (!scheduleMeetingFunc || !getCurrentTimeFunc) {
      throw new Error("Function declarations not found");
    }

    const result = await operator.operation({
      prompt:
        "Schedule a meeting with the team at 3pm UTC and also tell me what time that is in Tokyo",
      availableFunctions: [scheduleMeetingFunc, getCurrentTimeFunc],
    });

    console.log("✅ Success!");
    console.log(`Function calls detected: ${result.functionCalls.length}`);

    if (result.functionCalls.length > 0) {
      console.log("\nFunction Calls:");
      result.functionCalls.forEach((call, i) => {
        console.log(`${i + 1}. ${call.name}(${JSON.stringify(call.args)})`);
      });
    } else if (result.response) {
      console.log("\nDirect Response:");
      console.log(result.response);
    }

    console.log("\n" + "=".repeat(80) + "\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Run tests
testFunctionCalling()
  .then(() => {
    console.log("✨ All tests completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
