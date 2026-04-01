import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDB } from "@/lib/db/init";

export interface PageviewRow {
  date: string;
  count: number;
}

export interface FormSubmissionRow {
  id: number;
  form_name: string;
  data: Record<string, unknown>;
  received_at: string;
}

export interface ArticleRow {
  id: number;
  article_id: string;
  name: string;
  slug: string;
  published_at: string;
}

export interface StatsResponse {
  pageviews: {
    total7d: number;
    byDay: PageviewRow[];
  };
  formSubmissions: {
    total: number;
    recent: FormSubmissionRow[];
  };
  articles: {
    total: number;
    recent: ArticleRow[];
    byDay: { date: string; count: number }[];
  };
}

export async function GET() {
  try {
    await initDB();

    // Pageviews: last 7 days
    const pageviewsResult = await sql<PageviewRow>`
      SELECT date::text, count
      FROM pageviews
      WHERE date >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY date ASC
    `;

    const total7d = pageviewsResult.rows.reduce(
      (sum, row) => sum + Number(row.count),
      0
    );

    // Form submissions: total count + 10 most recent
    const formCountResult = await sql<{ total: string }>`
      SELECT COUNT(*) as total FROM form_submissions
    `;
    const formRecentResult = await sql<FormSubmissionRow>`
      SELECT id, form_name, data, received_at::text
      FROM form_submissions
      ORDER BY received_at DESC
      LIMIT 10
    `;

    // Articles: total count + 10 most recent + by day (last 30 days)
    const articleCountResult = await sql<{ total: string }>`
      SELECT COUNT(*) as total FROM articles
    `;
    const articleRecentResult = await sql<ArticleRow>`
      SELECT id, article_id, name, slug, published_at::text
      FROM articles
      ORDER BY published_at DESC
      LIMIT 10
    `;
    const articlesByDayResult = await sql<{ date: string; count: string }>`
      SELECT DATE(published_at)::text as date, COUNT(*) as count
      FROM articles
      WHERE published_at >= CURRENT_DATE - INTERVAL '29 days'
      GROUP BY DATE(published_at)
      ORDER BY date ASC
    `;

    const stats: StatsResponse = {
      pageviews: {
        total7d,
        byDay: pageviewsResult.rows.map((row) => ({
          date: row.date,
          count: Number(row.count),
        })),
      },
      formSubmissions: {
        total: Number(formCountResult.rows[0]?.total ?? 0),
        recent: formRecentResult.rows,
      },
      articles: {
        total: Number(articleCountResult.rows[0]?.total ?? 0),
        recent: articleRecentResult.rows,
        byDay: articlesByDayResult.rows.map((row) => ({
          date: row.date,
          count: Number(row.count),
        })),
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
