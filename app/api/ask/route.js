import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

// ---------------------------------------------------------------------------
// Reciprocal Rank Fusion — identical to /api/search so both routes stay in sync
// score(doc) = Σ 1/(60 + rank) across all ranked lists it appears in
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

// ---------------------------------------------------------------------------
// Embed a text string with Gemini (text-embedding-004 / gemini-embedding-2)
// Returns the 768-dim float array, or null if embedding fails.
// ---------------------------------------------------------------------------
async function embedText(genAI, text) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const res = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    });
    return res.embedding.values;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hybrid search: top-5 docs for the given query using RRF.
// Returns { docs: [...], vectorUnavailable: bool }
// ---------------------------------------------------------------------------
async function hybridSearch(supabase, genAI, query) {
  let kwDocs = [];
  let vecDocs = [];
  let vectorUnavailable = false;

  // Embed query for vector search
  const queryEmbedding = await embedText(genAI, query);
  if (!queryEmbedding) {
    vectorUnavailable = true;
  }

  if (queryEmbedding) {
    const [kwRes, vecRes] = await Promise.all([
      supabase.rpc("keyword_search", { query, match_count: 10 }),
      supabase.rpc("vector_search", { query_embedding: queryEmbedding, match_count: 10 }),
    ]);
    if (!kwRes.error) kwDocs = kwRes.data || [];
    else console.warn("keyword_search RPC error:", kwRes.error.message);

    if (!vecRes.error) vecDocs = vecRes.data || [];
    else console.warn("vector_search RPC error:", vecRes.error.message);
  } else {
    // keyword-only fallback
    const kwRes = await supabase.rpc("keyword_search", { query, match_count: 10 });
    if (!kwRes.error) kwDocs = kwRes.data || [];
    else console.warn("keyword_search (keyword-only) RPC error:", kwRes.error.message);
  }

  const merged = rrfMerge([kwDocs, vecDocs]);

  // Relevance threshold: minimum RRF score that a doc must hit to be considered
  // "relevant enough" for RAG context. A single doc at rank 1 from a single list
  // scores 1/(60+1) ≈ 0.0164. Appearing in both lists at rank 1 scores ≈ 0.0328.
  // Setting 0.010 accepts anything that scores at all — but we still skip Gemini
  // when ZERO docs come back (pure no-result case).
  const MIN_RRF = 0.010;
  const docs = merged
    .filter(({ score }) => score >= MIN_RRF)
    .slice(0, 5)
    .map(({ doc }) => doc);

  return { docs, vectorUnavailable };
}

// ---------------------------------------------------------------------------
// Call Gemini generative with exponential backoff on 429.
// Retries: 1 s → 2 s → 4 s (3 attempts max).
// Returns the response text, or throws with a structured error.
// ---------------------------------------------------------------------------
async function callGeminiWithBackoff(model, prompt, chatHistory) {
  const delays = [1000, 2000, 4000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      // Use startChat for multi-turn so history is properly threaded
      const chat = model.startChat({
        history: chatHistory, // array of { role, parts: [{ text }] }
      });
      const result = await chat.sendMessage(prompt);
      return result.response.text();
    } catch (err) {
      // Detect genuine rate-limit / quota errors.
      // Be careful NOT to match "no longer available" (404) or other non-429 errors.
      const statusIs429 = err?.status === 429;
      const msgIs429 =
        err?.message?.includes("429") ||
        (err?.message?.toLowerCase().includes("rate") &&
          !err?.message?.toLowerCase().includes("not")) ||
        err?.message?.toLowerCase().includes("quota exceeded") ||
        err?.message?.toLowerCase().includes("resource_exhausted");
      const is429 = statusIs429 || msgIs429;

      if (is429 && attempt < delays.length) {
        console.warn(`Gemini 429 — retry ${attempt + 1} in ${delays[attempt]}ms`);
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }

      if (is429) {
        const e = new Error(
          "Gemini is rate-limited right now. Please wait a moment and try again."
        );
        e.status = 429;
        throw e;
      }

      // Any other Gemini error → 502
      const e = new Error(
        `Gemini generation failed: ${err.message || "unknown error"}`
      );
      e.status = 502;
      throw e;
    }
  }
}

// ---------------------------------------------------------------------------
// Parse Gemini raw answer text into structured segments for the UI.
// Splits on [1], [2] etc. → { type: "text" | "cite", text?, n? }
// Also extracts the set of cited citation numbers.
// ---------------------------------------------------------------------------
function parseCitations(text) {
  const segments = [];
  const citedNumbers = new Set();
  const citeRegex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = citeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const n = parseInt(match[1], 10);
    segments.push({ type: "cite", n });
    citedNumbers.add(n);
    lastIndex = citeRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }

  return {
    segments: segments.length ? segments : [{ type: "text", text }],
    citedNumbers,
  };
}

