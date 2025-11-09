# VibeSheets 🚀

**Team Vibesurfers** | YC Vibe Coding Hackathon 2025

> A natural language-powered spreadsheet that transforms cells into AI agents. Type, ask, automate - let Gemini do the work.

[![Demo](https://img.shields.io/badge/Demo-Live-green)]() [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🎯 The Problem We're Solving

Modern spreadsheets are powerful but rigid. Data enrichment requires switching between tabs, copy-pasting, and manual API calls. What if your spreadsheet could:
- **Search the web** and populate results automatically
- **Extract structured data** from messy text
- **Call APIs** based on natural language
- **Chain operations** across cells like a visual programming language

**VibeSheets** makes this real with Gemini 2.5.

## 💡 What We Built

A collaborative spreadsheet where **every cell is a potential AI agent**:

```
Cell A1: "search for Next.js 15 features"
  ↓ (Gemini Google Search)
Cell B1: https://nextjs.org/docs, https://react.dev...
  ↓ (Gemini URL Context)
Cell C1: { features: [...], releaseDate: "..." }
  ↓ (Gemini Structured Output)
Cell D1: "✓ 12 features extracted"
```

### Key Features

1. **🔍 Natural Language Triggers**
   - Type `search: best coffee in SF` → Gemini searches and populates adjacent cells
   - Type URLs → Gemini extracts and summarizes content
   - Type raw data → Gemini structures it into JSON

2. **🤖 Autonomous Cascading**
   - Robot mode: Updates trigger new AI operations automatically
   - Human mode: Full control over each step
   - Event queue visualizes the entire processing pipeline

3. **🔗 4 Gemini Operators**
   - **Google Search**: Real-time web search with citations
   - **URL Context**: Multi-URL content extraction and comparison
   - **Structured Output**: Type-safe JSON generation with Zod schemas
   - **Function Calling**: Natural language → API calls

4. **📊 Multi-Sheet Workspace**
   - Create unlimited sheets per user
   - Real-time updates across team members
   - Event history and audit trail

## 🧠 How We Used Gemini

### 1. **Google Search Grounding** (`google_search` operator)
```typescript
// User types: "who won 2024 euro cup?"
const result = await gemini.generateContent({
  contents: cellContent,
  config: { tools: [{ googleSearch: {} }] }
});
// → Returns: "Spain won" + grounding metadata with sources
```

**Impact**: No more tab-switching. Search results flow directly into your workflow.

### 2. **URL Context Tool** (`url_context` operator)
```typescript
// User pastes: https://docs.api.com/v1
const result = await gemini.generateContent({
  contents: "Extract API endpoints and their parameters",
  config: { tools: [{ urlContext: {} }] }
});
// → Returns: Structured API documentation
```

**Impact**: Compare docs, extract data from multiple sources in one cell.

### 3. **Structured Output** (`structured_output` operator)
```typescript
// User pastes messy customer data
const result = await gemini.generateContent({
  contents: rawText,
  config: {
    responseMimeType: "application/json",
    responseJsonSchema: zodToJsonSchema(CustomerSchema)
  }
});
// → Returns: Type-safe { name, email, phone } object
```

**Impact**: Turn chaos into clean data. Always valid, always typed.

### 4. **Function Calling** (`function_calling` operator)
```typescript
// User types: "schedule meeting with Alice tomorrow at 2pm"
const result = await gemini.generateContent({
  contents: cellContent,
  config: {
    tools: [{
      functionDeclarations: [scheduleMeetingFunction]
    }]
  }
});
// → Gemini calls: scheduleMeeting({ attendee: "Alice", ... })
```

**Impact**: Natural language becomes executable code.

### 5. **Multimodal Vision** (coming soon)
- Drag images into cells → Gemini describes/extracts text
- Screenshot → Structured data extraction

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────┐
│  Next.js 15 + React 19 (Tiptap Editor)             │
│  ┌───────────────────────────────────────────────┐ │
│  │  User edits cell → Event Queue (PostgreSQL)   │ │
│  │         ↓                                      │ │
│  │  OperatorController dispatches to Gemini      │ │
│  │         ↓                                      │ │
│  │  Gemini 2.5 Flash processes with tools        │ │
│  │         ↓                                      │ │
│  │  SheetUpdater writes results back             │ │
│  │         ↓                                      │ │
│  │  Real-time UI updates (tRPC)                  │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Tech Stack
- **Frontend**: Next.js 15, React 19, Tiptap (rich text tables)
- **Backend**: tRPC, Drizzle ORM, PostgreSQL (Neon)
- **AI**: Vertex AI Gemini 2.5 Flash, Google Gen AI SDK
- **Auth**: NextAuth.js (Google OAuth)
- **Deployment**: Vercel

## 🎬 Demo Scenarios

### Scenario 1: Competitive Analysis
```
A1: "search top 5 CRM tools 2025"
  → B1-B5: URLs of CRM products
B1: [URLs] + "extract pricing"
  → C1-C5: { product, pricing, features }
C1: [Structured data] + "compare features"
  → D1: Full comparison table
```

### Scenario 2: Data Enrichment Pipeline
```
A1: "John Doe, john@example.com"
  → B1: { name: "John Doe", email: "john@example.com" }
B1: [Structured data] + "search for LinkedIn profile"
  → C1: LinkedIn URL
C1: [URL] + "extract work history"
  → D1: { companies: [...], roles: [...] }
```

### Scenario 3: API Documentation Assistant
```
A1: "https://stripe.com/docs/api"
  → B1: "Stripe API allows payments, subscriptions..."
A2: "extract all payment endpoints"
  → B2: { endpoints: ["/charges", "/refunds", ...] }
A3: "generate curl examples"
  → B3: curl -X POST https://api.stripe.com/v1/charges...
```

## 🚀 Getting Started

### Prerequisites
```bash
node >= 18
pnpm >= 8
PostgreSQL database (or Neon)
Google Cloud Project with Vertex AI enabled
```

### Installation

1. **Clone and install**
```bash
git clone https://github.com/vibesurfers/vibesheets
cd vibesheets
pnpm install
```

2. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Database
DATABASE_URL="postgresql://..."

# Google Cloud (for Vertex AI)
GOOGLE_CLOUD_PROJECT="your-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"

# Auth with ADC (local development)
# Run: gcloud auth application-default login

# Or use service account JSON (production)
GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'

# NextAuth
AUTH_SECRET="your-secret"
AUTH_GOOGLE_ID="your-google-oauth-id"
AUTH_GOOGLE_SECRET="your-google-oauth-secret"
```

3. **Setup database**
```bash
pnpm db:push
```

4. **Run development server**
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Testing Gemini Operators

```bash
# Test individual operators
pnpm test:gemini:search       # Google Search
pnpm test:gemini:url          # URL Context
pnpm test:gemini:structured   # Structured Output
pnpm test:gemini:functions    # Function Calling

# Test complete pipeline
pnpm test:gemini:e2e

# Run all tests
pnpm test:gemini:all
```

## 📚 Usage Guide

### Basic Operations

1. **Create a new sheet**
   - Click "+ New" in the sheet selector
   - Name your sheet

2. **Trigger Google Search**
   - Type: `search: your query` or `who is...?` or `what is...?`
   - Wait 5 seconds or click "Process Events"
   - Results appear in adjacent cells

3. **Process URLs**
   - Paste URLs in cells
   - They auto-process with URL Context operator
   - Summaries/extractions populate automatically

4. **Extract Structured Data**
   - Paste raw text (emails, invoices, resumes)
   - Gemini extracts to JSON schema
   - Results are type-safe and validated

5. **Toggle Robot Mode**
   - **Robots: ON** (orange) - Updates cascade automatically
   - **Robots: OFF** (purple) - Manual control over each step

### Advanced: Custom Operators

Create your own Gemini operator:

```typescript
// src/server/operators/my-operator.ts
export class MyCustomOperator implements BaseOperator {
  async operation(input: MyInput): Promise<MyOutput> {
    const client = getGeminiClient();
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: input.prompt,
      config: { /* your config */ }
    });
    return { data: result.text };
  }
}
```

Register in `operator-controller.ts`:
```typescript
this.operators.set("my_operator", new MyCustomOperator());
```

## 🎯 Hackathon Alignment

### Problem Statement: **Enhanced Integrations**

> "How can we plug in databases, DevOps, infrastructure, auth, and other necessary elements into software generation tools?"

**Our Answer**: VibeSheets proves Gemini can be the universal adapter between:
- Natural language (user intent)
- External APIs (Google Search, URLs, functions)
- Structured data (databases, spreadsheets)

### Why This Matters

1. **Impact (25%)** 
   - Replaces 10+ tools: Zapier, Google Sheets formulas, web scrapers, API clients
   - Saves hours on data enrichment workflows
   - Makes AI accessible to non-programmers

2. **Demo (50%)**
   - Fully functional with 4 production-ready operators
   - Real-time cascading updates
   - Live event queue visualization
   - E2E tests demonstrate reliability

3. **Creativity (15%)**
   - Novel "cell as agent" paradigm
   - Visual programming meets natural language
   - Robot/human toggle for controllable autonomy

4. **Pitch (10%)**
   - Clear value prop: "Your spreadsheet, turbocharged by Gemini"
   - Relatable demos: competitive analysis, data enrichment
   - Enterprise-ready architecture

## 🔮 Future Roadmap

### Short-term
- [ ] Image/PDF cell support (Gemini Vision)
- [ ] Real-time collaboration (multiplayer)
- [ ] Formula language: `=GEMINI("search: ...", A1)`
- [ ] Operator marketplace (community operators)

### Long-term
- [ ] Gemini Code Assist integration (generate Python/SQL in cells)
- [ ] Database connectors (PostgreSQL, BigQuery)
- [ ] Scheduled automations (cron-like triggers)
- [ ] Export to Google Sheets/Excel with preserved logic

## 👥 Team Vibesurfers

- **Maksym** - Gemini integration, Mastra Agent integration, deployment
- **Alex** - Spreadsheet component

## 📄 License

MIT License - see [LICENSE](LICENSE)


[View Demo]() | [Watch Video]() | [GitHub](https://github.com/vibesurfers/websurfing)