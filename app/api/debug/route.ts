import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `;
    const pageviews = await sql`SELECT * FROM pageviews ORDER BY date DESC LIMIT 10`;
    return NextResponse.json({
      tables: tables.rows,
      pageviews: pageviews.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
