CREATE TABLE "websurfing_cell_processing_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sheetId" uuid NOT NULL,
	"userId" varchar(255) NOT NULL,
	"rowIndex" integer NOT NULL,
	"colIndex" integer NOT NULL,
	"status" varchar(20) DEFAULT 'idle' NOT NULL,
	"operatorName" varchar(100),
	"statusMessage" varchar(255),
	"updatedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "websurfing_clarification_prompt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sessionId" uuid NOT NULL,
	"question" text NOT NULL,
	"context" jsonb,
	"options" jsonb,
	"userResponse" text,
	"responseType" varchar(50),
	"isRequired" boolean DEFAULT true,
	"createdAt" timestamp with time zone DEFAULT now(),
	"answeredAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "websurfing_column" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sheetId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"position" integer NOT NULL,
	"dataType" varchar(50) DEFAULT 'text',
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now(),
	CONSTRAINT "column_unique_position" UNIQUE("sheetId","position")
);
--> statement-breakpoint
CREATE TABLE "websurfing_sheet_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sheetId" uuid NOT NULL,
	"userId" varchar(255) NOT NULL,
	"rowIndex" integer NOT NULL,
	"colIndex" integer NOT NULL,
	"content" text,
	"updateType" varchar(50) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now(),
	"appliedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "websurfing_sheet" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"name" varchar(255) DEFAULT 'Untitled Sheet' NOT NULL,
	"templateType" varchar(50),
	"templateId" uuid,
	"isAutonomous" boolean DEFAULT false,
	"webhookUrl" varchar(500),
	"webhookEvents" jsonb,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "websurfing_template_column" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"templateId" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"position" integer NOT NULL,
	"operatorType" varchar(50) NOT NULL,
	"operatorConfig" jsonb,
	"prompt" text,
	"dataType" varchar(50) DEFAULT 'text',
	"dependencies" jsonb,
	"validationRules" jsonb,
	"isRequired" boolean DEFAULT false,
	"defaultValue" text,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now(),
	CONSTRAINT "template_column_unique_position" UNIQUE("templateId","position")
);
--> statement-breakpoint
CREATE TABLE "websurfing_template" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"icon" varchar(100),
	"isPublic" boolean DEFAULT false,
	"isAutonomous" boolean DEFAULT false,
	"systemPrompt" text,
	"config" jsonb,
	"usageCount" integer DEFAULT 0,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "websurfing_transformer_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eventId" uuid NOT NULL,
	"userId" varchar(255) NOT NULL,
	"state" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"currentStep" integer DEFAULT 0,
	"totalSteps" integer,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now(),
	"completedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "cell_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD COLUMN "sheetId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD COLUMN "sheetId" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD COLUMN "userId" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD COLUMN "retryCount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD COLUMN "lastError" text;--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" ADD CONSTRAINT "websurfing_cell_processing_status_sheetId_websurfing_sheet_id_fk" FOREIGN KEY ("sheetId") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" ADD CONSTRAINT "websurfing_cell_processing_status_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" ADD CONSTRAINT "websurfing_clarification_prompt_sessionId_websurfing_transformer_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."websurfing_transformer_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD CONSTRAINT "websurfing_column_sheetId_websurfing_sheet_id_fk" FOREIGN KEY ("sheetId") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" ADD CONSTRAINT "websurfing_sheet_updates_sheetId_websurfing_sheet_id_fk" FOREIGN KEY ("sheetId") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" ADD CONSTRAINT "websurfing_sheet_updates_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet" ADD CONSTRAINT "websurfing_sheet_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet" ADD CONSTRAINT "websurfing_sheet_templateId_websurfing_template_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."websurfing_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_template_column" ADD CONSTRAINT "websurfing_template_column_templateId_websurfing_template_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."websurfing_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_template" ADD CONSTRAINT "websurfing_template_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" ADD CONSTRAINT "websurfing_transformer_session_eventId_websurfing_event_queue_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."websurfing_event_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" ADD CONSTRAINT "websurfing_transformer_session_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cell_status_sheet_idx" ON "websurfing_cell_processing_status" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "cell_status_position_idx" ON "websurfing_cell_processing_status" USING btree ("sheetId","rowIndex","colIndex");--> statement-breakpoint
CREATE INDEX "cell_status_updated_idx" ON "websurfing_cell_processing_status" USING btree ("updatedAt");--> statement-breakpoint
CREATE INDEX "clarification_prompt_session_idx" ON "websurfing_clarification_prompt" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "clarification_prompt_created_idx" ON "websurfing_clarification_prompt" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "column_sheet_idx" ON "websurfing_column" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "column_position_idx" ON "websurfing_column" USING btree ("sheetId","position");--> statement-breakpoint
CREATE INDEX "sheet_updates_sheet_idx" ON "websurfing_sheet_updates" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "sheet_updates_user_idx" ON "websurfing_sheet_updates" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sheet_updates_created_idx" ON "websurfing_sheet_updates" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "sheet_updates_applied_idx" ON "websurfing_sheet_updates" USING btree ("appliedAt");--> statement-breakpoint
CREATE INDEX "sheet_updates_position_idx" ON "websurfing_sheet_updates" USING btree ("rowIndex","colIndex");--> statement-breakpoint
CREATE INDEX "sheet_user_idx" ON "websurfing_sheet" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sheet_template_idx" ON "websurfing_sheet" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX "template_column_template_idx" ON "websurfing_template_column" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX "template_column_position_idx" ON "websurfing_template_column" USING btree ("templateId","position");--> statement-breakpoint
CREATE INDEX "template_user_idx" ON "websurfing_template" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "template_public_idx" ON "websurfing_template" USING btree ("isPublic");--> statement-breakpoint
CREATE INDEX "template_created_idx" ON "websurfing_template" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "transformer_session_event_idx" ON "websurfing_transformer_session" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "transformer_session_user_idx" ON "websurfing_transformer_session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "transformer_session_status_idx" ON "websurfing_transformer_session" USING btree ("status");--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "websurfing_cell_sheetId_websurfing_sheet_id_fk" FOREIGN KEY ("sheetId") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "websurfing_cell_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD CONSTRAINT "websurfing_event_queue_sheetId_websurfing_sheet_id_fk" FOREIGN KEY ("sheetId") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD CONSTRAINT "websurfing_event_queue_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cell_sheet_idx" ON "websurfing_cell" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "cell_user_idx" ON "websurfing_cell" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "event_queue_sheet_idx" ON "websurfing_event_queue" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "event_queue_user_idx" ON "websurfing_event_queue" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "cell_unique_position" UNIQUE("sheetId","userId","rowIndex","colIndex");