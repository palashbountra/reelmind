export interface ReelMetadata {
  title: string;
  description: string;
  thumbnail_url: string | null;
  author_name: string;
  author_url: string;
  url: string;
}

export async function fetchReelMetadata(
  url: string
): Promise<ReelMetadata | null> {
  try {
    // Instagram's oEmbed endpoint (no auth required for basic data)
    const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&maxwidth=600&fields=title,author_name,thumbnail_url,html`;

    // Note: The public oEmbed endpoint works without auth for public posts
    // but may require an app token for some reels. We fallback gracefully.
    const res = await fetch(oembedUrl, { next: { revalidate: 3600 } });

    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || extractTitleFromUrl(url),
        description: data.title || "",
        thumbnail_url: data.thumbnail_url || null,
        author_name: data.author_name || "Instagram",
        author_url: `https://instagram.com/${data.author_name || ""}`,
        url,
      };
    }
  } catch {
    // Silent fallback
  }

  // Fallback: extract basic info from URL
  return {
    title: extractTitleFromUrl(url),
    description: "",
    thumbnail_url: null,
    author_name: "Instagram",
    author_url: "https://instagram.com",
    url,
  };
}

function extractTitleFromUrl(url: string): string {
  const match = url.match(/instagram\.com\/(?:reels?|p|tv)\/([A-Za-z0-9_-]+)/);
  if (match) return `Instagram Reel · ${match[1]}`;
  return "Instagram Reel";
}

// Alternative: Use the public embed endpoint to scrape OG tags
export async function fetchOpenGraphData(url: string): Promise<{
  title: string;
  description: string;
  image: string | null;
}> {
  // This runs server-side only
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      next: { revalidate: 3600 },
    });

    const html = await res.text();

    const title =
      html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
      html.match(/<title>([^<]+)<\/title>/)?.[1] ||
      "Instagram Reel";

    const description =
      html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] ||
      "";

    const image =
      html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] || null;

    return { title, description, image };
  } catch {
    return { title: "Instagram Reel", description: "", image: null };
  }
}
