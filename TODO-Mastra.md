# Mastra Integration: Agentic Spreadsheet Interface 🏄‍♂️

> **Vision**: Transform VibeSurfers into an intelligent spreadsheet where users chat with an AI agent to search, add rows, upload CSVs, and dynamically configure columns - all with good vibes!

## 🎯 Implementation Standards

**Model Choice**: Always use `gemini-2.5-flash` via Google Vertex AI
- Consistent performance across the app
- Cost-effective for high-volume operations
- Fast response times for good UX vibes
- **Provider**: Use `vertex` from `@ai-sdk/google-vertex` (NOT `google` from `@ai-sdk/google`)
- **Example**: `model: vertex("gemini-2.5-flash")`
- **Auth**: Uses Google Cloud Application Default Credentials via `GOOGLE_VERTEX_PROJECT` and `GOOGLE_VERTEX_LOCATION` env vars

---

## 📋 Task Breakdown by Phase

### ✅ Phase 1: Mastra Foundation (2-3 hours) - COMPLETED

- [x] **1.1** Install Mastra dependencies
  - [x] `pnpm add @mastra/core @mastra/memory @mastra/pg @mastra/loggers`
  - [x] `pnpm add @ai-sdk/google-vertex` (Vertex AI provider)

- [x] **1.2** Create Mastra directory structure
  - [x] Create `src/mastra/` directory
  - [x] Create `src/mastra/agents/` directory
  - [x] Create `src/mastra/tools/` directory

- [x] **1.3** Setup Mastra instance
  - [x] Create `src/mastra/index.ts` with Mastra config
  - [x] Configure PostgreSQL storage using DATABASE_URL
  - [x] Setup PinoLogger
  - [x] Export mastra instance

- [x] **1.4** Test basic Mastra setup
  - [x] Create simple test agent (using gemini-2.5-flash)
  - [ ] Verify database connection (next)
  - [ ] Confirm logging works (next)

---

### 🛠️ Phase 2: Core Tools Development (4-5 hours)

- [ ] **2.1** Sheet Reader Tool (`src/mastra/tools/sheet-reader.ts`)
  - [ ] Read sheet metadata (id, name, templateType, systemPrompt)
  - [ ] Read all columns (id, title, position, dataType, operatorType)
  - [ ] Read all cells for sheet (optionally filtered by row)
  - [ ] Return structured sheet state object
  - [ ] Add error handling for non-existent sheets

- [ ] **2.2** Sheet Writer Tool (`src/mastra/tools/sheet-writer.ts`)
  - [ ] Input: sheetId, rows array (each row = array of cell contents)
  - [ ] Output: Preview object (row count, sample rows, columns needed)
  - [ ] Mode: 'preview' (just return plan) or 'execute' (actually write)
  - [ ] Create cells in database (batch insert)
  - [ ] Create events for first column of each row
  - [ ] Return success status + row IDs created

