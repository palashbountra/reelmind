/**
 * Persistent settings — syncs to Supabase so customisations survive
 * across browsers, devices, and deployments.
 * localStorage is used as a synchronous read cache.
 */

import { createClient } from "@/lib/supabase/client";

// The EXACT localStorage keys that categories.ts / projects.ts read from.
// These are also the Supabase user_settings `key` column values.
const HYDRATION_KEYS = [
  "reelmind_custom_categories",
  "reelmind_builtin_overrides",
  "reelmind_deleted_builtins",
  "reelmind_custom_projects",
  "reelmind_deleted_projects",
  "reelmind_project_plans",
] as const;

// ── Generic get/set ───────────────────────────────────────────────────────────

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (createClient().from("user_settings") as any)
      .select("value")
      .eq("key", key)
      .single();
    if (data?.value !== undefined) {
      if (typeof window !== "undefined") {
        // Write to the exact key (no prefix mangling)
        localStorage.setItem(key, JSON.stringify(data.value));
      }
      return data.value as T;
    }
  } catch {}
  return fallback;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  // Write to localStorage immediately using the exact key
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
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

/** Fast synchronous read from localStorage cache. */
export function getSettingSync<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Pull all known settings from Supabase and populate the exact localStorage
 * keys that categories.ts / projects.ts read from.
 * Call once on app mount so customisations survive new deployments.
 */
export async function hydrateSettings(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (createClient().from("user_settings") as any)
      .select("key, value")
      .in("key", HYDRATION_KEYS);

    if (Array.isArray(data)) {
      for (const row of data as { key: string; value: unknown }[]) {
        if (row.key && row.value !== undefined && row.value !== null) {
          localStorage.setItem(row.key, JSON.stringify(row.value));
        }
      }
    }
  } catch {
    // Silently ignore — localStorage already has last-used values as fallback
  }
}