// ---------------------------------------------------------------------------
// Convert the client-side history array to Gemini's chat history format.
// Client sends: [{ role: "user"|"assistant", text?, content? }]
// Gemini wants: [{ role: "user"|"model", parts: [{ text }] }]
// ---------------------------------------------------------------------------
function toGeminiHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return [];

  return history
    .map((msg) => {
      // Extract plain text from either msg.text (user) or msg.content (assistant segments)
      let text = "";
      if (typeof msg.text === "string") {
        text = msg.text;
      } else if (Array.isArray(msg.content)) {
        text = msg.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("");
      } else if (typeof msg.content === "string") {
        text = msg.content;
      }

      if (!text.trim()) return null;

      return {
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      };
    })
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// POST /api/ask
// Body: { question: string, history: Array<{ role, text?, content? }> }
// ---------------------------------------------------------------------------
export async function POST(request) {
  try {
    const body = await request.json();
    const question = (body.question || "").trim();
    const history = body.history || [];

    // 1. Validate
    if (!question) {
      return NextResponse.json(
        { error: "Field 'question' is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    if (!geminiKey) {
      return NextResponse.json(
        { error: "Server is missing GEMINI_API_KEY configuration." },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server is missing database configuration." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(geminiKey);

    // 2. Hybrid search on the CURRENT question (not the full history)
    //    This keeps retrieval focused on what was just asked, not prior turns.
    const { docs } = await hybridSearch(supabase, genAI, question);

    // 3. No relevant documents → skip Gemini entirely, return a specific message
    if (docs.length === 0) {
      return NextResponse.json({
        answer:
          "I don't have anything saved about that yet. Try saving some pages on that topic first, then ask again.",
        citations: [],
        noContext: true,
      });
    }

    // 4. Build context block (numbered [1]..[5]) and source map for citations
    const sourcesList = [];
    const contextBlock = docs
      .map((doc, idx) => {
        const n = idx + 1;
        sourcesList.push({ number: n, title: doc.title, url: doc.url });
        return `[${n}] Title: "${doc.title}"\nURL: ${doc.url}\n\n${doc.content}`;
      })
      .join("\n\n---\n\n");

    // 5. System prompt — strict grounding rules
    //    Handles both Q&A ("what is X") and summarization ("summarize X") naturally.
    const systemInstruction = `You are Lexicon, a personal knowledge assistant. Your job is to answer questions and summarize topics using ONLY the saved documents provided below as context.

Rules you must follow:
- Answer using ONLY information from the provided documents. Do not use outside knowledge.
- If the documents don't cover the question or topic, say exactly: "I don't have anything saved about that."
- For every fact or claim, add an inline citation like [1] or [2] matching the document number it came from. Multiple citations like [1][2] are fine.
- Summarization requests ("summarize X", "give me a summary of X") should produce a concise structured summary drawn from the relevant documents, still with citations.
- Write in clear, direct prose. Markdown headings and bullet points are fine for summaries.

SAVED DOCUMENTS:
${contextBlock}`;

    // 6. Convert client history to Gemini format (last 8 turns to stay within context)
    const geminiHistory = toGeminiHistory(history.slice(-8));

    // 7. Call Gemini generative with the system instruction as the first user turn
    //    (startChat system instruction is part of the model init in the SDK)
    const generativeModel = genAI.getGenerativeModel({
      model: "gemini-3.6-flash", // confirmed working; gemini-2.0-flash is deprecated (404)
      systemInstruction,
    });

    let rawAnswer;
    try {
      rawAnswer = await callGeminiWithBackoff(generativeModel, question, geminiHistory);
    } catch (err) {
      if (err.status === 429) {
        return NextResponse.json({ error: err.message }, { status: 429 });
      }
      return NextResponse.json(
        { error: err.message || "Gemini generation failed." },
        { status: err.status || 502 }
      );
    }

    // 8. Parse answer for [n] markers → structured segments + set of cited numbers
    const { segments, citedNumbers } = parseCitations(rawAnswer);

    // 9. Filter sources: only return sources that were actually cited in the answer.
    //    If no citation markers appeared at all, return all sources (graceful fallback).
    const citations =
      citedNumbers.size > 0
        ? sourcesList.filter((s) => citedNumbers.has(s.number))
        : sourcesList;

    return NextResponse.json({
      answer: rawAnswer,       // raw text (for history serialisation)
      segments,                // structured segments for inline rendering
      citations,               // [{ number, title, url }] — only cited ones
    });
  } catch (err) {
    console.error("API /ask unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
