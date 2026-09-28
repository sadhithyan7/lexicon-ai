import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/*
  DELETE /api/documents/all
  =========================
  Deletes every row in the documents table.

  This is a DESTRUCTIVE action — the Settings page requires the user to
  confirm via a second click before this endpoint is ever called. The
  endpoint itself also requires a confirmation token in the request body
  as a second line of defence against accidental calls (e.g. a browser
  prefetch hitting this URL).

  Request body:
    { confirm: "DELETE_ALL" }

  Without the correct token, returns 400 Bad Request.

  Returns:
    200  { success: true, deleted: number }
    400  { error: "Confirmation token required ..." }
    500  { error: "..." }
*/

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export async function DELETE(request) {
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

  // ── Require confirmation token ────────────────────────────────────────────
  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body could be empty (no JSON) — treat as missing confirmation
  }

  if (body?.confirm !== "DELETE_ALL") {
    return NextResponse.json(
      {
        error:
          'Confirmation token required. Send { "confirm": "DELETE_ALL" } in the request body.',
      },
      { status: 400 }
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    /*
      Supabase's JS client requires a WHERE clause for DELETE operations
      (deleting without a filter throws a "406 Not Acceptable" to prevent
      accidental full-table deletes from unguarded client code).
      We use id > 0 as a universal truthy filter — it matches all rows
      since id is a serial/bigint primary key that starts at 1.
    */
    const { error, count } = await supabase
      .from("documents")
      .delete({ count: "exact" })
      .gt("id", 0);

    if (error) {
      console.error("[/api/documents/all] Supabase delete error:", error.message);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[/api/documents/all] Deleted ${count ?? "?"} document(s).`);
    return NextResponse.json({ success: true, deleted: count ?? 0 });
  } catch (err) {
    console.error("[/api/documents/all] Unexpected error:", err.message);
    return NextResponse.json(
      { error: err.message || "Delete failed unexpectedly" },
      { status: 500 }
    );
  }
}
