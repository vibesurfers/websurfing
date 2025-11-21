# Better Clay: AI-Powered Lead Enrichment 🎯

> Transform any spreadsheet into an intelligent lead enrichment platform using Google Search and AI - no stale databases needed.

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE) [![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](#open-source-contributions) [![BYOK](https://img.shields.io/badge/API_Keys-Bring_Your_Own-orange.svg)](#bring-your-own-keys)

## Why Better Clay?

Traditional tools like Clay.com charge premium prices for outdated database information. **Better Clay** takes a revolutionary approach:

- **Real-time Google Search**: Get fresh data directly from the web, not months-old databases
- **AI-Powered Extraction**: Use Gemini to intelligently extract and structure data from any source
- **Bring Your Own Keys**: No vendor lock-in or markups - use your own API keys and control your costs
- **Open Source**: Fully customizable and extendable to your needs

## What It Does

Better Clay is an AI-powered spreadsheet that can:

1. **Search the web** for any information using natural language
2. **Extract structured data** from websites and search results
3. **Enrich leads** by finding company info, contacts, and insights
4. **Identify ICPs** by searching for specific criteria and signals

### Example: Lead Enrichment Workflow

```
Cell A1: "search: [Company Name] funding news 2024"
  → B1: Latest funding info from web search

Cell A2: "find LinkedIn profile of CEO at [Company]"
  → B2: CEO's LinkedIn URL and summary

Cell A3: "[Company Website URL]"
  → B3: Extracted company description, team size, tech stack
```

## Current Features

- **AI-Powered Spreadsheet**: Every cell can execute searches and extract data
- **Google Search Integration**: Real-time web search in any cell
- **URL Content Extraction**: Paste URLs to automatically extract and summarize
- **Structured Data Output**: Convert messy web data into clean JSON
- **Natural Language Commands**: Type questions, get answers
- **Template System**: Save and reuse enrichment workflows

## Bring Your Own Keys

This is a **BYOK (Bring Your Own Keys)** repository. You control your costs:

### Required API Keys

Create a `.env` file:

```bash
# Google Cloud / Gemini (Required)
GOOGLE_CLOUD_PROJECT="your-project-id"
GOOGLE_CLOUD_LOCATION="us-central1"

# Or use Google AI Studio (simpler)
GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"

# Database (Required)
DATABASE_URL="postgresql://..."

# Authentication (Required)
AUTH_SECRET="generate-random-secret"
AUTH_GOOGLE_ID="oauth-client-id"
AUTH_GOOGLE_SECRET="oauth-secret"
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/vibesurfers/websurfing
cd websurfing

# Install dependencies
pnpm install

# Configure your API keys
cp .env.example .env
# Edit .env with your keys

# Setup database
pnpm db:push

# Start development
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## How to Use for Lead Enrichment

1. **Import your leads** (CSV or manual entry)
2. **Use search commands** to find information:
   - `"search: [Company] latest news"`
   - `"find email pattern for [Domain]"`
   - `"[Company] technology stack site:stackshare.com"`
3. **Extract from URLs**: Paste company websites, LinkedIn profiles, news articles
4. **Export enriched data** as CSV for your CRM

## Roadmap

### Current (Working Now)
- ✅ Spreadsheet interface with AI agent
- ✅ Google Search integration
- ✅ URL content extraction
- ✅ Natural language processing
- ✅ CSV import/export

### Phase 1: Lead Enrichment Features (Q1 2025)
- [ ] ICP scoring algorithm
- [ ] Email pattern detection
- [ ] LinkedIn profile extraction
- [ ] Technology stack identification
- [ ] Company size and growth signals

### Phase 2: Advanced Intelligence (Q2 2025)
- [ ] Intent signal detection from news/jobs
- [ ] Competitive intelligence gathering
- [ ] Automated enrichment workflows
- [ ] Bulk processing with rate limiting

### Phase 3: Integrations (Q3 2025)
- [ ] Direct CRM sync (Salesforce, HubSpot)
- [ ] Webhook triggers for real-time enrichment
- [ ] Additional data sources (LinkedIn, Twitter)
- [ ] Custom scoring models

## Open Source Contributions

We welcome contributions! This project is in active development.

### Good First Issues
- Add email pattern detection
- Implement company size extraction
- Create enrichment templates
- Add export formats (Excel, JSON)
- Improve search query generation

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TipTap Editor
- **Backend**: tRPC, Drizzle ORM, PostgreSQL
- **AI**: Google Gemini 2.5 Flash
- **Auth**: NextAuth.js
- **Search**: Google Search API via Gemini

## Community

- **Issues**: [GitHub Issues](https://github.com/vibesurfers/websurfing/issues)
- **Discussions**: [GitHub Discussions](https://github.com/vibesurfers/websurfing/discussions)

## License

MIT License - see [LICENSE](LICENSE)

---

**Note**: This project is under active development. The lead enrichment features are being built on top of the existing spreadsheet infrastructure. Currently, it functions as a general-purpose AI spreadsheet that can be used for web research and data collection, with specialized lead enrichment capabilities coming soon.