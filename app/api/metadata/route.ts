import { NextRequest, NextResponse } from "next/server";
import { fetchOpenGraphData } from "@/lib/instagram/oembed";
import { isValidInstagramUrl } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || !isValidInstagramUrl(url)) {
    return NextResponse.json(
      { error: "Invalid Instagram URL" },
      { status: 400 }
    );
  }

  try {
    const og = await fetchOpenGraphData(url);

    return NextResponse.json({
      title: og.title,
      description: og.description,
      thumbnail_url: og.image,
      author_name: "Instagram",
      author_url: "https://instagram.com",
      url,
    });
  } catch (err) {
    console.error("Metadata fetch error:", err);
    // Return graceful fallback — don't block the user
    return NextResponse.json({
      title: "Instagram Reel",
      description: "",
      thumbnail_url: null,
      author_name: "Instagram",
      author_url: "https://instagram.com",
      url,
    });
  }
}
