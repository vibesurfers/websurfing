-- Restore camelCase column names to match schema.ts
-- This reverses the lowercase changes from migrations 0003 and 0004

-- Drop existing constraints and indexes that reference old column names
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "cell_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_column" DROP CONSTRAINT "column_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" DROP CONSTRAINT "template_column_unique_position";--> statement-breakpoint

DROP INDEX IF EXISTS "cell_status_sheet_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "cell_status_position_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "cell_status_updated_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "cell_sheet_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "cell_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "cell_position_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "column_sheet_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "column_position_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "event_queue_sheet_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "event_queue_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "event_queue_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sheet_updates_sheet_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sheet_updates_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sheet_updates_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sheet_updates_applied_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sheet_updates_position_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "sheet_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "template_column_template_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "template_column_position_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "template_user_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "template_public_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "template_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "clarification_prompt_session_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "clarification_prompt_created_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "transformer_session_event_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "transformer_session_user_idx";--> statement-breakpoint

-- Rename columns back to camelCase
-- websurfing_cell_processing_status
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "sheetid" TO "sheetId";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "userid" TO "userId";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "rowindex" TO "rowIndex";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "colindex" TO "colIndex";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "operatorname" TO "operatorName";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "statusmessage" TO "statusMessage";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "updatedat" TO "updatedAt";--> statement-breakpoint

-- websurfing_cell
ALTER TABLE "websurfing_cell" RENAME COLUMN "sheetid" TO "sheetId";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "userid" TO "userId";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "rowindex" TO "rowIndex";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "colindex" TO "colIndex";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "createdat" TO "createdAt";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "updatedat" TO "updatedAt";--> statement-breakpoint

-- websurfing_column
ALTER TABLE "websurfing_column" RENAME COLUMN "sheetid" TO "sheetId";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "datatype" TO "dataType";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "createdat" TO "createdAt";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "updatedat" TO "updatedAt";--> statement-breakpoint

-- websurfing_event_queue
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "sheetid" TO "sheetId";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "userid" TO "userId";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "eventtype" TO "eventType";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "retrycount" TO "retryCount";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "lasterror" TO "lastError";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "createdat" TO "createdAt";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "processedat" TO "processedAt";--> statement-breakpoint

-- websurfing_sheet_updates
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "sheetid" TO "sheetId";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "userid" TO "userId";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "rowindex" TO "rowIndex";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "colindex" TO "colIndex";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "updatetype" TO "updateType";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "createdat" TO "createdAt";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "appliedat" TO "appliedAt";--> statement-breakpoint

-- websurfing_sheet
ALTER TABLE "websurfing_sheet" RENAME COLUMN "userid" TO "userId";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "templatetype" TO "templateType";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "isautonomous" TO "isAutonomous";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "createdat" TO "createdAt";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "updatedat" TO "updatedAt";--> statement-breakpoint

-- websurfing_template
ALTER TABLE "websurfing_template" RENAME COLUMN "userid" TO "userId";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "ispublic" TO "isPublic";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "isautonomous" TO "isAutonomous";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "systemprompt" TO "systemPrompt";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "usagecount" TO "usageCount";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "createdat" TO "createdAt";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "updatedat" TO "updatedAt";--> statement-breakpoint

-- websurfing_template_column
ALTER TABLE "websurfing_template_column" RENAME COLUMN "templateid" TO "templateId";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "operatortype" TO "operatorType";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "operatorconfig" TO "operatorConfig";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "datatype" TO "dataType";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "validationrules" TO "validationRules";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "isrequired" TO "isRequired";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "defaultvalue" TO "defaultValue";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "createdat" TO "createdAt";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "updatedat" TO "updatedAt";--> statement-breakpoint

-- websurfing_transformer_session
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "eventid" TO "eventId";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "userid" TO "userId";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "currentstep" TO "currentStep";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "totalsteps" TO "totalSteps";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "createdat" TO "createdAt";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "updatedat" TO "updatedAt";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "completedat" TO "completedAt";--> statement-breakpoint

-- websurfing_clarification_prompt
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "sessionid" TO "sessionId";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "userresponse" TO "userResponse";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "responsetype" TO "responseType";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "isrequired" TO "isRequired";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "createdat" TO "createdAt";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "answeredat" TO "answeredAt";--> statement-breakpoint

-- Recreate indexes with camelCase column names
CREATE INDEX "cell_status_sheet_idx" ON "websurfing_cell_processing_status" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "cell_status_position_idx" ON "websurfing_cell_processing_status" USING btree ("sheetId","rowIndex","colIndex");--> statement-breakpoint
CREATE INDEX "cell_status_updated_idx" ON "websurfing_cell_processing_status" USING btree ("updatedAt");--> statement-breakpoint
CREATE INDEX "cell_sheet_idx" ON "websurfing_cell" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "cell_user_idx" ON "websurfing_cell" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "cell_position_idx" ON "websurfing_cell" USING btree ("rowIndex","colIndex");--> statement-breakpoint
CREATE INDEX "column_sheet_idx" ON "websurfing_column" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "column_position_idx" ON "websurfing_column" USING btree ("sheetId","position");--> statement-breakpoint
CREATE INDEX "event_queue_sheet_idx" ON "websurfing_event_queue" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "event_queue_user_idx" ON "websurfing_event_queue" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "event_queue_created_idx" ON "websurfing_event_queue" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "sheet_updates_sheet_idx" ON "websurfing_sheet_updates" USING btree ("sheetId");--> statement-breakpoint
CREATE INDEX "sheet_updates_user_idx" ON "websurfing_sheet_updates" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sheet_updates_created_idx" ON "websurfing_sheet_updates" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "sheet_updates_applied_idx" ON "websurfing_sheet_updates" USING btree ("appliedAt");--> statement-breakpoint
CREATE INDEX "sheet_updates_position_idx" ON "websurfing_sheet_updates" USING btree ("rowIndex","colIndex");--> statement-breakpoint
CREATE INDEX "sheet_user_idx" ON "websurfing_sheet" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "template_column_template_idx" ON "websurfing_template_column" USING btree ("templateId");--> statement-breakpoint
CREATE INDEX "template_column_position_idx" ON "websurfing_template_column" USING btree ("templateId","position");--> statement-breakpoint
CREATE INDEX "template_user_idx" ON "websurfing_template" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "template_public_idx" ON "websurfing_template" USING btree ("isPublic");--> statement-breakpoint
CREATE INDEX "template_created_idx" ON "websurfing_template" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "clarification_prompt_session_idx" ON "websurfing_clarification_prompt" USING btree ("sessionId");--> statement-breakpoint
CREATE INDEX "clarification_prompt_created_idx" ON "websurfing_clarification_prompt" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "transformer_session_event_idx" ON "websurfing_transformer_session" USING btree ("eventId");--> statement-breakpoint
CREATE INDEX "transformer_session_user_idx" ON "websurfing_transformer_session" USING btree ("userId");--> statement-breakpoint

-- Recreate constraints with camelCase column names
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "cell_unique_position" UNIQUE("sheetId","userId","rowIndex","colIndex");--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD CONSTRAINT "column_unique_position" UNIQUE("sheetId","position");--> statement-breakpoint
ALTER TABLE "websurfing_template_column" ADD CONSTRAINT "template_column_unique_position" UNIQUE("templateId","position");--> statement-breakpoint