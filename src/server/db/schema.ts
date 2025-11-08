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

export const cells = createTable(
  "cell",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.varchar("userid", { length: 255 }).notNull().references(() => users.id),
    rowIndex: d.integer("rowIndex").notNull(),
    colIndex: d.integer("colIndex").notNull(),
    content: d.text(),
    createdAt: d.timestamp("createdAt", { withTimezone: true }).defaultNow(),
    updatedAt: d.timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
  }),
  (t) => [
    index("cell_position_idx").on(t.rowIndex, t.colIndex),
    index("cell_user_idx").on(t.userId),
    unique("cell_unique_position").on(t.userId, t.rowIndex, t.colIndex),
  ]
);

export const eventQueue = createTable(
  "event_queue",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.varchar("userid", { length: 255 }).notNull().references(() => users.id),
    eventType: d.varchar("eventType", { length: 100 }).notNull(),
    payload: d.jsonb().notNull(),
    status: d.varchar({ length: 20 }).default('pending'),
    createdAt: d.timestamp("createdAt", { withTimezone: true }).defaultNow(),
    processedAt: d.timestamp("processedAt", { withTimezone: true }),
  }),
  (t) => [
    index("event_queue_status_idx").on(t.status),
    index("event_queue_created_idx").on(t.createdAt),
    index("event_queue_user_idx").on(t.userId),
  ]
);

export const sheetUpdates = createTable(
  "sheet_updates",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    userId: d.varchar("userid", { length: 255 }).notNull().references(() => users.id),
    rowIndex: d.integer("rowindex").notNull(),
    colIndex: d.integer("colindex").notNull(),
    content: d.text(),
    updateType: d.varchar("updatetype", { length: 50 }).notNull(), // 'user_edit', 'ai_response', 'auto_copy'
    createdAt: d.timestamp("createdat", { withTimezone: true }).defaultNow(),
    appliedAt: d.timestamp("appliedat", { withTimezone: true }),
  }),
  (t) => [
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

export const geminiUsageLogRelations = relations(geminiUsageLog, ({ one }) => ({
  user: one(users, { fields: [geminiUsageLog.userId], references: [users.id] }),
}));
