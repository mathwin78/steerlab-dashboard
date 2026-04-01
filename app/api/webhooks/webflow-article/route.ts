import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { initDB } from "@/lib/db/init";

function verifyWebflowSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(rawBody, "utf8");
  const digest = hmac.digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest, "hex"),
      Buffer.from(signatureHeader, "hex")
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.WEBFLOW_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("WEBFLOW_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Could not read body" }, { status: 400 });
  }

  const signatureHeader = request.headers.get("x-webflow-signature");
  const isValid = verifyWebflowSignature(webhookSecret, rawBody, signatureHeader);

  if (!isValid) {
    console.warn("Invalid Webflow webhook signature for article");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    await initDB();

    // Webflow CMS "item published" webhook payload shape
    const item = (payload.item as Record<string, unknown>) || payload;
    const articleId =
      (item._id as string) || (item.id as string) || crypto.randomUUID();
    const name =
      (item.name as string) || (item.title as string) || "Untitled Article";
    const slug = (item.slug as string) || "";
    const publishedAt =
      (item["published-on"] as string) ||
      (item.publishedAt as string) ||
      new Date().toISOString();

    await sql`
      INSERT INTO articles (article_id, name, slug, published_at)
      VALUES (${articleId}, ${name}, ${slug}, ${publishedAt})
      ON CONFLICT (article_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        published_at = EXCLUDED.published_at
    `;

    console.log(`Stored/updated article: ${name} (${articleId})`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error storing article:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
