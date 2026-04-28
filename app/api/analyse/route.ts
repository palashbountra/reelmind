import { NextRequest, NextResponse } from "next/server";
import { analyseReel } from "@/lib/ai/groq";

export async function POST(req: NextRequest) {
  const { title, description } = await req.json();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured. Add it to your .env.local file." },
      { status: 503 }
    );
  }

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const analysis = await analyseReel(
      title,
      description || title,
      apiKey
    );
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("AI analysis error:", err);
    return NextResponse.json(
      { error: "AI analysis failed. Check your GROQ_API_KEY." },
      { status: 500 }
    );
  }
}
