import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Use DATABASE_URL for standard connection
// For Supabase, DATABASE_URL should be the connection string with pooling or direct
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL or SUPABASE_URL must be set. Please check your environment variables.",
  );
}

// Ensure connection string is properly formatted for node-postgres if it comes from SUPABASE_URL
// Note: Usually SUPABASE_URL is the API endpoint, we need the DB connection string.
// I will assume the user has set DATABASE_URL to the Supabase Postgres connection string.

export const pool = new Pool({ 
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool, { schema });
