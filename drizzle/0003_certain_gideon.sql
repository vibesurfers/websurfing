ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "sheetId" TO "sheetid";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "userId" TO "userid";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "rowIndex" TO "rowindex";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "colIndex" TO "colindex";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "operatorName" TO "operatorname";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "statusMessage" TO "statusmessage";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" RENAME COLUMN "updatedAt" TO "updatedat";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "sheetId" TO "sheetid";--> statement-breakpoint
ALTER TABLE "websurfing_cell" RENAME COLUMN "userId" TO "userid";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "sheetId" TO "sheetid";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "dataType" TO "datatype";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "createdAt" TO "createdat";--> statement-breakpoint
ALTER TABLE "websurfing_column" RENAME COLUMN "updatedAt" TO "updatedat";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "sheetId" TO "sheetid";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "userId" TO "userid";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "retryCount" TO "retrycount";--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" RENAME COLUMN "lastError" TO "lasterror";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "sheetId" TO "sheetid";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "userId" TO "userid";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "rowIndex" TO "rowindex";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "colIndex" TO "colindex";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "updateType" TO "updatetype";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "createdAt" TO "createdat";--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" RENAME COLUMN "appliedAt" TO "appliedat";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "userId" TO "userid";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "templateType" TO "templatetype";--> statement-breakpoint
ALTER TABLE "websurfing_sheet" RENAME COLUMN "isAutonomous" TO "isautonomous";--> statement-breakpoint
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "cell_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_column" DROP CONSTRAINT "column_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" DROP CONSTRAINT "websurfing_cell_processing_status_sheetId_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" DROP CONSTRAINT "websurfing_cell_processing_status_userId_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "websurfing_cell_sheetId_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "websurfing_cell_userId_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_column" DROP CONSTRAINT "websurfing_column_sheetId_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" DROP CONSTRAINT "websurfing_event_queue_sheetId_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" DROP CONSTRAINT "websurfing_event_queue_userId_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" DROP CONSTRAINT "websurfing_sheet_updates_sheetId_websurfing_sheet_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" DROP CONSTRAINT "websurfing_sheet_updates_userId_websurfing_user_id_fk";
--> statement-breakpoint
ALTER TABLE "websurfing_sheet" DROP CONSTRAINT "websurfing_sheet_userId_websurfing_user_id_fk";
--> statement-breakpoint
DROP INDEX "cell_status_sheet_idx";--> statement-breakpoint
DROP INDEX "cell_status_position_idx";--> statement-breakpoint
DROP INDEX "cell_status_updated_idx";--> statement-breakpoint
DROP INDEX "cell_sheet_idx";--> statement-breakpoint
DROP INDEX "cell_user_idx";--> statement-breakpoint
DROP INDEX "column_sheet_idx";--> statement-breakpoint
DROP INDEX "column_position_idx";--> statement-breakpoint
DROP INDEX "event_queue_sheet_idx";--> statement-breakpoint
DROP INDEX "event_queue_user_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_sheet_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_user_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_created_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_applied_idx";--> statement-breakpoint
DROP INDEX "sheet_updates_position_idx";--> statement-breakpoint
DROP INDEX "sheet_user_idx";--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" ADD CONSTRAINT "websurfing_cell_processing_status_sheetid_websurfing_sheet_id_fk" FOREIGN KEY ("sheetid") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_cell_processing_status" ADD CONSTRAINT "websurfing_cell_processing_status_userid_websurfing_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "websurfing_cell_sheetid_websurfing_sheet_id_fk" FOREIGN KEY ("sheetid") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "websurfing_cell_userid_websurfing_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD CONSTRAINT "websurfing_column_sheetid_websurfing_sheet_id_fk" FOREIGN KEY ("sheetid") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD CONSTRAINT "websurfing_event_queue_sheetid_websurfing_sheet_id_fk" FOREIGN KEY ("sheetid") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD CONSTRAINT "websurfing_event_queue_userid_websurfing_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" ADD CONSTRAINT "websurfing_sheet_updates_sheetid_websurfing_sheet_id_fk" FOREIGN KEY ("sheetid") REFERENCES "public"."websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" ADD CONSTRAINT "websurfing_sheet_updates_userid_websurfing_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_sheet" ADD CONSTRAINT "websurfing_sheet_userid_websurfing_user_id_fk" FOREIGN KEY ("userid") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cell_status_sheet_idx" ON "websurfing_cell_processing_status" USING btree ("sheetid");--> statement-breakpoint
CREATE INDEX "cell_status_position_idx" ON "websurfing_cell_processing_status" USING btree ("sheetid","rowindex","colindex");--> statement-breakpoint
CREATE INDEX "cell_status_updated_idx" ON "websurfing_cell_processing_status" USING btree ("updatedat");--> statement-breakpoint
CREATE INDEX "cell_sheet_idx" ON "websurfing_cell" USING btree ("sheetid");--> statement-breakpoint
CREATE INDEX "cell_user_idx" ON "websurfing_cell" USING btree ("userid");--> statement-breakpoint
CREATE INDEX "column_sheet_idx" ON "websurfing_column" USING btree ("sheetid");--> statement-breakpoint
CREATE INDEX "column_position_idx" ON "websurfing_column" USING btree ("sheetid","position");--> statement-breakpoint
CREATE INDEX "event_queue_sheet_idx" ON "websurfing_event_queue" USING btree ("sheetid");--> statement-breakpoint
CREATE INDEX "event_queue_user_idx" ON "websurfing_event_queue" USING btree ("userid");--> statement-breakpoint
CREATE INDEX "sheet_updates_sheet_idx" ON "websurfing_sheet_updates" USING btree ("sheetid");--> statement-breakpoint
CREATE INDEX "sheet_updates_user_idx" ON "websurfing_sheet_updates" USING btree ("userid");--> statement-breakpoint
CREATE INDEX "sheet_updates_created_idx" ON "websurfing_sheet_updates" USING btree ("createdat");--> statement-breakpoint
CREATE INDEX "sheet_updates_applied_idx" ON "websurfing_sheet_updates" USING btree ("appliedat");--> statement-breakpoint
CREATE INDEX "sheet_updates_position_idx" ON "websurfing_sheet_updates" USING btree ("rowindex","colindex");--> statement-breakpoint
CREATE INDEX "sheet_user_idx" ON "websurfing_sheet" USING btree ("userid");--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "cell_unique_position" UNIQUE("sheetid","userid","rowIndex","colIndex");--> statement-breakpoint
ALTER TABLE "websurfing_column" ADD CONSTRAINT "column_unique_position" UNIQUE("sheetid","position");