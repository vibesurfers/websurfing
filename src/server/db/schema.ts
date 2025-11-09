import { relations } from "drizzle-orm";
import { index, pgTableCreator, primaryKey, unique } from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `websurfing_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ]
);

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d
    .timestamp({
      mode: "date",
      withTimezone: true,
    })
    .$defaultFn(() => /* @__PURE__ */ new Date()),
  image: d.varchar({ length: 255 }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("t_user_id_idx").on(t.userId)]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

export const sheets = createTable(
  "sheet",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    name: d.varchar({ length: 255 }).notNull().default('Untitled Sheet'),
    templateType: d.varchar({ length: 50 }),
    templateId: d.uuid().references(() => templates.id),
    isAutonomous: d.boolean().default(false),
    webhookUrl: d.varchar({ length: 500 }),
    webhookEvents: d.jsonb(), // Array of event types: ['row_complete', 'sheet_complete', 'error']
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("sheet_user_idx").on(t.userId),
    index("sheet_template_idx").on(t.templateId),
  ]
);

export const cells = createTable(
  "cell",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    sheetId: d.uuid().notNull().references(() => sheets.id, { onDelete: 'cascade' }),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    rowIndex: d.integer().notNull(),
    colIndex: d.integer().notNull(),
    content: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("cell_sheet_idx").on(t.sheetId),
    index("cell_position_idx").on(t.rowIndex, t.colIndex),
    index("cell_user_idx").on(t.userId),
    unique("cell_unique_position").on(t.sheetId, t.userId, t.rowIndex, t.colIndex),
  ]
);

export const eventQueue = createTable(
  "event_queue",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    sheetId: d.uuid().notNull().references(() => sheets.id, { onDelete: 'cascade' }),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    eventType: d.varchar({ length: 100 }).notNull(),
    payload: d.jsonb().notNull(),
    status: d.varchar({ length: 20 }).default('pending'), // 'pending', 'processing', 'completed', 'failed', 'awaiting_clarification'
    retryCount: d.integer().default(0),
    lastError: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    processedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("event_queue_sheet_idx").on(t.sheetId),
    index("event_queue_status_idx").on(t.status),
    index("event_queue_created_idx").on(t.createdAt),
    index("event_queue_user_idx").on(t.userId),
  ]
);

export const sheetUpdates = createTable(
  "sheet_updates",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    sheetId: d.uuid().notNull().references(() => sheets.id, { onDelete: 'cascade' }),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    rowIndex: d.integer().notNull(),
    colIndex: d.integer().notNull(),
    content: d.text(),
    updateType: d.varchar({ length: 50 }).notNull(), // 'user_edit', 'ai_response', 'auto_copy'
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    appliedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("sheet_updates_sheet_idx").on(t.sheetId),
    index("sheet_updates_user_idx").on(t.userId),
    index("sheet_updates_created_idx").on(t.createdAt),
    index("sheet_updates_applied_idx").on(t.appliedAt),
    index("sheet_updates_position_idx").on(t.rowIndex, t.colIndex),
  ]
);

export const geminiUsageLog = createTable(
  "gemini_usage_log",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d
      .varchar({ length: 255 })
      .references(() => users.id),
    operatorName: d.varchar({ length: 100 }).notNull(), // e.g., 'google_search', 'url_context'
    model: d.varchar({ length: 100 }).notNull(), // e.g., 'gemini-2.5-flash'
    promptTokens: d.integer().notNull().default(0),
    outputTokens: d.integer().notNull().default(0),
    totalTokens: d.integer().notNull().default(0),
    estimatedCost: d.numeric({ precision: 10, scale: 6 }).notNull().default("0"), // USD
    eventId: d.uuid(), // Reference to event_queue if applicable
    requestData: d.jsonb(), // Store request details for debugging
    responseData: d.jsonb(), // Store response metadata
    status: d.varchar({ length: 20 }).notNull().default('success'), // 'success', 'error'
    errorMessage: d.text(),
    durationMs: d.integer(), // Request duration in milliseconds
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
  }),
  (t) => [
    index("gemini_usage_user_idx").on(t.userId),
    index("gemini_usage_operator_idx").on(t.operatorName),
    index("gemini_usage_created_idx").on(t.createdAt),
    index("gemini_usage_event_idx").on(t.eventId),
  ]
);

export const cellProcessingStatus = createTable(
  "cell_processing_status",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    sheetId: d.uuid().notNull().references(() => sheets.id, { onDelete: 'cascade' }),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    rowIndex: d.integer().notNull(),
    colIndex: d.integer().notNull(),
    status: d.varchar({ length: 20 }).notNull().default('idle'), // 'idle', 'processing', 'completed', 'error'
    operatorName: d.varchar({ length: 100 }), // 'google_search', 'url_context', etc.
    statusMessage: d.varchar({ length: 255 }), // "Searching Google...", "Analyzing URL..."
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("cell_status_sheet_idx").on(t.sheetId),
    index("cell_status_position_idx").on(t.sheetId, t.rowIndex, t.colIndex),
    index("cell_status_updated_idx").on(t.updatedAt),
  ]
);

export const geminiUsageLogRelations = relations(geminiUsageLog, ({ one }) => ({
  user: one(users, { fields: [geminiUsageLog.userId], references: [users.id] }),
}));

export const columns = createTable(
  "column",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    sheetId: d.uuid().notNull().references(() => sheets.id, { onDelete: 'cascade' }),
    title: d.varchar({ length: 255 }).notNull(),
    position: d.integer().notNull(),
    dataType: d.varchar({ length: 50 }).default('text'),
    // Operator configuration (per-sheet customization)
    operatorType: d.varchar({ length: 50 }), // 'google_search', 'url_context', 'structured_output', 'function_calling'
    operatorConfig: d.jsonb(), // Operator-specific settings
    prompt: d.text(), // Custom prompt for this column's operator
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("column_sheet_idx").on(t.sheetId),
    index("column_position_idx").on(t.sheetId, t.position),
    unique("column_unique_position").on(t.sheetId, t.position),
  ]
);

// Templates for reusable workflow configurations
export const templates = createTable(
  "template",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    name: d.varchar({ length: 255 }).notNull(),
    description: d.text(),
    icon: d.varchar({ length: 100 }), // emoji or icon name
    isPublic: d.boolean().default(false),
    isAutonomous: d.boolean().default(false),
    systemPrompt: d.text(), // Overall guidance for the template
    config: d.jsonb(), // Additional configuration (validation rules, etc.)
    usageCount: d.integer().default(0),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("template_user_idx").on(t.userId),
    index("template_public_idx").on(t.isPublic),
    index("template_created_idx").on(t.createdAt),
  ]
);

export const templatesRelations = relations(templates, ({ one, many }) => ({
  user: one(users, { fields: [templates.userId], references: [users.id] }),
  columns: many(templateColumns),
  sheets: many(sheets),
}));

// Template columns define the structure and behavior of each column
export const templateColumns = createTable(
  "template_column",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    templateId: d.uuid().notNull().references(() => templates.id, { onDelete: 'cascade' }),
    title: d.varchar({ length: 255 }).notNull(),
    position: d.integer().notNull(),
    operatorType: d.varchar({ length: 50 }).notNull(), // 'google_search', 'url_context', 'structured_output', 'function_calling'
    operatorConfig: d.jsonb(), // Operator-specific settings
    prompt: d.text(), // Instructions for AI on how to fill this column
    dataType: d.varchar({ length: 50 }).default('text'), // 'text', 'url', 'email', 'number', 'json'
    dependencies: d.jsonb(), // Array of column positions this depends on
    validationRules: d.jsonb(), // JSON schema for validation
    isRequired: d.boolean().default(false),
    defaultValue: d.text(),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("template_column_template_idx").on(t.templateId),
    index("template_column_position_idx").on(t.templateId, t.position),
    unique("template_column_unique_position").on(t.templateId, t.position),
  ]
);

export const templateColumnsRelations = relations(templateColumns, ({ one }) => ({
  template: one(templates, { fields: [templateColumns.templateId], references: [templates.id] }),
}));

// Transformer sessions for multi-step operations requiring user input
export const transformerSessions = createTable(
  "transformer_session",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    eventId: d.uuid().notNull().references(() => eventQueue.id, { onDelete: 'cascade' }),
    userId: d.varchar({ length: 255 }).notNull().references(() => users.id),
    state: d.jsonb().notNull(), // Current state of the multi-step operation
    status: d.varchar({ length: 20 }).default('active'), // 'active', 'awaiting_input', 'completed', 'cancelled'
    currentStep: d.integer().default(0),
    totalSteps: d.integer(),
    metadata: d.jsonb(), // Additional context
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp({ withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
    completedAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("transformer_session_event_idx").on(t.eventId),
    index("transformer_session_user_idx").on(t.userId),
    index("transformer_session_status_idx").on(t.status),
  ]
);

export const transformerSessionsRelations = relations(transformerSessions, ({ one, many }) => ({
  event: one(eventQueue, { fields: [transformerSessions.eventId], references: [eventQueue.id] }),
  user: one(users, { fields: [transformerSessions.userId], references: [users.id] }),
  prompts: many(clarificationPrompts),
}));

// Clarification prompts for AI to ask user questions during processing
export const clarificationPrompts = createTable(
  "clarification_prompt",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    sessionId: d.uuid().notNull().references(() => transformerSessions.id, { onDelete: 'cascade' }),
    question: d.text().notNull(),
    context: d.jsonb(), // Additional context for the question (what cell, current data, etc.)
    options: d.jsonb(), // Array of suggested options if multiple choice
    userResponse: d.text(),
    responseType: d.varchar({ length: 50 }), // 'text', 'choice', 'boolean'
    isRequired: d.boolean().default(true),
    createdAt: d.timestamp({ withTimezone: true }).defaultNow(),
    answeredAt: d.timestamp({ withTimezone: true }),
  }),
  (t) => [
    index("clarification_prompt_session_idx").on(t.sessionId),
    index("clarification_prompt_created_idx").on(t.createdAt),
  ]
);

export const clarificationPromptsRelations = relations(clarificationPrompts, ({ one }) => ({
  session: one(transformerSessions, { fields: [clarificationPrompts.sessionId], references: [transformerSessions.id] }),
}));

// Add relations to existing sheets table
export const sheetsRelations = relations(sheets, ({ one, many }) => ({
  user: one(users, { fields: [sheets.userId], references: [users.id] }),
  template: one(templates, { fields: [sheets.templateId], references: [templates.id] }),
  cells: many(cells),
  columns: many(columns),
  events: many(eventQueue),
}));
