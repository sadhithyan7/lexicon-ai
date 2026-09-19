import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

export async function POST(request) {
  try {
    const { url, title, content } = await request.json();

    if (!url || !title || !content) {
      return NextResponse.json(
        { error: "Missing required fields: url, title, content" },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      return NextResponse.json(
        { error: "Server missing environment configuration (.env.local)" },
        { status: 500 }
      );
    }

    // 1. Generate 768-dimensional vector embedding
    const genAI = new GoogleGenerativeAI(geminiKey);
    const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
    const embedResult = await embeddingModel.embedContent({
      content: { parts: [{ text: `${title}\n\n${content}` }] },
      outputDimensionality: 768,
    });
    const embedding = embedResult.embedding.values;

    // 2. Upsert document into Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("documents")
      .upsert(
        { url, title, content, embedding },
        { onConflict: "url" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err) {
    console.error("API /save error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