- [ ] **2.3** Column Manager Tool (`src/mastra/tools/column-manager.ts`)
  - [ ] Add column: title, position, dataType, operatorType, operatorConfig, prompt
  - [ ] Remove column: delete column and reorder remaining
  - [ ] Reorder columns: update positions
  - [ ] Update column config: modify operatorType, operatorConfig, prompt
  - [ ] Validate operations (don't delete column with data without confirmation)

- [ ] **2.4** Google Search Tool (`src/mastra/tools/google-search.ts`)
  - [ ] Use Gemini (gemini-2.5-flash) with googleSearch grounding
  - [ ] Input: query string, location context (optional)
  - [ ] Extract results from groundingMetadata
  - [ ] Return: array of { title, url, snippet }
  - [ ] Handle rate limiting and errors gracefully

- [ ] **2.5** Google Maps Tool (`src/mastra/tools/google-maps.ts`)
  - [ ] Use Gemini (gemini-2.5-flash) with googleMaps grounding
  - [ ] Input: placeType (e.g., "pizza restaurant"), location, radius
  - [ ] Extract places from groundingMetadata
  - [ ] Return: array of { name, address, placeId, rating, uri }
  - [ ] Support widget token for future UI integration

- [ ] **2.6** CSV Analyzer Tool (`src/mastra/tools/csv-analyzer.ts`)
  - [ ] Input: CSV file content (string or buffer)
  - [ ] Parse headers using papaparse
  - [ ] Sample first 100 rows (or configurable limit)
  - [ ] Detect column types (string, number, url, email)
  - [ ] Return: { headers, rowCount, sample, suggestedTypes }
  - [ ] Handle large files with streaming

---

### 🤖 Phase 3: Spreadsheet Agent Creation (3-4 hours)

- [ ] **3.1** Create Spreadsheet Agent (`src/mastra/agents/spreadsheet-agent.ts`)
  - [ ] Define agent with name, description, instructions
  - [ ] Use gemini-2.5-flash model
  - [ ] Configure working memory (track current sheet, pending previews)
  - [ ] Register all tools: sheetReader, sheetWriter, columnManager, googleSearch, googleMaps, csvAnalyzer

- [ ] **3.2** Write agent instructions
  - [ ] How to understand natural language queries
  - [ ] When to use which tools
  - [ ] How to create previews before execution
  - [ ] How to handle confirmations and cancellations
  - [ ] Examples: "find top 20 pizzas in SF", "add a Phone column", "upload this CSV"

- [ ] **3.3** Configure agent memory
  - [ ] Working memory template with current sheet context
  - [ ] Track: sheetId, pending preview, conversation state
  - [ ] Semantic recall for past queries (optional)
  - [ ] Resource-scoped memory for per-sheet conversations

- [ ] **3.4** Create Search Specialist Agent (optional)
  - [ ] `src/mastra/agents/search-agent.ts`
  - [ ] Specialized for location/business queries (use gemini-2.5-flash)
  - [ ] Uses only googleSearch and googleMaps tools
  - [ ] Can be delegated to by main spreadsheet agent

---

### 🎨 Phase 4: Right Sidebar Chat Panel (5-6 hours)

- [ ] **4.1** Create Agent Sidebar Component (`src/components/agent-sidebar.tsx`)
  - [ ] Slide-out panel from right side
  - [ ] Toggle button (icon: sparkles or robot)
  - [ ] Resizable width (min 300px, max 600px)
  - [ ] Collapsible sections: Chat, Column Config, Previews
  - [ ] Mobile: Full-screen overlay

- [ ] **4.2** Create Agent Chat Interface (`src/components/agent-chat.tsx`)
  - [ ] Message list (scrollable, auto-scroll to bottom)
  - [ ] Input field with send button
  - [ ] Message types: user, agent, system, preview
  - [ ] Typing indicator while agent processes
  - [ ] Support for markdown in agent responses
  - [ ] Error message display

- [ ] **4.3** Create Preview Card Component (`src/components/preview-card.tsx`)
  - [ ] Display preview type: "Bulk Row Creation", "Add Column", "CSV Import"
  - [ ] Show summary: row count, column names, sample data
  - [ ] Action buttons: "Confirm", "Cancel", "Modify"
  - [ ] Visual: card with distinct styling, icons
  - [ ] Expandable details section

- [ ] **4.4** Create Column Config Panel (`src/components/column-config-panel.tsx`)
  - [ ] List all columns with: title, position, dataType, operatorType
  - [ ] Show operator configuration (if set)
  - [ ] Show prompt (if set)
  - [ ] Visual indicators: which columns have operators, dependencies
  - [ ] Click to edit (opens agent chat with context)

- [ ] **4.5** Integrate Sidebar into SheetEditor
  - [ ] Add AgentSidebar to `src/components/sheet-editor.tsx`
  - [ ] Pass sheetId prop
  - [ ] Add toggle state (open/closed)
  - [ ] Keyboard shortcut: Cmd/Ctrl + K to toggle
  - [ ] Persist sidebar state in localStorage

---

### 🔌 Phase 5: tRPC Agent Endpoints (3-4 hours)

- [ ] **5.1** Create Agent Router (`src/server/api/routers/agent.ts`)
  - [ ] Import Mastra instance
  - [ ] Setup protected procedures (require auth)

- [ ] **5.2** `agent.sendMessage` mutation
  - [ ] Input: { sheetId, message, threadId? }
  - [ ] Load sheet context using Sheet Reader tool
  - [ ] Call mastra agent with message + context
  - [ ] Stream response (use tRPC subscription if needed)
  - [ ] Return: { response, threadId, previewId? }

- [ ] **5.3** `agent.confirmPreview` mutation
  - [ ] Input: { previewId, modifications? }
  - [ ] Load preview from database
  - [ ] Execute preview action (call appropriate tool in 'execute' mode)
  - [ ] Update preview status to 'completed'
  - [ ] Return: { success, rowsCreated?, columnsAdded? }

- [ ] **5.4** `agent.cancelPreview` mutation
  - [ ] Input: { previewId }
  - [ ] Update preview status to 'cancelled'
  - [ ] Return: { success }

- [ ] **5.5** `agent.getConversation` query
  - [ ] Input: { sheetId, threadId? }
  - [ ] Load conversation history from Mastra storage
  - [ ] Return: { messages, threadId }

- [ ] **5.6** Add agent router to root
  - [ ] Import in `src/server/api/root.ts`
  - [ ] Export as part of appRouter

---

### 📊 Phase 6: Bulk Row Creation Flow (4-5 hours)

- [ ] **6.1** Implement search query detection
  - [ ] Agent recognizes patterns: "find X", "search for Y", "top N Zs in location"
  - [ ] Extract: search intent, count, location, category

- [ ] **6.2** Multi-tool coordination
  - [ ] Agent decides: use Google Search or Google Maps?
  - [ ] For places: use Maps tool
  - [ ] For general: use Search tool
  - [ ] Combine results if needed

- [ ] **6.3** Preview generation
  - [ ] Agent calls Sheet Writer tool in 'preview' mode
  - [ ] Determines columns needed: e.g., Name, Address, Rating, Phone
  - [ ] Creates preview object with sample rows
  - [ ] Stores in agent_previews table
  - [ ] Returns preview to user in chat

- [ ] **6.4** Preview confirmation flow
  - [ ] User clicks "Confirm" in UI
  - [ ] Frontend calls `agent.confirmPreview`
  - [ ] Backend calls Sheet Writer tool in 'execute' mode
  - [ ] Creates cells for all rows (first column only)
  - [ ] Creates events for each row (eventType: 'user_cell_edit')
  - [ ] Existing background processor picks up events

- [ ] **6.5** Progressive filling integration
  - [ ] Events processed by existing SheetUpdater
  - [ ] OperatorController selects operators for remaining columns
  - [ ] Each row fills left-to-right as normal
  - [ ] Agent can monitor progress and report back

- [ ] **6.6** Column auto-creation
  - [ ] If columns don't exist, agent creates them first
  - [ ] Set appropriate dataType: 'text', 'url', 'number'
  - [ ] Optionally set operatorType if agent knows what's needed
  - [ ] Example: "Address" column → set operatorType to 'url_context' if URLs will be added

---

### 📁 Phase 7: CSV Upload & Processing (4-5 hours)

- [ ] **7.1** Add CSV upload to agent sidebar
  - [ ] Drag-and-drop zone in chat interface
  - [ ] File input button
  - [ ] Supported format: .csv (validate)
  - [ ] Max file size: 50MB (configurable)

- [ ] **7.2** CSV upload endpoint
  - [ ] `agent.uploadCSV` mutation
  - [ ] Input: { file: base64 or URL }
  - [ ] Validate file type and size
  - [ ] Parse CSV (use papaparse)
  - [ ] Return: { csvId, preview }

- [ ] **7.3** CSV analysis flow
  - [ ] Agent receives CSV upload notification
  - [ ] Calls CSV Analyzer tool
  - [ ] Gets: headers, row count, sample rows, suggested types
  - [ ] Presents to user: "Found 5 columns (Name, Address, City, State, Zip) and 1,234 rows. Create sheet?"

- [ ] **7.4** CSV import preview
  - [ ] Agent creates preview with:
    - Columns to create
    - Sample rows to show
    - Estimated processing time
  - [ ] User can modify: rename columns, exclude columns, change types

- [ ] **7.5** CSV import execution
  - [ ] Create new sheet or use existing
  - [ ] Create columns from headers
  - [ ] Batch insert rows (100 at a time)
  - [ ] Show progress: "Importing row 500/1,234..."
  - [ ] Create events for operator processing (optional: user choice)

- [ ] **7.6** Large file handling
  - [ ] For files > 10,000 rows: warn about context limits
  - [ ] Process in chunks: insert rows, skip event creation
  - [ ] Option: "Import first 1,000 rows with AI processing, rest as raw data"
  - [ ] Background job for very large imports

---

### ⚙️ Phase 8: Dynamic Sheet Modification (3-4 hours)

- [ ] **8.1** Column addition mid-conversation
  - [ ] Agent detects: "I need a Phone Number column"
  - [ ] Calls Column Manager tool: add column
  - [ ] Updates UI immediately (revalidate columns query)
  - [ ] Announces: "Added 'Phone Number' column at position 4"

- [ ] **8.2** Column removal
  - [ ] Agent asks: "This column appears empty, should I remove it?"
  - [ ] User confirms
  - [ ] Agent calls Column Manager: remove column
  - [ ] Deletes cells in that column (cascade)
  - [ ] Reorders remaining columns

- [ ] **8.3** Column reordering
  - [ ] Agent suggests: "Move 'Address' column before 'City'?"
  - [ ] User confirms
  - [ ] Agent calls Column Manager: reorder
  - [ ] Updates positions in database
  - [ ] UI refreshes with new order

- [ ] **8.4** Operator configuration
  - [ ] Agent detects data pattern: "This column has URLs"
  - [ ] Suggests: "Should I enable URL enrichment for this column?"
  - [ ] User confirms
  - [ ] Agent updates templateColumns.operatorType = 'url_context'
  - [ ] Next rows will use URL operator automatically

- [ ] **8.5** Prompt customization
  - [ ] Agent asks: "What should I look for when processing this column?"
  - [ ] User: "Extract the business phone number"
  - [ ] Agent updates templateColumns.prompt
  - [ ] OperatorController uses custom prompt in context

---

### 🔗 Phase 9: Integration & Polish (4-5 hours)

- [ ] **9.1** End-to-end testing
  - [ ] Test: "find top 20 pizzas in SF" → preview → confirm → rows created → operators fill
  - [ ] Test: Upload CSV → analyze → preview → import → success
  - [ ] Test: "add Phone column" → column created → appears in UI
  - [ ] Test: "reorder columns" → positions updated → UI reflects
  - [ ] Test: Error handling (API fails, invalid query, etc.)

- [ ] **9.2** Error handling improvements
  - [ ] Graceful degradation when Gemini API fails
  - [ ] Retry logic for transient errors
  - [ ] Clear error messages in chat
  - [ ] Fallback: "I couldn't complete that, but you can try manually"

- [ ] **9.3** Loading states and animations
  - [ ] Typing indicator while agent thinks
  - [ ] Progress bar for CSV import
  - [ ] Skeleton loaders for preview cards
  - [ ] Success/error toast notifications
  - [ ] Smooth transitions for sidebar

- [ ] **9.4** Mobile responsive design
  - [ ] Sidebar becomes bottom sheet on mobile
  - [ ] Touch-friendly chat interface
  - [ ] Swipe to dismiss previews
  - [ ] Optimized for small screens

- [ ] **9.5** Keyboard shortcuts
  - [ ] Cmd/Ctrl + K: Toggle sidebar
  - [ ] Cmd/Ctrl + Enter: Send message
  - [ ] Esc: Close sidebar
  - [ ] Tab: Navigate between chat and config panel

- [ ] **9.6** Documentation
  - [ ] User guide: How to use the agent
  - [ ] Developer docs: How to add new tools
  - [ ] Examples: Common queries
  - [ ] Troubleshooting: Common issues

- [ ] **9.7** Performance optimization
  - [ ] Debounce chat input
  - [ ] Cache agent responses (for repeated queries)
  - [ ] Lazy load sidebar components
  - [ ] Optimize database queries (indexes on agent_previews, agent_conversations)

---

## 🗄️ Database Migrations

- [ ] **Migration 1**: Create `agent_conversations` table
  ```sql
  CREATE TABLE agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    sheet_id UUID REFERENCES sheets(id) ON DELETE CASCADE,
    thread_id VARCHAR(255) NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX idx_agent_conversations_user ON agent_conversations(user_id);
  CREATE INDEX idx_agent_conversations_sheet ON agent_conversations(sheet_id);
  ```

- [ ] **Migration 2**: Create `agent_previews` table
  ```sql
  CREATE TABLE agent_previews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    sheet_id UUID NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    preview_type VARCHAR(50) NOT NULL,
    preview_data JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    executed_at TIMESTAMP
  );
  CREATE INDEX idx_agent_previews_sheet ON agent_previews(sheet_id);
  CREATE INDEX idx_agent_previews_status ON agent_previews(status);
  ```

---

## 📦 Dependencies to Install

```json
{
  "@mastra/core": "^0.24.0",
  "@mastra/memory": "^0.15.11",
  "@mastra/pg": "^0.17.8",
  "@mastra/loggers": "^0.10.19",
  "@ai-sdk/google-vertex": "^1.0.0"
}
```

## 🔐 Required Environment Variables

```bash
# Google Vertex AI
GOOGLE_VERTEX_PROJECT="your-gcp-project-id"
GOOGLE_VERTEX_LOCATION="us-central1"

# Google Cloud Application Default Credentials (JSON)
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"account":"","client_id":"...","client_secret":"...","refresh_token":"...","type":"authorized_user","universe_domain":"googleapis.com"}'

# OR use service account key file
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
```

---

## 🎯 Success Criteria

- [ ] User can chat with agent in right sidebar
- [ ] User can query: "find top 20 pizzas in SF" and get preview
- [ ] User can confirm preview and see 20 rows created
- [ ] Existing operators automatically fill remaining columns
- [ ] User can upload CSV and import with preview
- [ ] Agent can add/remove/reorder columns dynamically
- [ ] Agent can configure operators for columns
- [ ] Column config panel shows current settings
- [ ] Mobile responsive design works
- [ ] All error cases handled gracefully
- [ ] Good vibes maintained throughout! 🏄‍♂️✨

---

## 🚀 Stretch Goals (Future Enhancements)

- [ ] Voice input for agent chat (use Gemini Live)
- [ ] Multi-sheet operations ("compare data across my 3 sheets")
- [ ] Template creation via conversation ("save this as a template")
- [ ] Scheduled queries ("search for new results daily")
- [ ] Collaborative agent (multiple users chatting with same agent)
- [ ] Export agent conversations as documentation
- [ ] Agent learns from user preferences over time

---

**Total Estimated Time**: 30-37 hours
**Good Vibes**: ∞
