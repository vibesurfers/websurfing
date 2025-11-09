ALTER TABLE "websurfing_account" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_account" RENAME COLUMN "providerAccountId" TO "provider_account_id";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "sheetid" TO "sheet_id";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "userid" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "rowindex" TO "row_index";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "colindex" TO "col_index";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "operatorname" TO "operator_name";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "statusmessage" TO "status_message";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "updatedat" TO "updated_at";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "sheetid" TO "sheet_id";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "userid" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "rowindex" TO "row_index";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "colindex" TO "col_index";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "createdat" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "updatedat" TO "updated_at";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "sessionid" TO "session_id";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "userresponse" TO "user_response";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "responsetype" TO "response_type";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "isrequired" TO "is_required";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "createdat" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "answeredat" TO "answered_at";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "sheetid" TO "sheet_id";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "datatype" TO "data_type";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "createdat" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "updatedat" TO "updated_at";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "sheetid" TO "sheet_id";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "userid" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "eventtype" TO "event_type";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "retrycount" TO "retry_count";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "lasterror" TO "last_error";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "createdat" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "processedat" TO "processed_at";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "operatorName" TO "operator_name";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "promptTokens" TO "prompt_tokens";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "outputTokens" TO "output_tokens";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "totalTokens" TO "total_tokens";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "estimatedCost" TO "estimated_cost";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "eventId" TO "event_id";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "requestData" TO "request_data";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "responseData" TO "response_data";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "errorMessage" TO "error_message";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "durationMs" TO "duration_ms";--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_post" RENAME COLUMN "createdById" TO "created_by_id";--> statement-breakpoint
ALTER TABLE "websurfing_post" RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_post" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "websurfing_session" RENAME COLUMN "sessionToken" TO "session_token";--> statement-breakpoint
ALTER TABLE "websurfing_session" RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "sheetid" TO "sheet_id";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "userid" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "rowindex" TO "row_index";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "colindex" TO "col_index";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "updatetype" TO "update_type";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "createdat" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "appliedat" TO "applied_at";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "userid" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "templatetype" TO "template_type";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "templateId" TO "template_id";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "isautonomous" TO "is_autonomous";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "webhookUrl" TO "webhook_url";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "webhookEvents" TO "webhook_events";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "createdat" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "updatedat" TO "updated_at";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "templateid" TO "template_id";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "operatortype" TO "operator_type";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "operatorconfig" TO "operator_config";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "datatype" TO "data_type";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "validationrules" TO "validation_rules";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "isrequired" TO "is_required";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "defaultvalue" TO "default_value";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "createdat" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "updatedat" TO "updated_at";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "userid" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "ispublic" TO "is_public";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "isautonomous" TO "is_autonomous";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "systemprompt" TO "system_prompt";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "usagecount" TO "usage_count";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "createdat" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "updatedat" TO "updated_at";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "eventid" TO "event_id";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "userid" TO "user_id";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "currentstep" TO "current_step";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "totalsteps" TO "total_steps";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "createdat" TO "created_at";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "updatedat" TO "updated_at";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "completedat" TO "completed_at";--> statement-breakpoint
ALTER TABLE "websurfing_user" RENAME COLUMN "emailVerified" TO "email_verified";--> statement-breakpoint
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "cell_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_column" DROP CONSTRAINT "column_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" DROP CONSTRAINT "template_column_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_account" DROP CONSTRAINT "websurfing_account_userId_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" DROP CONSTRAINT "websurfing_cell_processing_status_sheetid_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" DROP CONSTRAINT "websurfing_cell_processing_status_userid_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "websurfing_cell_sheetid_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "websurfing_cell_userid_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" DROP CONSTRAINT "websurfing_clarification_prompt_sessionid_websurfing_transformer_session_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_column" DROP CONSTRAINT "websurfing_column_sheetid_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" DROP CONSTRAINT "websurfing_event_queue_sheetid_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" DROP CONSTRAINT "websurfing_event_queue_userid_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" DROP CONSTRAINT "websurfing_gemini_usage_log_userId_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_post" DROP CONSTRAINT "websurfing_post_createdById_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_session" DROP CONSTRAINT "websurfing_session_userId_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" DROP CONSTRAINT "websurfing_sheet_updates_sheetid_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" DROP CONSTRAINT "websurfing_sheet_updates_userid_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_sheet" DROP CONSTRAINT "websurfing_sheet_userid_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_sheet" DROP CONSTRAINT "websurfing_sheet_templateId_websurfing_template_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_template_column" DROP CONSTRAINT "websurfing_template_column_templateid_websurfing_template_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_template" DROP CONSTRAINT "websurfing_template_userid_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" DROP CONSTRAINT "websurfing_transformer_session_eventid_websurfing_event_queue_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" DROP CONSTRAINT "websurfing_transformer_session_userid_websurfing_user_id_fk";
--> statement-breakpoint
DROP INDEX "account_user_id_idx";--> statement-breakpoint
DROP INDEX "cell_status_sheet_idx";--> statement-breakpoint
DROP INDEX "cell_status_position_idx";--> statement-breakpoint
DROP INDEX "cell_status_updated_idx";--> statement-breakpoint
DROP INDEX "cell_sheet_idx";--> statement-breakpoint
DROP INDEX "cell_position_idx";--> statement-breakpoint
DROP INDEX "cell_user_idx";--> statement-breakpoint
DROP INDEX "clarification_prompt_session_idx";--> statement-breakpoint
DROP INDEX "clarification_prompt_created_idx";--> statement-breakpoint
DROP INDEX "column_sheet_idx";--> statement-breakpoint
DROP INDEX "column_position_idx";--> statement-breakpoint
DROP INDEX "event_queue_sheet_idx";--> statement-breakpoint
DROP INDEX "event_queue_created_idx";--> statement-breakpoint
DROP INDEX "event_queue_user_idx";--> statement-breakpoint
DROP INDEX "gemini_usage_user_idx";--> statement-breakpoint
DROP INDEX "gemini_usage_operator_idx";--> statement-breakpoint
DROP INDEX "gemini_usage_created_idx";--> statement-breakpoint
DROP INDEX "gemini_usage_event_idx";--> statement-breakpoint
DROP INDEX "created_by_idx";--> statement-breakpoint
DROP INDEX "t_user_id_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_sheet_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_user_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_created_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_applied_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_position_idx";--> statement-breakpoint
DROP INDEX "sheet_user_idx";--> statement-breakpoint
DROP INDEX "sheet_template_idx";--> statement-breakpoint
DROP INDEX "template_column_template_idx";--> statement-breakpoint
DROP INDEX "template_column_position_idx";--> statement-breakpoint
DROP INDEX "template_user_idx";--> statement-breakpoint
DROP INDEX "template_public_idx";--> statement-breakpoint
DROP INDEX "template_created_idx";--> statement-breakpoint
DROP INDEX "transformer_session_event_idx";--> statement-breakpoint
DROP INDEX "transformer_session_user_idx";--> statement-breakpoint
ALTER TABLE "websurfing_account" DROP CONSTRAINT "websurfing_account_provider_providerAccountId_pk";--> statement-breakpoint
ALTER TABLE "websurfing_account" ADD CONSTRAINT "websurfing_account_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id");--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD COLUMN "operator_type" varchar(50);--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD COLUMN "operator_config" jsonb;--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD COLUMN "prompt" text;--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD COLUMN "dependencies" jsonb;--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD COLUMN "validation_rules" jsonb;--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD COLUMN "is_required" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD COLUMN "default_value" text;--> statement-breakpoint
ALTER TABLE "websurfing_user" ADD COLUMN "api_key" varchar(64);--> statement-breakpoint
ALTER TABLE "websurfing_user" ADD COLUMN "api_key_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "websurfing_account" ADD CONSTRAINT "websurfing_account_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" ADD CONSTRAINT "websurfing_cell_processing_status_sheet_id_websurfing_sheet_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" ADD CONSTRAINT "websurfing_cell_processing_status_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "websurfing_cell_sheet_id_websurfing_sheet_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "websurfing_cell_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" ADD CONSTRAINT "websurfing_clarification_prompt_session_id_websurfing_transformer_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."websurfing_transformer_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD CONSTRAINT "websurfing_column_sheet_id_websurfing_sheet_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD CONSTRAINT "websurfing_event_queue_sheet_id_websurfing_sheet_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD CONSTRAINT "websurfing_event_queue_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_gemini_usage_log" ADD CONSTRAINT "websurfing_gemini_usage_log_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_post" ADD CONSTRAINT "websurfing_post_created_by_id_websurfing_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_session" ADD CONSTRAINT "websurfing_session_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" ADD CONSTRAINT "websurfing_sheet_updates_sheet_id_websurfing_sheet_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" ADD CONSTRAINT "websurfing_sheet_updates_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet" ADD CONSTRAINT "websurfing_sheet_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet" ADD CONSTRAINT "websurfing_sheet_template_id_websurfing_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."websurfing_template"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_template_column" ADD CONSTRAINT "websurfing_template_column_template_id_websurfing_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."websurfing_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_template" ADD CONSTRAINT "websurfing_template_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" ADD CONSTRAINT "websurfing_transformer_session_event_id_websurfing_event_queue_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."websurfing_event_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" ADD CONSTRAINT "websurfing_transformer_session_user_id_websurfing_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "websurfing_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cell_status_sheet_idx" ON "websurfing_cell_processing_status" USING btree ("sheet_id");--> statement-breakpoint
CREATE INDEX "cell_status_position_idx" ON "websurfing_cell_processing_status" USING btree ("sheet_id","row_index","col_index");--> statement-breakpoint
CREATE INDEX "cell_status_updated_idx" ON "websurfing_cell_processing_status" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "cell_sheet_idx" ON "websurfing_cell" USING btree ("sheet_id");--> statement-breakpoint
CREATE INDEX "cell_position_idx" ON "websurfing_cell" USING btree ("row_index","col_index");--> statement-breakpoint
CREATE INDEX "cell_user_idx" ON "websurfing_cell" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clarification_prompt_session_idx" ON "websurfing_clarification_prompt" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "clarification_prompt_created_idx" ON "websurfing_clarification_prompt" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "column_sheet_idx" ON "websurfing_column" USING btree ("sheet_id");--> statement-breakpoint
CREATE INDEX "column_position_idx" ON "websurfing_column" USING btree ("sheet_id","position");--> statement-breakpoint
CREATE INDEX "event_queue_sheet_idx" ON "websurfing_event_queue" USING btree ("sheet_id");--> statement-breakpoint
CREATE INDEX "event_queue_created_idx" ON "websurfing_event_queue" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "event_queue_user_idx" ON "websurfing_event_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gemini_usage_user_idx" ON "websurfing_gemini_usage_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gemini_usage_operator_idx" ON "websurfing_gemini_usage_log" USING btree ("operator_name");--> statement-breakpoint
CREATE INDEX "gemini_usage_created_idx" ON "websurfing_gemini_usage_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "gemini_usage_event_idx" ON "websurfing_gemini_usage_log" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "created_by_idx" ON "websurfing_post" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "t_user_id_idx" ON "websurfing_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sheet_updates_sheet_idx" ON "websurfing_sheet_updates" USING btree ("sheet_id");--> statement-breakpoint
CREATE INDEX "sheet_updates_user_idx" ON "websurfing_sheet_updates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sheet_updates_created_idx" ON "websurfing_sheet_updates" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sheet_updates_applied_idx" ON "websurfing_sheet_updates" USING btree ("applied_at");--> statement-breakpoint
CREATE INDEX "sheet_updates_position_idx" ON "websurfing_sheet_updates" USING btree ("row_index","col_index");--> statement-breakpoint
CREATE INDEX "sheet_user_idx" ON "websurfing_sheet" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sheet_template_idx" ON "websurfing_sheet" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_column_template_idx" ON "websurfing_template_column" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_column_position_idx" ON "websurfing_template_column" USING btree ("template_id","position");--> statement-breakpoint
CREATE INDEX "template_user_idx" ON "websurfing_template" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "template_public_idx" ON "websurfing_template" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "template_created_idx" ON "websurfing_template" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "transformer_session_event_idx" ON "websurfing_transformer_session" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "transformer_session_user_idx" ON "websurfing_transformer_session" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "cell_unique_position" UNIQUE("sheet_id","user_id","row_index","col_index");--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD CONSTRAINT "column_unique_position" UNIQUE("sheet_id","position");--> statement-breakpoint
ALTER TABLE "websurfing_template_column" ADD CONSTRAINT "template_column_unique_position" UNIQUE("template_id","position");--> statement-breakpoint
ALTER TABLE "websurfing_user" ADD CONSTRAINT "websurfing_user_apiKey_unique" UNIQUE("api_key");