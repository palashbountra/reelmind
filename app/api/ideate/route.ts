import { NextRequest, NextResponse } from "next/server";
import { generateIdeasFromMultipleReels } from "@/lib/ai/groq";

export async function POST(req: NextRequest) {
  const { reels, prompt } = await req.json();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured." },
      { status: 503 }
    );
  }

  if (!reels?.length || !prompt) {
    return NextResponse.json(
      { error: "Reels and prompt are required" },
      { status: 400 }
    );
  }

  try {
    const ideas = await generateIdeasFromMultipleReels(reels, prompt, apiKey);
    return NextResponse.json({ ideas });
  } catch (err) {
    console.error("Ideation error:", err);
    return NextResponse.json(
      { error: "Ideation failed." },
      { status: 500 }
    );
  }
}
