# PROJECT-ARCHITECTURE.md

## Spreadsheet
UI Component managing the user's spreadsheet

Should support an event firing whenever the user edits a cell. 

Must support a 'Go' button to trigger an event directly.
 
## Event Queue
DB Table including user ID and event details (postgres nested json) that can be processed by Operators. 

## Event Types 
All events should use a standard type, containing nested JSON, with common data types above it

```ts
class event {
     userId : TYPE USERID,
     eventId : Unique Event ID from DB,
     data : { ... JSONB  }  // from the spreadsheets events generator

}
```

## Operators
The core functionality of the system runs inside operators, which are containers for API calls and specific event processing.

There are three types of operators: 
1. Google Search Gemini Operator
2. Google URL Context Enrichment Gemini Operator
3. Google Gemini Structured Output Conversion Operator

Each operator must have a standard input / output type definition, which may vary from operator to operator, but must be specified and defined globally as a type so that other operators can structure their outputs.

```ts 
class operator {
      input: TYPE,
      output: TYPE,
      operation: function (input) {
              ... 
              return as output;
      },
      next: function (output) {
      	...
      	// i.e. call another operator, or update the sheet in the UI 
      }

}
```

## Operator Controller
The operator controller ingests the event queue and dispatches operators to solve each type of problem.

The Operator Controller decides which Operator to assign to an Event based on the type of event (via a simple switch with hardcoded processing directions).


## dTransformer
A dynamic transformer is an object with multiple nested operators and required input formats.

```ts
class dTransformer {
     inputA: type, // initial user input 
     outputA: type, // output from operatorA back to user (clarifying question)
     inputB: type, // input from user in response to OutputA
     outputB: type, // output from operator B (with context of InputA, outputA, and InputB)
     operatorA: instanceOfOperator, // processes inputA to outputB
     operatorB: instanceOfOperator // processes inputA, outputB, inputB to outputB
}

```

dTransformers contain two nested operators, with a step between them that requires further user input. 




















