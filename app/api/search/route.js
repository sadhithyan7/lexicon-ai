import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

// ---------------------------------------------------------------------------
// Snippet extraction
// Strategy: find the sentence that best contains the query keywords. 
// Falls back to first 150 characters if no keyword-bearing sentence found.
// "Cheaply" = no heavy NLP, just sentence splitting + keyword check.
// ---------------------------------------------------------------------------
function extractSnippet(content, query) {
  if (!content) return "";

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Split into rough sentences
  const sentences = content.match(/[^.!?]+[.!?]*/g) || [];

  if (keywords.length > 0) {
    let best = null;
    let bestScore = 0;

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const score = keywords.filter((kw) => lower.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        best = sentence.trim();
      }
    }

    if (best && bestScore > 0) {
      // Keep up to 200 characters
      return best.length > 200 ? best.slice(0, 200) + "…" : best;
    }
  }

  // Fallback: first 150 characters
  return content.length > 150 ? content.slice(0, 150) + "…" : content;
}

// ---------------------------------------------------------------------------
// Reciprocal Rank Fusion
// score(doc) = Σ 1/(60 + rank) across all lists it appears in
// ---------------------------------------------------------------------------
const RRF_K = 60;

function rrfMerge(lists) {
  const scores = new Map(); // id -> { doc, score }

  for (const list of lists) {
    list.forEach((doc, idx) => {
      const rank = idx + 1; // 1-indexed
      const rrfScore = 1 / (RRF_K + rank);
      const existing = scores.get(doc.id);
      scores.set(doc.id, {
        doc,
        score: (existing?.score || 0) + rrfScore,
      });
    });
  }

  return Array.from(scores.values()).sort((a, b) => b.score - a.score);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  // 1. Empty / missing query → 400
  if (!q || !q.trim()) {
    return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server missing database configuration." }, { status: 500 });
  }
  if (!geminiKey) {
    return NextResponse.json({ error: "Server missing GEMINI_API_KEY configuration." }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    let kwDocs = [];
    let vecDocs = [];
    let vectorUnavailable = false;

    // 2. Try to embed the query for vector search (graceful degradation if Gemini fails)
    let queryEmbedding = null;
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
      const embedRes = await embeddingModel.embedContent({
        content: { parts: [{ text: q }] },
        outputDimensionality: 768,
      });
      queryEmbedding = embedRes.embedding.values;
    } catch (embedErr) {
      // Embedding failed — will gracefully fall back to keyword-only
      vectorUnavailable = true;
      console.warn("Gemini embedding failed — falling back to keyword-only search:", embedErr.message);
    }

    // 3. Execute parallel searches (only run vector_search if we have an embedding)
    if (queryEmbedding) {
      const [kwRes, vecRes] = await Promise.all([
        supabase.rpc("keyword_search", { query: q, match_count: 20 }),
        supabase.rpc("vector_search", { query_embedding: queryEmbedding, match_count: 20 }),
      ]);

      if (!kwRes.error) kwDocs = kwRes.data || [];
      else console.warn("keyword_search RPC error:", kwRes.error.message);

      if (!vecRes.error) vecDocs = vecRes.data || [];
      else console.warn("vector_search RPC error:", vecRes.error.message);
    } else {
      // keyword-only path (vector was unavailable)
      const kwRes = await supabase.rpc("keyword_search", { query: q, match_count: 20 });
      if (!kwRes.error) kwDocs = kwRes.data || [];
      else console.warn("keyword_search RPC error:", kwRes.error.message);
    }

    // 4. RRF merge — pass both lists (vecDocs will be empty if vector was unavailable)
    const merged = rrfMerge([kwDocs, vecDocs]);

    // Filter: if keyword search returned 0 results (pure vector path), only keep results
    // where the combined RRF score is meaningfully above the floor.
    // A single vec-only result at rank 1 scores ~1/(60+1) = 0.0164.
    // We only suppress results when keyword search produced nothing at all AND
    // the vector similarity is weak — this gives a real empty state for nonsense queries.
    const hasKeywordResults = kwDocs.length > 0;

    // 5. Build top-10 response with smart snippets
    // When keyword search found nothing (no keyword hits), it means the query has
    // no term overlap with any doc. Pure vector results are still surfaced (up to 5)
    // so paraphrase queries work, but we cap lower to avoid flooding results for nonsense.
    const sliceSize = hasKeywordResults ? 10 : 5;
    const results = merged.slice(0, sliceSize).map(({ doc, score }) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      snippet: extractSnippet(doc.content, q),
      score,
    }));

    // 6. Return results — empty array is valid (not an error)
    return NextResponse.json({
      results,
      meta: {
        query: q,
        total: results.length,
        vectorUnavailable, // client can show a soft warning if true
      },
    });
  } catch (err) {
    console.error("API /search unexpected error:", err);
    return NextResponse.json({ error: err.message || "Search failed unexpectedly." }, { status: 500 });
  }
}
