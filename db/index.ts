import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";
import { log } from "../server/vite";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let db: ReturnType<typeof drizzle>;

try {
  log("Initializing database connection...");
  db = drizzle({
    connection: process.env.DATABASE_URL,
    schema,
    ws: ws,
  });
  log("Database connection initialized successfully");
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  throw error;
}

export { db };

// Export utility functions for database operations
export async function checkDatabaseConnection() {
  try {
    // Try a simple query to verify connection
    const result = await db.query.users.findMany({ limit: 1 });
    return true;
  } catch (error) {
    console.error("Database connection check failed:", error);
    return false;
  }
}