-- Add templateType and isAutonomous to sheets table
ALTER TABLE "websurfing_sheet" ADD COLUMN "templatetype" varchar(50);
ALTER TABLE "websurfing_sheet" ADD COLUMN "isautonomous" boolean DEFAULT false;

-- Create columns table
CREATE TABLE IF NOT EXISTS "websurfing_column" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sheetid" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"position" integer NOT NULL,
	"datatype" varchar(50) DEFAULT 'text',
	"createdat" timestamp with time zone DEFAULT now(),
	"updatedat" timestamp with time zone DEFAULT now()
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "websurfing_column" ADD CONSTRAINT "websurfing_column_sheetid_websurfing_sheet_id_fk" FOREIGN KEY ("sheetid") REFERENCES "websurfing_sheet"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "column_sheet_idx" ON "websurfing_column" USING btree ("sheetid");
CREATE INDEX IF NOT EXISTS "column_position_idx" ON "websurfing_column" USING btree ("sheetid","position");
CREATE UNIQUE INDEX IF NOT EXISTS "column_unique_position" ON "websurfing_column" USING btree ("sheetid","position");
