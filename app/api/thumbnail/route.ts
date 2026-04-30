import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/thumbnail?url=<instagram-reel-url>
 *
 * Why this exists:
 *  Instagram CDN thumbnail URLs (stored in the DB from oEmbed/OG scraping)
 *  expire after ~24 hours. This route fetches a fresh og:image from Instagram
 *  server-side on every request, then proxies the actual image bytes back to
 *  the browser. Vercel's CDN + the Cache-Control header mean Instagram is only
 *  hit once per reel URL, not on every page load.
 */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function getFreshOgImage(reelUrl: string): Promise<string | null> {
  try {
    const res = await fetch(reelUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      // Next.js data cache — revalidate every 4 hours on the server
      // so repeated calls to this route don't hammer Instagram
      next: { revalidate: 14400 },
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Try og:image first, then twitter:image as fallback
    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1] ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)?.[1] ||
      null;

    // Decode HTML entities in the URL (&amp; → &)
    return ogImage ? ogImage.replace(/&amp;/g, "&") : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const reelUrl = req.nextUrl.searchParams.get("url");

  if (!reelUrl) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  try {
    const imageUrl = await getFreshOgImage(reelUrl);

    if (!imageUrl) {
      return new NextResponse("Could not fetch thumbnail", { status: 404 });
    }

    // Fetch the actual image bytes server-side — this bypasses any CORS
    // restrictions the browser would face hitting Instagram CDN directly
    const imgRes = await fetch(imageUrl, {
      headers: {
        Referer: "https://www.instagram.com/",
        "User-Agent": BROWSER_UA,
      },
    });

    if (!imgRes.ok) {
      return new NextResponse("Image fetch failed", { status: 502 });
    }

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Browser caches for 1 hour, CDN (Vercel) caches for 24 hours
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("Internal error", { status: 500 });
  }
}
