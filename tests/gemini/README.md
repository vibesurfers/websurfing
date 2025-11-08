# Gemini Operator Tests

Test scripts for all 4 Gemini operators + end-to-end pipeline.

## Setup

### Quick Setup (Credentials Already in Repo)

The credentials file is already in `.secrets/gcloud-adc.json`. Just verify your `.env`:

```bash
GOOGLE_APPLICATION_CREDENTIALS=".secrets/gcloud-adc.json"
GOOGLE_CLOUD_PROJECT="vibesurfers-websurfing"
GOOGLE_CLOUD_LOCATION="us-central1"
```

Then run tests:

```bash
pnpm test:gemini:search
```

### Manual Setup (If Generating New Credentials)

```bash
# 1. Authenticate with your Google account
gcloud auth application-default login

# 2. Copy credentials to repo
cp ~/.config/gcloud/application_default_credentials.json .secrets/gcloud-adc.json

# 3. Update .env
GOOGLE_APPLICATION_CREDENTIALS=".secrets/gcloud-adc.json"
GOOGLE_CLOUD_PROJECT="vibesurfers-websurfing"
```

**Note**: `.secrets/` is gitignored - credentials won't be committed.

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

## Troubleshooting

**Error: Permission denied**
→ Run: `gcloud auth application-default login`

**Error: Project not found**
→ Set `GOOGLE_CLOUD_PROJECT` in `.env`

**Error: Module not found**
→ Run: `pnpm install`

## Full Documentation

See [docs/GEMINI.md](../../docs/GEMINI.md) for complete integration documentation.
