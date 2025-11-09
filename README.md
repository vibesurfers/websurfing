# VibeSheets 🚀

**Team Vibesurfers** | Google Vibe Coding Hackathon 2025

> A dual-AI spreadsheet combining conversational agents with automatic cell processing. Chat with Mastra agents for bulk operations, edit cells for instant AI enrichment - powered by Gemini 2.5.

[![Demo](https://img.shields.io/badge/Demo-Live-green)]() [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## 🎯 The Problem We're Solving

Modern spreadsheets are powerful but rigid. Data enrichment requires switching between tabs, copy-pasting, and manual API calls. What if your spreadsheet could:
- **Search the web** and populate results automatically
- **Extract structured data** from messy text
- **Call APIs** based on natural language
- **Chain operations** across cells like a visual programming language

**VibeSheets** makes this real with Gemini 2.5.

## 💡 What We Built

A **dual-architecture AI spreadsheet** combining conversational agents with automatic cell processing:

### 🗣️ **Mastra Agent Flow** (Conversational Bulk Operations)
```
User: "Find top 20 pizza places in SF"
  ↓ (Agent Chat Interface)
Agent: "I'll search for 20 pizza places. Ready to create rows?"
  ↓ (Preview/Confirm)
Result: 20 rows created with restaurant names
  ↓ (Triggers Operator Events)
Automatic: Phone numbers, websites, ratings filled by operators
```

### ⚡ **Operator Flow** (Instant Cell Processing)
```
Cell A1: "search for Next.js 15 features"
  ↓ (Cell Edit Event)
Cell B1: https://nextjs.org/docs, https://react.dev...
  ↓ (Automatic URL Processing)
Cell C1: { features: [...], releaseDate: "..." }
  ↓ (Structured Data Extraction)
Cell D1: "✓ 12 features extracted"
```

### 🔄 **Hybrid Power**: Agents Create → Operators Enrich

## ✨ Key Features

### 1. **🤖 Mastra Conversational Agents**
   - **Natural language bulk operations**: "Find 50 restaurants near me"
   - **Preview/confirm workflow**: See what will be created before executing
   - **Dynamic sheet management**: Add/remove columns conversationally
   - **Context retention**: Remembers previous requests and sheet state
   - **Intelligent tools**: Google Search, Google Maps, Sheet manipulation

### 2. **⚡ Gemini Cell Operators**
   - **Instant processing**: Type in cell → automatic AI enrichment
   - **6 Specialized operators**: Google Search, URL Context, Structured Output, Function Calling, Academic Search, Similarity
   - **Template intelligence**: Different behavior for scientific vs marketing sheets
   - **Event-driven pipeline**: Visualize processing queue in real-time

### 3. **💡 CSV Import Intelligence**
   - **Drag-and-drop CSV upload** with live preview
   - **Automatic template suggestions** for data enrichment
   - **Seamless integration** with both agents and operators

### 4. **🎛️ Dual Control Modes**
   - **Robots: ON** (orange) - Full automation, updates cascade automatically
   - **Robots: OFF** (purple) - Manual control, preview each step
   - **Agent Sidebar** - Chat interface for complex operations (Cmd/Ctrl+K)

## 🧠 How We Used Gemini

### **Mastra Agent System**
Built with **Mastra framework** + **Vertex AI Gemini 2.5 Flash**:

```typescript
// Natural language → Tool selection → Bulk operation
await spreadsheetAgent.generateText({
  input: "Find top 20 pizza places in SF",
  context: { sheetId, userId },
  tools: [googleMapsTool, sheetWriterTool, columnManagerTool]
});
// → Agent uses googleMapsTool → Creates 20 rows with preview
```

**Mastra Tools Available**:
- 🔍 **Google Search Tool**: Web search with grounding
- 🗺️ **Google Maps Tool**: Local business search with detailed data
- 📝 **Sheet Writer Tool**: Bulk row creation with preview/execute modes
- 🔧 **Column Manager Tool**: Add, remove, reorder columns dynamically
- 📊 **Sheet Reader Tool**: Query existing sheet data and structure
- 🗑️ **Row Manager Tool**: Delete specific or empty rows

### **Cell Operator System**
Event-driven processing with **6 specialized Gemini operators**:

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

## 🏗️ Dual Technical Architecture

### **🔄 Complete System Flow**
```
┌─────────────────────────────────────────────────────┐
│                    USER INTERFACE                   │
│  ┌─────────────────┐    ┌─────────────────────────┐ │
│  │  Agent Sidebar  │    │     Tiptap Editor       │ │
│  │  (Chat + Tools) │    │    (Cell Grid)          │ │
│  └─────────────────┘    └─────────────────────────┘ │
│           │                        │               │
│           ▼                        ▼               │
│  ┌─────────────────┐    ┌─────────────────────────┐ │
│  │ Mastra Agents   │    │   Event-Driven Pipeline │ │
│  │ Bulk Operations │    │   Cell-by-Cell Process  │ │
│  │ (Conversational)│    │   (Automatic Operators) │ │
│  └─────────────────┘    └─────────────────────────┘ │
│           │                        │               │
│           └────────┐      ┌────────┘               │
│                    ▼      ▼                        │
│           ┌─────────────────────────┐               │
│           │   Shared Database       │               │
│           │   PostgreSQL + tRPC     │               │
│           └─────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

### **🤖 Mastra Agent Flow**
```
User Chat → Mastra Agent → Tool Selection → Bulk Operation → Events
    ↓             ↓             ↓              ↓           ↓
"Find pizza" → Context + → googleMapsTool → 20 rows → Triggers
             Memory                        created   Operators
```

### **⚡ Operator Flow**
```
Cell Edit → Event Queue → Operator Controller → Gemini → Result
    ↓           ↓              ↓               ↓        ↓
 Debounce → Database → Route by content → Process → Write back
```

### Tech Stack
- **Frontend**: Next.js 15, React 19, Tiptap (rich text tables)
- **Backend**: tRPC, Drizzle ORM, PostgreSQL (Neon)
- **AI Frameworks**:
  - **Mastra** (Conversational agents, tools, memory)
  - **Custom Operators** (Event-driven cell processing)
- **AI Models**: Vertex AI Gemini 2.5 Flash, Google Gen AI SDK
- **Auth**: NextAuth.js (Google OAuth)
- **Deployment**: Vercel

## 🎬 Demo Scenarios

### **🗣️ Agent-Driven Scenario**: Restaurant Research
```
Agent Chat: "Find top 20 Italian restaurants in SF with ratings"
    ↓ (Mastra Agent + Google Maps Tool)
Result: 20 rows created with [Name, Address, Phone, Website, Rating]
    ↓ (Triggers Operator Events)
Auto-fill: Reviews extracted from websites, menu links, price ranges
```

### **⚡ Cell-Driven Scenario**: Competitive Analysis
```
A1: "search top 5 CRM tools 2025"
  → B1-B5: URLs of CRM products (Google Search Operator)
B1: [URLs] + context → pricing data extracted (URL Context Operator)
  → C1-C5: { product, pricing, features } (Structured Output Operator)
C1: [Data] → comparison table generated (Function Calling Operator)
```

### **🔄 Hybrid Scenario**: Lead Enrichment
```
1. Agent Chat: "Import this CSV of leads and enrich with LinkedIn data"
   → Agent processes CSV, creates rows with name/email

2. Cell Processing: Each row automatically triggers:
   → LinkedIn search (Google Search Operator)
   → Profile extraction (URL Context Operator)
   → Data structuring (Structured Output Operator)

Result: Complete lead database with work history, company info, contact details
```

### **📊 CSV Import Scenario**: Company Analysis
```
1. Drag CSV file: "startup-list.csv" (Company Name, Website)
   → Preview shows 50 companies
   → Creates sheet with template prompt

2. Agent Chat: "Add funding and employee count columns"
   → Columns added dynamically

3. Auto-enrichment: Website → Company info, funding data, employee counts
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

- **Maksym** - Architecture, Gemini integration, backend
- [Add team members]

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- Anthropic for Claude (used for code generation during development)
- Vercel for Next.js and hosting
- Google for Gemini API and Vertex AI
- Cerebral Valley for organizing the hackathon

---

**Built with ❤️ and Gemini 2.5 Flash at the 2025 Google Vibe Coding Hackathon**

[View Demo]() | [Watch Video]() | [GitHub](https://github.com/vibesurfers/vibesheets)