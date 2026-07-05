import type { ExtractedAccount } from "@/lib/types";

export const runtime = "nodejs";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-5";

const EXTRACTION_PROMPT = `This is a photo of a brokerage account summary page. Extract every account row visible. For each, return the account number (if visible), the account holder or account name with registration type, and the TOTAL ACCOUNT VALUE — the full account value for the row (on Schwab Advisor Center reports this is the leftmost dollar figure per account row, sometimes circled by hand), NOT the cash balance, NOT market value long, NOT funds available to trade.

Handwritten corrections take priority over what's printed:
- If the printed account value has a line drawn through it and a new value is handwritten near it (e.g. above it), use the handwritten value instead of the crossed-out printed value.
- If an entire account row is crossed out, that account is no longer available — omit it entirely from the results; do not include it in the JSON array at all.
- For any row without these markings, the printed value is the source of truth as usual.

Respond ONLY with a JSON array, no markdown fences, no commentary. Format: [{"account":"4463-9026","name":"KRAFT, ANDREW — Roth IRA","value":17111.18}]`;

function stripJsonFences(text: string): string {
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return s.trim();
}

function extractJsonArray(text: string): unknown {
  const cleaned = stripJsonFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("No JSON array found in model response");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function isHeicMimeType(mimeType: string): boolean {
  return mimeType === "image/heic" || mimeType === "image/heif";
}

async function convertHeicServerSide(base64: string): Promise<{ base64: string; mimeType: string }> {
  const sharp = (await import("sharp")).default;
  const buffer = Buffer.from(base64, "base64");
  const converted = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
  return { base64: converted.toString("base64"), mimeType: "image/jpeg" };
}

function validateAccounts(parsed: unknown): ExtractedAccount[] {
  if (!Array.isArray(parsed)) {
    throw new Error("Model response was not a JSON array");
  }
  const accounts: ExtractedAccount[] = [];
  for (const row of parsed) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const value = typeof r.value === "number" ? r.value : Number(r.value);
    if (!Number.isFinite(value) || value <= 0) continue;
    accounts.push({
      account: typeof r.account === "string" ? r.account : undefined,
      name: typeof r.name === "string" ? r.name : undefined,
      value,
    });
  }
  return accounts;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server is missing OPENROUTER_API_KEY configuration" }, { status: 500 });
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body — expected JSON" }, { status: 400 });
  }

  const { imageBase64, mimeType } = body;
  if (!imageBase64 || !mimeType) {
    return Response.json({ error: "Missing imageBase64 or mimeType" }, { status: 400 });
  }

  let finalBase64 = imageBase64;
  let finalMimeType = mimeType;

  if (isHeicMimeType(mimeType)) {
    try {
      const converted = await convertHeicServerSide(imageBase64);
      finalBase64 = converted.base64;
      finalMimeType = converted.mimeType;
    } catch {
      return Response.json(
        { error: "This photo is in HEIC format and could not be converted. Try re-taking it or converting it to JPEG first." },
        { status: 422 }
      );
    }
  }

  const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!supportedTypes.includes(finalMimeType)) {
    return Response.json({ error: `Unsupported image type: ${finalMimeType}` }, { status: 422 });
  }

  try {
    const orResponse = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Advisory Quarterly Fee Calculator",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${finalMimeType};base64,${finalBase64}` } },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
        ],
      }),
    });

    const data = await orResponse.json();

    if (!orResponse.ok) {
      const message = data?.error?.message || `OpenRouter request failed (${orResponse.status})`;
      return Response.json({ error: `Extraction failed: ${message}` }, { status: 502 });
    }

    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim() === "") {
      return Response.json({ error: "Model returned no readable text" }, { status: 502 });
    }

    const parsed = extractJsonArray(text);
    const accounts = validateAccounts(parsed);

    return Response.json({ accounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error while extracting accounts";
    return Response.json({ error: `Extraction failed: ${message}` }, { status: 502 });
  }
}
