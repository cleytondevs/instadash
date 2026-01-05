import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use DATABASE_URL for standard connection
// Use DIRECT_URL if provided (common in Supabase for migrations/direct access)
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Please check your environment variables.",
  );
}

export const pool = new Pool({ 
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool, { schema });
