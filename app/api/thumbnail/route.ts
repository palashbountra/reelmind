import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/thumbnail?url=<instagram-reel-url>&cached=<stored-cdn-url>
 *
 * Strategies tried in order:
 *  0. Proxy the `cached` CDN URL from the DB  (works for reels added < ~24 h ago)
 *  1. Instagram /p/{shortcode}/media/?size=l  (redirects straight to CDN image)
 *  2. Instagram oEmbed (legacy public endpoint)
 *  3. Embed page: /p/{shortcode}/embed/captioned/
 *  4. Embed page: /p/{shortcode}/embed/
 */

const UA_DESKTOP =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const UA_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

function extractShortcode(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/** Decode Unicode escapes and HTML entities inside a URL string */
function cleanUrl(raw: string): string {
  return raw
    .replace(/\\u0026/g, "&")
    .replace(/\\u002F/g, "/")
    .replace(/&amp;/g, "&")
    .replace(/\\/g, "");
}

/** Pull the first Instagram CDN image URL out of arbitrary HTML/JSON text */
function extractCdnUrl(text: string): string | null {
  const patterns = [
    // video poster attribute
    /poster=["']?(https:\/\/[^"'\s>]+(?:cdninstagram|fbcdn)\.com[^"'\s>]+\.jpg[^"'\s>]*)["']?/i,
    // oEmbed thumbnail_url field
    /"thumbnail_url"\s*:\s*"([^"]+)"/,
    // generic img src pointing at CDN
    /<img[^>]+src=["'](https:\/\/[^"']+(?:cdninstagram|fbcdn)\.com[^"']+\.jpg[^"']*)["']/i,
    // JSON field "src" or "url" with CDN domain
    /"(?:src|url|image_url|display_url|thumbnail_src)"\s*:\s*"(https:\\?\/\\?\/[^"]+(?:cdninstagram|fbcdn)\.com[^"]+\.jpg[^"]*)"/i,
    // og:image meta (two orderings)
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ];

  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return cleanUrl(m[1]);
  }
  return null;
}

async function fetchWithTimeout(
  url: string,
  opts: RequestInit & { timeoutMs?: number } = {}
): Promise<Response | null> {
  const { timeoutMs = 8000, ...fetchOpts } = opts;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...fetchOpts, signal: ctrl.signal });
    clearTimeout(timer);
    return res;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Strategy 0 – proxy a URL we already have (cached in DB) */
async function tryCachedUrl(cdnUrl: string): Promise<NextResponse | null> {
  const res = await fetchWithTimeout(cdnUrl, {
    headers: {
      Referer: "https://www.instagram.com/",
      "User-Agent": UA_DESKTOP,
    },
    timeoutMs: 6000,
  });
  if (!res || !res.ok) return null;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.startsWith("image/")) return null;
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "public, max-age=7200, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}

/** Strategy 1 – /media/?size=l redirect (no auth required, gives image directly) */
async function tryMediaEndpoint(shortcode: string): Promise<NextResponse | null> {
  const mediaUrl = `https://www.instagram.com/p/${shortcode}/media/?size=l`;
  const res = await fetchWithTimeout(mediaUrl, {
    headers: {
      "User-Agent": UA_MOBILE,
      Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: "https://www.instagram.com/",
    },
    redirect: "follow",
    timeoutMs: 8000,
  });
  if (!res || !res.ok) return null;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.startsWith("image/")) return null;
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "public, max-age=7200, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}

/** Strategy 2 – legacy public oEmbed */
async function tryOembed(shortcode: string): Promise<string | null> {
  const oembed = `https://api.instagram.com/oembed/?url=https://www.instagram.com/p/${shortcode}/&omitscript=true`;
  const res = await fetchWithTimeout(oembed, {
    headers: { "User-Agent": UA_DESKTOP },
    next: { revalidate: 3600 },
  } as RequestInit);
  if (!res || !res.ok) return null;
  try {
    const data = await res.json();
    return data.thumbnail_url ? cleanUrl(data.thumbnail_url) : null;
  } catch {
    return null;
  }
}

/** Strategies 3 & 4 – scrape embed pages */
async function tryEmbedPage(shortcode: string, variant = ""): Promise<string | null> {
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/${variant}`;
  // Try desktop UA first, then mobile UA
  for (const ua of [UA_DESKTOP, UA_MOBILE]) {
    const res = await fetchWithTimeout(embedUrl, {
      headers: {
        "User-Agent": ua,
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.google.com/",
        "Cache-Control": "no-cache",
      },
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res || !res.ok) continue;
    const html = await res.text();
    const found = extractCdnUrl(html);
    if (found) return found;
  }
  return null;
}

async function proxyImage(cdnUrl: string): Promise<NextResponse | null> {
  const res = await fetchWithTimeout(cdnUrl, {
    headers: {
      Referer: "https://www.instagram.com/",
      "User-Agent": UA_DESKTOP,
    },
    timeoutMs: 8000,
  });
  if (!res || !res.ok) return null;
  const buffer = await res.arrayBuffer();
  const ct = res.headers.get("content-type") ?? "image/jpeg";
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "public, max-age=7200, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}

export async function GET(req: NextRequest) {
  const reelUrl = req.nextUrl.searchParams.get("url");
  const cachedUrl = req.nextUrl.searchParams.get("cached");

  if (!reelUrl) return new NextResponse("Missing url param", { status: 400 });

  const shortcode = extractShortcode(reelUrl);
  if (!shortcode) return new NextResponse("Cannot parse shortcode", { status: 400 });

  // ── Strategy 0: cached CDN URL from DB (works for recently-added reels) ──
  if (cachedUrl) {
    const proxied = await tryCachedUrl(cachedUrl);
    if (proxied) return proxied;
  }

  // ── Strategy 1: /media/?size=l redirect ──
  const mediaResp = await tryMediaEndpoint(shortcode);
  if (mediaResp) return mediaResp;

  // ── Strategy 2: oEmbed ──
  const oembedUrl = await tryOembed(shortcode);
  if (oembedUrl) {
    const proxied = await proxyImage(oembedUrl);
    if (proxied) return proxied;
  }

  // ── Strategy 3: captioned embed page ──
  const captionedUrl = await tryEmbedPage(shortcode, "captioned/");
  if (captionedUrl) {
    const proxied = await proxyImage(captionedUrl);
    if (proxied) return proxied;
  }

  // ── Strategy 4: plain embed page ──
  const embedUrl = await tryEmbedPage(shortcode);
  if (embedUrl) {
    const proxied = await proxyImage(embedUrl);
    if (proxied) return proxied;
  }

  return new NextResponse("Thumbnail unavailable", { status: 404 });
}
