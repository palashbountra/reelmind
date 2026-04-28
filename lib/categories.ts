import type { CustomCategory } from "./types";

const COLOR_PALETTE = [
  "bg-rose-500/20 text-rose-300 border-rose-500/30",
  "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "bg-lime-500/20 text-lime-300 border-lime-500/30",
  "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "bg-sky-500/20 text-sky-300 border-sky-500/30",
  "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "bg-pink-500/20 text-pink-300 border-pink-500/30",
];

// Original built-in defaults — the source of truth for IDs and colors
export const BUILTIN_CATEGORY_LIST: CustomCategory[] = [
  { id: "productivity", label: "Productivity", emoji: "⚡", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", isBuiltin: true },
  { id: "fitness",      label: "Fitness",      emoji: "💪", color: "bg-red-500/20 text-red-300 border-red-500/30",          isBuiltin: true },
  { id: "coding",       label: "Coding",       emoji: "💻", color: "bg-blue-500/20 text-blue-300 border-blue-500/30",       isBuiltin: true },
  { id: "design",       label: "Design",       emoji: "🎨", color: "bg-pink-500/20 text-pink-300 border-pink-500/30",       isBuiltin: true },
  { id: "business",     label: "Business",     emoji: "📈", color: "bg-green-500/20 text-green-300 border-green-500/30",    isBuiltin: true },
  { id: "cooking",      label: "Cooking",      emoji: "🍳", color: "bg-orange-500/20 text-orange-300 border-orange-500/30", isBuiltin: true },
  { id: "travel",       label: "Travel",       emoji: "✈️", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",       isBuiltin: true },
  { id: "mindset",      label: "Mindset",      emoji: "🧠", color: "bg-violet-500/20 text-violet-300 border-violet-500/30", isBuiltin: true },
  { id: "finance",      label: "Finance",      emoji: "💰", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", isBuiltin: true },
  { id: "creative",     label: "Creative",     emoji: "✨", color: "bg-purple-500/20 text-purple-300 border-purple-500/30",  isBuiltin: true },
  { id: "learning",     label: "Learning",     emoji: "📚", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", isBuiltin: true },
  { id: "other",        label: "Other",        emoji: "🗂️", color: "bg-gray-500/20 text-gray-300 border-gray-500/30",      isBuiltin: true },
];

const CUSTOM_KEY   = "reelmind_custom_categories";
const OVERRIDE_KEY = "reelmind_builtin_overrides"; // stores label/emoji edits to built-ins

// ── Custom categories (user-created) ──────────────────────────────────────────

export function loadCustomCategories(): CustomCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as CustomCategory[]) : [];
  } catch { return []; }
}

export function saveCustomCategories(cats: CustomCategory[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(cats));
}

// ── Built-in overrides (label + emoji only) ───────────────────────────────────

type BuiltinOverrides = Record<string, { label: string; emoji: string }>;

export function loadBuiltinOverrides(): BuiltinOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as BuiltinOverrides) : {};
  } catch { return {}; }
}

export function saveBuiltinOverrides(overrides: BuiltinOverrides): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
}

// ── Core API ──────────────────────────────────────────────────────────────────

/** Returns all categories (built-ins with any user edits applied, then custom ones). */
export function getAllCategories(): CustomCategory[] {
  const overrides = loadBuiltinOverrides();
  const custom    = loadCustomCategories();

  const builtins = BUILTIN_CATEGORY_LIST.map((cat) => ({
    ...cat,
    ...(overrides[cat.id] ?? {}), // apply label/emoji override if present
  }));

  return [...builtins, ...custom];
}

/** Looks up a category by ID, falling back to a sensible default for unknown IDs. */
export function getCategoryById(id: string): CustomCategory {
  const all = getAllCategories();
  return (
    all.find((c) => c.id === id) ?? {
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      emoji: "🏷️",
      color: "bg-gray-500/20 text-gray-300 border-gray-500/30",
      isBuiltin: false,
    }
  );
}

/** Saves an edit to a built-in category's label/emoji. */
export function updateBuiltinCategory(id: string, label: string, emoji: string): void {
  const overrides = loadBuiltinOverrides();
  overrides[id] = { label, emoji };
  saveBuiltinOverrides(overrides);
}

/** Resets a single built-in category back to its original label/emoji. */
export function resetBuiltinCategory(id: string): void {
  const overrides = loadBuiltinOverrides();
  delete overrides[id];
  saveBuiltinOverrides(overrides);
}

/** Returns true if a built-in category has been customised. */
export function isBuiltinModified(id: string): boolean {
  const overrides = loadBuiltinOverrides();
  return !!overrides[id];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function createCategory(label: string, emoji: string, existingCount: number): CustomCategory {
  const id =
    label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    `custom-${Date.now()}`;
  const color = COLOR_PALETTE[existingCount % COLOR_PALETTE.length];
  return { id, label: label.trim(), emoji, color, isBuiltin: false };
}

export function getNextColor(index: number): string {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
}
