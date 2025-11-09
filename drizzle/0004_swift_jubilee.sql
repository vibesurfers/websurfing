ALTER TABLE "websurfing_cell" RENAME COLUMN "rowIndex" TO "rowindex";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "colIndex" TO "colindex";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "createdAt" TO "createdat";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "updatedAt" TO "updatedat";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "sessionId" TO "sessionid";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "userResponse" TO "userresponse";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "responseType" TO "responsetype";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "isRequired" TO "isrequired";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "createdAt" TO "createdat";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" RENAME COLUMN "answeredAt" TO "answeredat";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "eventType" TO "eventtype";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "createdAt" TO "createdat";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "processedAt" TO "processedat";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "createdAt" TO "createdat";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "updatedAt" TO "updatedat";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "templateId" TO "templateid";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "operatorType" TO "operatortype";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "operatorConfig" TO "operatorconfig";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "dataType" TO "datatype";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "validationRules" TO "validationrules";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "isRequired" TO "isrequired";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "defaultValue" TO "defaultvalue";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "createdAt" TO "createdat";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" RENAME COLUMN "updatedAt" TO "updatedat";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "userId" TO "userid";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "isPublic" TO "ispublic";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "isAutonomous" TO "isautonomous";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "systemPrompt" TO "systemprompt";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "usageCount" TO "usagecount";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "createdAt" TO "createdat";--> statement-breakpoint
ALTER TABLE "websurfing_template" RENAME COLUMN "updatedAt" TO "updatedat";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "eventId" TO "eventid";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "userId" TO "userid";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "currentStep" TO "currentstep";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "totalSteps" TO "totalsteps";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "createdAt" TO "createdat";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "updatedAt" TO "updatedat";--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" RENAME COLUMN "completedAt" TO "completedat";--> statement-breakpoint
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "cell_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_template_column" DROP CONSTRAINT "template_column_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" DROP CONSTRAINT "websurfing_clarification_prompt_sessionId_websurfing_transformer_session_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_template_column" DROP CONSTRAINT "websurfing_template_column_templateId_websurfing_template_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_template" DROP CONSTRAINT "websurfing_template_userId_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" DROP CONSTRAINT "websurfing_transformer_session_eventId_websurfing_event_queue_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" DROP CONSTRAINT "websurfing_transformer_session_userId_websurfing_user_id_fk";
--> statement-breakpoint
DROP INDEX "cell_position_idx";--> statement-breakpoint
DROP INDEX "clarification_prompt_session_idx";--> statement-breakpoint
DROP INDEX "clarification_prompt_created_idx";--> statement-breakpoint
DROP INDEX "event_queue_created_idx";--> statement-breakpoint
DROP INDEX "template_column_template_idx";--> statement-breakpoint
DROP INDEX "template_column_position_idx";--> statement-breakpoint
DROP INDEX "template_user_idx";--> statement-breakpoint
DROP INDEX "template_public_idx";--> statement-breakpoint
DROP INDEX "template_created_idx";--> statement-breakpoint
DROP INDEX "transformer_session_event_idx";--> statement-breakpoint
DROP INDEX "transformer_session_user_idx";--> statement-breakpoint
ALTER TABLE "websurfing_clarification_prompt" ADD CONSTRAINT "websurfing_clarification_prompt_sessionid_websurfing_transformer_session_id_fk" FOREIGN KEY ("sessionid") REFERENCES "public"."websurfing_transformer_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_template_column" ADD CONSTRAINT "websurfing_template_column_templateid_websurfing_template_id_fk" FOREIGN KEY ("templateid") REFERENCES "public"."websurfing_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_template" ADD CONSTRAINT "websurfing_template_userid_websurfing_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" ADD CONSTRAINT "websurfing_transformer_session_eventid_websurfing_event_queue_id_fk" FOREIGN KEY ("eventid") REFERENCES "public"."websurfing_event_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_transformer_session" ADD CONSTRAINT "websurfing_transformer_session_userid_websurfing_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cell_position_idx" ON "websurfing_cell" USING btree ("rowindex","colindex");--> statement-breakpoint
CREATE INDEX "clarification_prompt_session_idx" ON "websurfing_clarification_prompt" USING btree ("sessionid");--> statement-breakpoint
CREATE INDEX "clarification_prompt_created_idx" ON "websurfing_clarification_prompt" USING btree ("createdat");--> statement-breakpoint
CREATE INDEX "event_queue_created_idx" ON "websurfing_event_queue" USING btree ("createdat");--> statement-breakpoint
CREATE INDEX "template_column_template_idx" ON "websurfing_template_column" USING btree ("templateid");--> statement-breakpoint
CREATE INDEX "template_column_position_idx" ON "websurfing_template_column" USING btree ("templateid","position");--> statement-breakpoint
CREATE INDEX "template_user_idx" ON "websurfing_template" USING btree ("userid");--> statement-breakpoint
CREATE INDEX "template_public_idx" ON "websurfing_template" USING btree ("ispublic");--> statement-breakpoint
CREATE INDEX "template_created_idx" ON "websurfing_template" USING btree ("createdat");--> statement-breakpoint
CREATE INDEX "transformer_session_event_idx" ON "websurfing_transformer_session" USING btree ("eventid");--> statement-breakpoint
CREATE INDEX "transformer_session_user_idx" ON "websurfing_transformer_session" USING btree ("userid");--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "cell_unique_position" UNIQUE("sheetid","userid","rowindex","colindex");--> statement-breakpoint
ALTER TABLE "websurfing_template_column" ADD CONSTRAINT "template_column_unique_position" UNIQUE("templateid","position");