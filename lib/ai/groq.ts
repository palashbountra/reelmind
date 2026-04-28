import type { AIAnalysis, ReelCategory } from "@/lib/types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile"; // Current free Groq model (replaces decommissioned llama3-8b-8192)

async function callGroq(
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<string> {
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const json = await res.json();
  return json.choices[0]?.message?.content ?? "";
}

export async function analyseReel(
  title: string,
  description: string,
  apiKey: string
): Promise<AIAnalysis> {
  const prompt = `You are an intelligent personal assistant helping someone extract maximum value from a saved Instagram reel.

Given this reel:
Title: "${title}"
Description: "${description}"

Respond ONLY with valid JSON in exactly this format (no markdown, no extra text):
{
  "summary": "2-3 sentence summary of what this reel is about and why it's valuable",
  "ideas": ["idea 1", "idea 2", "idea 3"],
  "action_items": ["specific action 1", "specific action 2", "specific action 3"],
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "category": "one of: productivity|fitness|coding|design|business|cooking|travel|mindset|finance|creative|learning|other"
}

Make ideas creative and personal — how can the viewer actually USE this in their life or workflow?
Make action items specific, time-bound, and actionable (e.g. "Try this recipe this Sunday" not just "Cook this").`;

  const raw = await callGroq(
    [{ role: "user", content: prompt }],
    apiKey
  );

  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary ?? "",
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas.slice(0, 5) : [],
      action_items: Array.isArray(parsed.action_items)
        ? parsed.action_items.slice(0, 5)
        : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [],
      category: (parsed.category as ReelCategory) ?? "other",
    };
  } catch {
    // Fallback if JSON parsing fails
    return {
      summary: raw.slice(0, 200),
      ideas: [],
      action_items: [],
      tags: [],
      category: "other",
    };
  }
}

export async function generateIdeasFromMultipleReels(
  reels: { title: string; description: string; summary?: string }[],
  prompt: string,
  apiKey: string
): Promise<string> {
  const reelContext = reels
    .map(
      (r, i) =>
        `Reel ${i + 1}: "${r.title}"\n${r.summary || r.description}`
    )
    .join("\n\n");

  const systemPrompt = `You are a creative thinking partner helping someone synthesise ideas from their saved Instagram reels. Be insightful, creative, and actionable.`;

  const userMessage = `Here are some reels I've saved:\n\n${reelContext}\n\nMy question/prompt: ${prompt}\n\nHelp me think through this and generate useful ideas, connections, or next steps.`;

  return callGroq(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    apiKey
  );
}

export async function generateSmartReminder(
  reelTitle: string,
  actionItems: string[],
  apiKey: string
): Promise<string> {
  const prompt = `Write a short, motivating reminder message (2-3 sentences max) for someone who saved a reel about "${reelTitle}".
Action items they wanted to do: ${actionItems.join(", ")}.
Make it personal, encouraging, and specific. No fluff.`;

  return callGroq([{ role: "user", content: prompt }], apiKey);
}
