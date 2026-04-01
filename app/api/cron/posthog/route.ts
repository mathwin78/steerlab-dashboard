import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDB } from "@/lib/db/init";

interface PostHogQueryResponse {
  results: Array<[string, number]>;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.POSTHOG_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;

  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: "Missing PostHog environment variables" },
      { status: 500 }
    );
  }

  try {
    await initDB();

    // Use HogQL query API (works on all PostHog plans)
    const response = await fetch(
      `https://eu.posthog.com/api/projects/${projectId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: `
              SELECT
                toDate(timestamp) AS day,
                count() AS pageviews
              FROM events
              WHERE event = '$pageview'
                AND timestamp >= now() - interval 7 day
              GROUP BY day
              ORDER BY day ASC
            `,
          },
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("PostHog API error:", response.status, text);
      return NextResponse.json(
        { error: `PostHog API returned ${response.status}` },
        { status: 502 }
      );
    }

    const json: PostHogQueryResponse = await response.json();
    const rows = json.results ?? [];
    let upsertCount = 0;

    for (const [day, count] of rows) {
      const date = day.split("T")[0];
      const views = Math.round(count ?? 0);

      await sql`
        INSERT INTO pageviews (date, count, updated_at)
        VALUES (${date}, ${views}, NOW())
        ON CONFLICT (date)
        DO UPDATE SET count = EXCLUDED.count, updated_at = NOW()
      `;
      upsertCount++;
    }

    return NextResponse.json({
      success: true,
      upserted: upsertCount,
      message: `Successfully synced ${upsertCount} days of pageview data from PostHog.`,
    });
  } catch (error) {
    console.error("Cron PostHog error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
