-- Add validation columns to websurfing_column table
ALTER TABLE "websurfing_column" ADD COLUMN "maxLength" integer;
ALTER TABLE "websurfing_column" ADD COLUMN "minLength" integer;
ALTER TABLE "websurfing_column" ADD COLUMN "required" boolean DEFAULT false;
ALTER TABLE "websurfing_column" ADD COLUMN "validationPattern" text;
ALTER TABLE "websurfing_column" ADD COLUMN "examples" jsonb;
ALTER TABLE "websurfing_column" ADD COLUMN "description" text;