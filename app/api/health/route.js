import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

/*
  GET /api/health
  ═══════════════
  Checks whether Gemini and Supabase are reachable using real API calls.

  Returns:
    { gemini: "connected" | "error", supabase: "connected" | "error", missing: string[] }

  - "connected" = a real live call succeeded
  - "error"     = the call threw or returned a non-OK status
  - missing[]   = any env vars that are not set at all (fast-fail)

  Both checks run in parallel via Promise.allSettled so one failure
  does not mask the other.
*/

const GEMINI_KEY    = process.env.GEMINI_API_KEY;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY;

export async function GET() {
  // ── 1. Check which env vars are missing ──────────────────────────────────
  const missing = [];
  if (!GEMINI_KEY)   missing.push("GEMINI_API_KEY");
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_KEY) missing.push("SUPABASE_ANON_KEY");

  // ── 2. Define probe functions ─────────────────────────────────────────────

  /**
   * Gemini probe: embed a short fixed string.
   * We use a minimal 1-token input to keep latency low and avoid
   * burning quota on health checks.
   */
  async function probeGemini() {
    if (!GEMINI_KEY) throw new Error("GEMINI_API_KEY not set");

    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

    const res = await model.embedContent({
      content: { parts: [{ text: "ping" }] },
      outputDimensionality: 1, // smallest possible — just check reachability
    });

    // If the SDK didn't throw, check we got something back
    if (!res?.embedding?.values || res.embedding.values.length === 0) {
      throw new Error("Gemini returned empty embedding");
    }
  }

  /**
   * Supabase probe: select a single row from documents (or COUNT(*) = 0 is fine too).
   * This validates the URL + anon key + network path to Supabase in one shot.
   */
  async function probeSupabase() {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase env vars not set");

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // count:exact with head:true sends a HEAD request that returns the row count
    // without fetching any actual data — zero network overhead.
    const { error } = await supabase
      .from("documents")
      .select("id", { count: "exact", head: true });

    if (error) throw new Error(error.message);
  }

  // ── 3. Run both probes in parallel ────────────────────────────────────────
  const [geminiResult, supabaseResult] = await Promise.allSettled([
    probeGemini(),
    probeSupabase(),
  ]);

  const gemini   = geminiResult.status   === "fulfilled" ? "connected" : "error";
  const supabase = supabaseResult.status === "fulfilled" ? "connected" : "error";

  // Include error details for debugging (stripped from UI, available in logs)
  const details = {};
  if (geminiResult.status === "rejected") {
    details.geminiError = geminiResult.reason?.message ?? "Unknown error";
    console.error("[/api/health] Gemini probe failed:", details.geminiError);
  }
  if (supabaseResult.status === "rejected") {
    details.supabaseError = supabaseResult.reason?.message ?? "Unknown error";
    console.error("[/api/health] Supabase probe failed:", details.supabaseError);
  }

  return NextResponse.json({
    gemini,
    supabase,
    missing,   // non-empty = env var not set at all (separate from connection error)
    ...details,
  });
}
