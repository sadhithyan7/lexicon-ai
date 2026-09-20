import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL query parameter is required" },
        { status: 400 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server missing environment configuration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, url, created_at")
      .eq("url", url.trim())
      .maybeSingle();

    if (error) {
      console.error("Supabase check error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data) {
      return NextResponse.json({
        saved: true,
        id: data.id,
        title: data.title,
        url: data.url,
      });
    }

    return NextResponse.json({
      saved: false,
      id: null,
    });
  } catch (err) {
    console.error("API /save/check error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
