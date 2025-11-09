import { type Config } from "drizzle-kit";

import { env } from "@/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL!,
  },
  tablesFilter: ["websurfing_*"],
  casing: 'snake_case', // Convert camelCase schema names to lowercase in database
} satisfies Config;
