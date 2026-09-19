import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

export async function POST(request) {
  try {
    const { q, history } = await request.json();

    if (!q || !q.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!geminiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY configuration (.env.local)" }, { status: 500 });
    }

    let documents = [];

    // 1. Fetch relevant context documents if Supabase is available
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const genAI = new GoogleGenerativeAI(geminiKey);
        const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });

        const embedRes = await embedModel.embedContent({
          content: { parts: [{ text: q }] },
          outputDimensionality: 768,
        });
        const queryEmbedding = embedRes.embedding.values;

        const [kwRes, vecRes] = await Promise.all([
          supabase.rpc("keyword_search", { query: q, match_count: 5 }),
          supabase.rpc("vector_search", { query_embedding: queryEmbedding, match_count: 5 }),
        ]);

        const kwDocs = kwRes.data || [];
        const vecDocs = vecRes.data || [];

        // Combine unique docs
        const docMap = new Map();
        [...kwDocs, ...vecDocs].forEach(d => {
          if (d && d.id && !docMap.has(d.id)) {
            docMap.set(d.id, d);
          }
        });
        documents = Array.from(docMap.values()).slice(0, 5);
      } catch (err) {
        console.warn("Could not retrieve context from Supabase:", err.message);
      }
    }

    // 2. Prepare Gemini prompt with retrieved context
    const genAI = new GoogleGenerativeAI(geminiKey);
    const generativeModel = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    let contextText = "";
    const sourcesList = [];

    if (documents.length > 0) {
      contextText = "CONTEXT FROM SAVED PAGES:\n" + documents.map((doc, idx) => {
        const n = idx + 1;
        sourcesList.push({
          n,
          title: doc.title,
          url: doc.url,
        });
        return `[${n}] "${doc.title}" (${doc.url}):\n${doc.content}`;
      }).join("\n\n");
    }

    const systemPrompt = `You are Lexicon, an intelligent personal knowledge assistant. Answer the user's question directly, clearly, and accurately.
${documents.length > 0 ? "Use the provided context passages. Insert inline citations like [1], [2] when citing information from the context passages." : "Answer the question accurately based on your knowledge base."}`;

    let fullPrompt = `${systemPrompt}\n\n`;

    if (contextText) {
      fullPrompt += `${contextText}\n\n`;
    }

    if (Array.isArray(history) && history.length > 0) {
      fullPrompt += "RECENT CONVERSATION HISTORY:\n";
      history.slice(-6).forEach(msg => {
        if (msg.role === "user") {
          fullPrompt += `User: ${msg.text}\n`;
        } else if (msg.role === "assistant") {
          const textOnly = Array.isArray(msg.content)
            ? msg.content.filter(c => c.type === "text").map(c => c.text).join("")
            : typeof msg.content === "string" ? msg.content : "";
          fullPrompt += `Assistant: ${textOnly}\n`;
        }
      });
      fullPrompt += "\n";
    }

    fullPrompt += `USER QUESTION: ${q}`;

    const genResult = await generativeModel.generateContent(fullPrompt);
    const rawAnswer = genResult.response.text();

    // 3. Parse answer text into content segments and citations for the UI
    const parsedContent = parseCitations(rawAnswer);

    return NextResponse.json({
      content: parsedContent,
      sources: sourcesList,
    });
  } catch (err) {
    console.error("API /ask error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/* Helper function to split raw text into structured text and cite objects */
function parseCitations(text) {
  const segments = [];
  const citeRegex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = citeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "cite", n: parseInt(match[1], 10) });
    lastIndex = citeRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }

  return segments.length ? segments : [{ type: "text", text }];
}
