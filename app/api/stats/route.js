import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/*
  GET /api/stats
  ══════════════
  Returns aggregate statistics about the user's saved document library.

  Response:
    { totalSaved: number, savedThisWeek: number, questionsAsked: number }

  - totalSaved:    COUNT(*) from documents
  - savedThisWeek: COUNT(*) from documents WHERE created_at >= 7 days ago
  - questionsAsked: not tracked in DB yet — returns null; UI shows "—"

  Both counts run in a single round-trip via Promise.all.
*/

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json(
      { error: "Missing Supabase environment variables" },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ISO string for "7 days ago"
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalRes, weekRes] = await Promise.all([
    // Total count — head:true avoids fetching any row data
    supabase.from("documents").select("id", { count: "exact", head: true }),
    // This week's count
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
  ]);

  if (totalRes.error) {
    console.error("[/api/stats] Total count error:", totalRes.error.message);
    return NextResponse.json(
      { error: `Database error: ${totalRes.error.message}` },
      { status: 500 }
    );
  }
  if (weekRes.error) {
    console.error("[/api/stats] Week count error:", weekRes.error.message);
    return NextResponse.json(
      { error: `Database error: ${weekRes.error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    totalSaved:    totalRes.count ?? 0,
    savedThisWeek: weekRes.count  ?? 0,
    questionsAsked: null, // not tracked in DB; UI renders "—"
  });
}
