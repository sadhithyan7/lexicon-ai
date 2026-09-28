import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/*
  GET /api/documents
  ══════════════════
  Returns a list of saved documents, ordered by most recently saved first.

  Query parameters:
    limit  (optional, default 20, max 100)
    offset (optional, default 0)

  Response:
    {
      documents: [{ id, url, title, created_at }],
      total: number,         // total rows in the table
      limit: number,
      offset: number,
    }

  Notes:
  - content and embedding are excluded to keep response size small.
    The History page only needs title, url, and created_at.
  - Used by the Dashboard (limit=5) and History page (no limit = default 20).
*/

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export async function GET(request) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);

  // Clamp limit to [1, 100]
  const rawLimit  = parseInt(searchParams.get("limit")  ?? "20", 10);
  const rawOffset = parseInt(searchParams.get("offset") ?? "0",  10);
  const limit  = Math.min(Math.max(isNaN(rawLimit)  ? 20 : rawLimit,  1), 100);
  const offset = Math.max(isNaN(rawOffset) ? 0 : rawOffset, 0);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error, count } = await supabase
    .from("documents")
    .select("id, url, title, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[/api/documents] Supabase error:", error.message);
    return NextResponse.json(
      { error: `Database error: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    documents: data ?? [],
    total:  count ?? 0,
    limit,
    offset,
  });
}
