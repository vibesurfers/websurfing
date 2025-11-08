CREATE TABLE "websurfing_gemini_usage_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(255),
	"operatorName" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"promptTokens" integer DEFAULT 0 NOT NULL,
	"outputTokens" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"estimatedCost" numeric(10, 6) DEFAULT '0' NOT NULL,
	"eventId" uuid,
	"requestData" jsonb,
	"responseData" jsonb,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"errorMessage" text,
	"durationMs" integer,
	"createdAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" ADD CONSTRAINT "websurfing_gemini_usage_log_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gemini_usage_user_idx" ON "websurfing_gemini_usage_log" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "gemini_usage_operator_idx" ON "websurfing_gemini_usage_log" USING btree ("operatorName");--> statement-breakpoint
CREATE INDEX "gemini_usage_created_idx" ON "websurfing_gemini_usage_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "gemini_usage_event_idx" ON "websurfing_gemini_usage_log" USING btree ("eventId");