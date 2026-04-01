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
    console.warn("Invalid Webflow webhook signature for form submission");
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

    // Webflow form webhook payload contains formName and data fields
    const formName =
      (payload.formName as string) ||
      (payload.name as string) ||
      "Unknown Form";
    const formData =
      (payload.data as Record<string, unknown>) ||
      (payload.fields as Record<string, unknown>) ||
      payload;

    await sql`
      INSERT INTO form_submissions (form_name, data, received_at)
      VALUES (${formName}, ${JSON.stringify(formData)}, NOW())
    `;

    console.log(`Stored form submission: ${formName}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error storing form submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
