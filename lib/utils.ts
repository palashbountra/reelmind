import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReelStatus } from "./types";
import { getCategoryById, getAllCategories } from "./categories";

export { getCategoryById, getAllCategories };

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function extractReelId(url: string): string | null {
  const patterns = [
    /instagram\.com\/reels?\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isValidInstagramUrl(url: string): boolean {
  // Accepts reels (/reel/), posts (/p/), IGTV (/tv/), and saved collections
  const clean = url.split("?")[0]; // strip query params
  return /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv)\//.test(clean);
}

// Legacy CATEGORY_CONFIG — now delegates to the dynamic system
// Kept for backward compatibility in any component that still imports it
export const CATEGORY_CONFIG = new Proxy({} as Record<string, { label: string; emoji: string; color: string }>, {
  get(_target, key: string) {
    return getCategoryById(key);
  },
});

export const STATUS_CONFIG: Record<
  ReelStatus,
  { label: string; color: string; dot: string }
> = {
  unread:      { label: "Unread",      color: "bg-slate-500/20 text-slate-300 border-slate-500/30", dot: "bg-slate-400" },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-300 border-blue-500/30",   dot: "bg-blue-400" },
  done:        { label: "Done",        color: "bg-green-500/20 text-green-300 border-green-500/30", dot: "bg-green-400" },
  archived:    { label: "Archived",    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",    dot: "bg-gray-500" },
};

// Also kept for any remaining hardcoded usage — delegates dynamically
export const ALL_CATEGORIES = new Proxy([] as string[], {
  get(target, key) {
    if (key === "map" || key === "filter" || key === "forEach" || key === "length" || typeof key === "symbol") {
      const all = getAllCategories().map((c) => c.id);
      return (all as unknown as Record<string | symbol, unknown>)[key];
    }
    const all = getAllCategories();
    if (typeof key === "string" && !isNaN(Number(key))) {
      return all[Number(key)]?.id;
    }
    return ([] as unknown as Record<string | symbol, unknown>)[key];
  },
});
