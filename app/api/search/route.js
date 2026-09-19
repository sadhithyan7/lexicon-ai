import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || !q.trim()) {
    return NextResponse.json({ results: [] });
  }

  try {
    if (!geminiKey) {
      throw new Error("Missing GEMINI_API_KEY configuration (.env.local)");
    }

    let kwDocs = [];
    let vecDocs = [];

    // Check if Supabase connection is available
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const genAI = new GoogleGenerativeAI(geminiKey);
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

        // 1. Embed query (768-dim)
        const embedRes = await embeddingModel.embedContent({
          content: { parts: [{ text: q }] },
          outputDimensionality: 768,
        });
        const queryEmbedding = embedRes.embedding.values;

        // 2. Execute parallel keyword and vector search RPCs
        const [kwRes, vecRes] = await Promise.all([
          supabase.rpc("keyword_search", { query: q, match_count: 20 }),
          supabase.rpc("vector_search", { query_embedding: queryEmbedding, match_count: 20 }),
        ]);

        if (!kwRes.error) kwDocs = kwRes.data || [];
        if (!vecRes.error) vecDocs = vecRes.data || [];

        // Fallback if RPCs fail or DB table is empty/unseeded
        if (kwRes.error || vecRes.error) {
          const { data: fallbackDocs } = await supabase
            .from("documents")
            .select("id, title, url, content")
            .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
            .limit(10);
          if (fallbackDocs && fallbackDocs.length) {
            kwDocs = fallbackDocs;
          }
        }
      } catch (err) {
        console.warn("Supabase query error:", err.message);
      }
    }

    // 3. Reciprocal Rank Fusion (RRF) in JS
    const RRF_K = 60;
    const scores = new Map(); // id -> { doc, score }

    kwDocs.forEach((doc, rank) => {
      const rrfScore = 1 / (RRF_K + (rank + 1));
      scores.set(doc.id, {
        doc,
        score: (scores.get(doc.id)?.score || 0) + rrfScore
      });
    });

    vecDocs.forEach((doc, rank) => {
      const rrfScore = 1 / (RRF_K + (rank + 1));
      const existing = scores.get(doc.id);
      scores.set(doc.id, {
        doc: doc || existing?.doc,
        score: (existing?.score || 0) + rrfScore
      });
    });

    const ranked = Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ doc, score }) => ({
        id: doc.id,
        title: doc.title,
        url: doc.url,
        snippet: doc.content ? doc.content.slice(0, 200) + "..." : "",
        score
      }));

    return NextResponse.json({ results: ranked });
  } catch (err) {
    console.error("API /search error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
