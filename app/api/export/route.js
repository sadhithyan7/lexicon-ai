import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/*
  GET /api/export
  ═══════════════
  Returns all documents in the database as a downloadable JSON file.

  Response headers:
    Content-Type:        application/json
    Content-Disposition: attachment; filename="lexicon-export-<date>.json"

  Payload shape:
    {
      exportedAt: ISO8601 string,
      count: number,
      documents: [{ id, url, title, content, created_at }, ...]
    }

  Notes:
  - embedding column is intentionally excluded (large, not useful for export).
  - ordered by created_at DESC so the newest items appear first.
  - No pagination — intended for full exports. If the library grows very
    large (10k+ docs), this could be paginated, but that's out of scope here.
*/

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export async function GET() {
  // ── Validate environment ──────────────────────────────────────────────────
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_KEY) missing.push("SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing environment variables: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Fetch all documents — exclude the embedding vector column (it's large
    // binary data that is meaningless outside the database context).
    const { data, error } = await supabase
      .from("documents")
      .select("id, url, title, content, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[/api/export] Supabase error:", error.message);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    const payload = JSON.stringify(
      {
        exportedAt: now.toISOString(),
        count: data.length,
        documents: data,
      },
      null,
      2  // pretty-print for readability when opened in a text editor
    );

    return new Response(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="lexicon-export-${dateStr}.json"`,
        // Prevent caching — the export must always reflect the current state.
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/export] Unexpected error:", err.message);
    return NextResponse.json(
      { error: err.message || "Export failed unexpectedly" },
      { status: 500 }
    );
  }
}
