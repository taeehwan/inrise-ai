import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log database connection info for debugging
const dbUrl = process.env.DATABASE_URL;
const dbHost = dbUrl ? new URL(dbUrl).host : 'unknown';
const isProduction = process.env.NODE_ENV === 'production';
console.log(`🔗 Database connection: ${dbHost}`);
console.log(`📍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`✅ Preview and Production share the same database - all data persists across deployments`);

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
