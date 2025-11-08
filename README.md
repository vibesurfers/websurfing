# Tiptap Table Event Queue System

This is a [T3 Stack](https://create.t3.gg/) project implementing a spreadsheet-like interface with PostgreSQL-based event queue processing.

## Features

- **Tiptap Table**: Interactive 2x8 spreadsheet with cell editing
- **Event Queue**: PostgreSQL-based task queue for processing cell edits
- **Real-time Updates**: Automatic polling and event processing
- **Debounced Input**: Smart input handling to reduce event spam

## Tech Stack

- [Next.js](https://nextjs.org) - React framework
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM
- [PostgreSQL](https://postgresql.org) - Database (via Neon)
- [tRPC](https://trpc.io) - End-to-end typesafe APIs
- [Tiptap](https://tiptap.dev) - Rich text editor for tables
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [NextAuth.js](https://next-auth.js.org) - Authentication

## Database Setup

### Environment Variables
Create a `.env` file:
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
AUTH_SECRET="your-secret-key"
AUTH_GOOGLE_ID="google-oauth-id"
AUTH_GOOGLE_SECRET="google-oauth-secret"
```

### Database Commands
```bash
# Push schema to database
pnpm db:push

# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### Database Schema
See [Database Documentation](.tribe/db_documentation.md) for complete schema details.

## Development Workflow

### Getting Started
```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Push schema to database
pnpm db:push

# Start development server
pnpm dev
```

### Available Scripts
```bash
pnpm dev          # Start Next.js development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript checks

# Database
pnpm db:push      # Push schema changes to database
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open database GUI

# Testing
pnpm test:e2e     # Run Playwright tests
pnpm test:e2e:ui  # Run Playwright tests with UI
```

### Key Features Usage

#### Tiptap Table
- Navigate to http://localhost:3000
- Click any cell in the 2x8 table to edit
- Content automatically saves with 1-second debouncing
- View real-time events in the debug panel below

#### Event Queue Processing
- Edit cells to create events
- Click "Process Events" to trigger server-side processing
- Click "Refresh Events" to see updated status
- Events are stored in PostgreSQL and processed asynchronously

#### Database Monitoring
```bash
# Open Drizzle Studio
pnpm db:studio
# Navigate to https://local.drizzle.studio?port=5555
# View tables: cells, event_queue, users, accounts, sessions
```

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.
