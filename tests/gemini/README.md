# Gemini Operator Tests

Test scripts for all 4 Gemini operators + end-to-end pipeline.

## Setup

```bash
pnpm test:gemini:search
```


## Run Tests

```bash
# Individual operators
pnpm test:gemini:search       # Google Search
pnpm test:gemini:url          # URL Context
pnpm test:gemini:structured   # Structured Output
pnpm test:gemini:functions    # Function Calling

# Complete pipeline
pnpm test:gemini:e2e          # End-to-end test

# All tests
pnpm test:gemini:all
```

## Test Files

| File | Tests |
|------|-------|
| `test-google-search.ts` | Search queries, citations, result formatting |
| `test-url-context.ts` | URL extraction, multi-URL comparison |
| `test-structured-output.ts` | Person/product/sentiment extraction |
| `test-function-calling.ts` | Function detection and execution |
| `test-end-to-end.ts` | Complete Search → URL → Structured pipeline |
