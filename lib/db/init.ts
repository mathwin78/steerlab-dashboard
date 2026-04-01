import { sql } from "@vercel/postgres";

let initialized = false;

export async function initDB(): Promise<void> {
  if (initialized) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS pageviews (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id SERIAL PRIMARY KEY,
        form_name VARCHAR(255),
        data JSONB,
        received_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        article_id VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        slug VARCHAR(255),
        published_at TIMESTAMP DEFAULT NOW()
      )
    `;

    initialized = true;
    console.log("Database tables initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize database tables:", error);
    throw error;
  }
}
