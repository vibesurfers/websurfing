CREATE TABLE "websurfing_sheet_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" varchar(255) NOT NULL,
	"rowIndex" integer NOT NULL,
	"colIndex" integer NOT NULL,
	"content" text,
	"updateType" varchar(50) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now(),
	"appliedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "websurfing_cell" DROP CONSTRAINT "cell_unique_position";--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD COLUMN "userId" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD COLUMN "userId" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "websurfing_sheet_updates" ADD CONSTRAINT "websurfing_sheet_updates_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sheet_updates_user_idx" ON "websurfing_sheet_updates" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "sheet_updates_created_idx" ON "websurfing_sheet_updates" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "sheet_updates_applied_idx" ON "websurfing_sheet_updates" USING btree ("appliedAt");--> statement-breakpoint
CREATE INDEX "sheet_updates_position_idx" ON "websurfing_sheet_updates" USING btree ("rowIndex","colIndex");--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "websurfing_cell_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "websurfing_event_queue" ADD CONSTRAINT "websurfing_event_queue_userId_websurfing_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."websurfing_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cell_user_idx" ON "websurfing_cell" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "event_queue_user_idx" ON "websurfing_event_queue" USING btree ("userId");--> statement-breakpoint
ALTER TABLE "websurfing_cell" ADD CONSTRAINT "cell_unique_position" UNIQUE("userId","rowIndex","colIndex");