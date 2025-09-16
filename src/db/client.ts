import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// Prefer NEXT_PRIVATE_DATABASE_URL for Next runtime private envs, fallback to DATABASE_URL
const connectionString =
  process.env.NEXT_PRIVATE_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "Database connection string is not set. Set NEXT_PRIVATE_DATABASE_URL or DATABASE_URL in environment."
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool);
