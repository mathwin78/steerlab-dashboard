import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDB } from "@/lib/db/init";

interface PostHogDataPoint {
  days: string[];
  data: number[];
  label: string;
}

interface PostHogTrendResponse {
  result: PostHogDataPoint[];
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
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

    const params = new URLSearchParams({
      events: JSON.stringify([{ id: "$pageview" }]),
      date_from: "-7d",
      interval: "day",
    });

    const response = await fetch(
      `https://app.posthog.com/api/projects/${projectId}/insights/trend/?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        // Ensure fresh data
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

    const json: PostHogTrendResponse = await response.json();
    const result = json.result?.[0];

    if (!result) {
      return NextResponse.json(
        { error: "No data returned from PostHog" },
        { status: 500 }
      );
    }

    const { days, data } = result;
    let upsertCount = 0;

    for (let i = 0; i < days.length; i++) {
      const date = days[i].split("T")[0]; // normalize to YYYY-MM-DD
      const count = Math.round(data[i] ?? 0);

      await sql`
        INSERT INTO pageviews (date, count, updated_at)
        VALUES (${date}, ${count}, NOW())
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
