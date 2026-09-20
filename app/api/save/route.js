import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

// Helper to delay execution for exponential backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to call Gemini embedding API with retry on 429 rate limit
async function generateEmbeddingWithRetry(text, modelName = "gemini-embedding-2") {
  const genAI = new GoogleGenerativeAI(geminiKey);
  const embeddingModel = genAI.getGenerativeModel({ model: modelName });

  const maxAttempts = 3;
  const backoffDelays = [1000, 2000, 4000];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const embedResult = await embeddingModel.embedContent({
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      });
      return embedResult.embedding.values;
    } catch (err) {
      const isRateLimit = err.status === 429 || (err.message && err.message.includes("429"));
      if (isRateLimit && attempt < maxAttempts) {
        await sleep(backoffDelays[attempt - 1]);
        continue;
      }
      throw err;
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { url, title, content } = body || {};

    // 1. Validation: Reject if url, title, or content is missing
    if (!url || !url.trim() || !title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json(
        { error: "URL, title, and content are required fields." },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      return NextResponse.json(
        { error: "Server missing required environment configuration (.env.local)" },
        { status: 500 }
      );
    }

    // 2. Truncate content to safe length (~8000 characters).
    // Reason: Gemini's embedding models have an input token limit; capping around 8000
    // characters prevents payload oversized errors while maintaining rich semantic context.
    const MAX_CONTENT_LENGTH = 8000;
    const truncatedContent = content.length > MAX_CONTENT_LENGTH 
      ? content.slice(0, MAX_CONTENT_LENGTH) 
      : content;

    const textToEmbed = `${title}\n\n${truncatedContent}`;

    // 3. Generate embedding with exponential backoff on 429 and explicit 502 on Gemini failure
    let embedding;
    try {
      // Try using gemini-embedding-2 (or fallback if specified)
      embedding = await generateEmbeddingWithRetry(textToEmbed, "gemini-embedding-2");
    } catch (geminiErr) {
      const isRateLimit = geminiErr.status === 429 || (geminiErr.message && geminiErr.message.includes("429"));
      if (isRateLimit) {
        return NextResponse.json(
          { error: "Gemini API rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Gemini API embedding generation failed: ${geminiErr.message}` },
        { status: 502 }
      );
    }

    // 4. Insert or update (upsert on url constraint) row in Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error: dbError } = await supabase
      .from("documents")
      .upsert(
        {
          url: url.trim(),
          title: title.trim(),
          content: content.trim(),
          embedding,
        },
        { onConflict: "url" }
      )
      .select("id")
      .single();

    if (dbError) {
      console.error("Supabase upsert error:", dbError);
      return NextResponse.json(
        { error: `Database save failed: ${dbError.message}` },
        { status: 500 }
      );
    }

    // 5. Return document ID and success flag
    return NextResponse.json({
      success: true,
      id: data?.id,
    });
  } catch (err) {
    console.error("API /save unexpected error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
