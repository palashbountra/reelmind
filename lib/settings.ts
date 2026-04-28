/**
 * Persistent settings — syncs to Supabase so customisations survive
 * across browsers, devices, and deployments.
 * localStorage is used as a synchronous read cache.
 */

import { createClient } from "@/lib/supabase/client";

// ── Generic get/set ───────────────────────────────────────────────────────────

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (createClient().from("user_settings") as any)
      .select("value")
      .eq("key", key)
      .single();
    if (data?.value !== undefined) {
      // Update local cache
      if (typeof window !== "undefined") {
        localStorage.setItem(`reelmind_${key}`, JSON.stringify(data.value));
      }
      return data.value as T;
    }
  } catch {}
  return fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  // Write to localStorage immediately (sync)
  if (typeof window !== "undefined") {
    localStorage.setItem(`reelmind_${key}`, JSON.stringify(value));
  }
  // Write to Supabase in background
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createClient().from("user_settings") as any).upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch {}
}

/** Fast synchronous read from localStorage cache (for initial renders). */
export function getSettingSync<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`reelmind_${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
