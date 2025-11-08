import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { config } from "dotenv";

config({ path: ".env" });

const conn = postgres(process.env.DATABASE_URL!);
const db = drizzle(conn);

async function migrateToSheets() {
  console.log("Starting migration to multi-sheet structure...");

  try {
    await db.transaction(async (tx) => {
      console.log("1. Creating sheets table if it doesn't exist...");
      await tx.execute(sql`
        CREATE TABLE IF NOT EXISTS websurfing_sheet (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          userid varchar(255) NOT NULL REFERENCES websurfing_user(id),
          name varchar(255) NOT NULL DEFAULT 'Untitled Sheet',
          "createdAt" timestamp with time zone DEFAULT now(),
          "updatedAt" timestamp with time zone DEFAULT now()
        )
      `);

      await tx.execute(sql`
        CREATE INDEX IF NOT EXISTS sheet_user_idx ON websurfing_sheet USING btree (userid)
      `);

      console.log("2. Creating default sheet for each user...");
      const allUsers = await tx.execute(sql`SELECT id FROM websurfing_user`);
      const userRows = Array.isArray(allUsers) ? allUsers : [];
      console.log(`Found ${userRows.length} users`);

      for (const user of userRows) {
        const existingSheet = await tx.execute(sql`
          SELECT id FROM websurfing_sheet WHERE userid = ${user.id} LIMIT 1
        `);

        const sheetRows = Array.isArray(existingSheet) ? existingSheet : [];
        if (sheetRows.length === 0) {
          await tx.execute(sql`
            INSERT INTO websurfing_sheet (userid, name)
            VALUES (${user.id}, 'My Sheet')
          `);
          console.log(`Created default sheet for user ${user.id}`);
        }
      }

      console.log("3. Adding sheetid column to cells table if it doesn't exist...");
      await tx.execute(sql`
        ALTER TABLE websurfing_cell
        ADD COLUMN IF NOT EXISTS sheetid uuid
      `);

      console.log("4. Deleting cells without userid (orphaned data)...");
      const orphanedCells = await tx.execute(sql`
        DELETE FROM websurfing_cell WHERE userid IS NULL OR userid = ''
      `);
      console.log(`Deleted ${orphanedCells.count} orphaned cells`);

      console.log("5. Migrating existing cells to default sheet...");
      const updated = await tx.execute(sql`
        UPDATE websurfing_cell c
        SET sheetid = s.id
        FROM websurfing_sheet s
        WHERE c.userid = s.userid AND c.sheetid IS NULL
      `);
      console.log(`Updated ${updated.count} cells with sheetid`);

      console.log("6. Making sheetid NOT NULL and adding foreign key...");
      await tx.execute(sql`
        ALTER TABLE websurfing_cell
        ALTER COLUMN sheetid SET NOT NULL
      `);

      await tx.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'websurfing_cell_sheetid_websurfing_sheet_id_fk'
          ) THEN
            ALTER TABLE websurfing_cell
            ADD CONSTRAINT websurfing_cell_sheetid_websurfing_sheet_id_fk
            FOREIGN KEY (sheetid) REFERENCES websurfing_sheet(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);

      console.log("7. Updating cell unique constraint...");
      await tx.execute(sql`
        ALTER TABLE websurfing_cell DROP CONSTRAINT IF EXISTS cell_unique_position
      `);

      await tx.execute(sql`
        ALTER TABLE websurfing_cell
        ADD CONSTRAINT cell_unique_position UNIQUE (sheetid, userid, "rowIndex", "colIndex")
      `);

      await tx.execute(sql`
        CREATE INDEX IF NOT EXISTS cell_sheet_idx ON websurfing_cell USING btree (sheetid)
      `);

      console.log("8. Adding sheetid to event_queue...");
      await tx.execute(sql`
        ALTER TABLE websurfing_event_queue
        ADD COLUMN IF NOT EXISTS sheetid uuid
      `);

      console.log("  Deleting orphaned events...");
      const orphanedEvents = await tx.execute(sql`
        DELETE FROM websurfing_event_queue WHERE userid IS NULL OR userid = ''
      `);
      console.log(`  Deleted ${orphanedEvents.count} orphaned events`);

      await tx.execute(sql`
        UPDATE websurfing_event_queue e
        SET sheetid = s.id
        FROM websurfing_sheet s
        WHERE e.userid = s.userid AND e.sheetid IS NULL
      `);

      await tx.execute(sql`
        ALTER TABLE websurfing_event_queue
        ALTER COLUMN sheetid SET NOT NULL
      `);

      await tx.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'websurfing_event_queue_sheetid_websurfing_sheet_id_fk'
          ) THEN
            ALTER TABLE websurfing_event_queue
            ADD CONSTRAINT websurfing_event_queue_sheetid_websurfing_sheet_id_fk
            FOREIGN KEY (sheetid) REFERENCES websurfing_sheet(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);

      await tx.execute(sql`
        CREATE INDEX IF NOT EXISTS event_queue_sheet_idx ON websurfing_event_queue USING btree (sheetid)
      `);

      console.log("9. Adding sheetid to sheet_updates...");
      await tx.execute(sql`
        ALTER TABLE websurfing_sheet_updates
        ADD COLUMN IF NOT EXISTS sheetid uuid
      `);

      console.log("  Deleting orphaned sheet_updates...");
      const orphanedUpdates = await tx.execute(sql`
        DELETE FROM websurfing_sheet_updates WHERE userid IS NULL OR userid = ''
      `);
      console.log(`  Deleted ${orphanedUpdates.count} orphaned sheet_updates`);

      await tx.execute(sql`
        UPDATE websurfing_sheet_updates u
        SET sheetid = s.id
        FROM websurfing_sheet s
        WHERE u.userid = s.userid AND u.sheetid IS NULL
      `);

      await tx.execute(sql`
        ALTER TABLE websurfing_sheet_updates
        ALTER COLUMN sheetid SET NOT NULL
      `);

      await tx.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'websurfing_sheet_updates_sheetid_websurfing_sheet_id_fk'
          ) THEN
            ALTER TABLE websurfing_sheet_updates
            ADD CONSTRAINT websurfing_sheet_updates_sheetid_websurfing_sheet_id_fk
            FOREIGN KEY (sheetid) REFERENCES websurfing_sheet(id) ON DELETE CASCADE;
          END IF;
        END $$;
      `);

      await tx.execute(sql`
        CREATE INDEX IF NOT EXISTS sheet_updates_sheet_idx ON websurfing_sheet_updates USING btree (sheetid)
      `);

      console.log("Migration completed successfully!");
    });
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await conn.end();
  }
}

migrateToSheets()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
