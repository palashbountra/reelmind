"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { X, Wand2, Tag, Plus, Check, Loader2, Sparkles } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { updateReel } from "@/lib/db/reels";
import { getAllCategories, saveCustomCategories, loadCustomCategories } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { CustomCategory } from "@/lib/types";
import toast from "react-hot-toast";

interface AutoOrganiserModalProps {
  open: boolean;
  onClose: () => void;
}

export function AutoOrganiserModal({ open, onClose }: AutoOrganiserModalProps) {
  const { reels, updateReel: storeUpdateReel, bumpSettingsVersion } = useAppStore();

  const [buzzwords, setBuzzwords] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryEmoji, setCategoryEmoji] = useState("🏷️");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setBuzzwords("");
      setCategoryName("");
      setCategoryEmoji("🏷️");
      setDone(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Parse buzzwords into an array of lowercase strings
  const parsedWords = useMemo(() => {
    return buzzwords
      .split(/[,\n]+/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);
  }, [buzzwords]);

  // Find reels that match ANY of the buzzwords
  const matchingReels = useMemo(() => {
    if (parsedWords.length === 0) return [];
    return reels.filter((r) => {
      const haystack = [
        r.title,
        r.description ?? "",
        r.ai_summary ?? "",
        ...(r.tags ?? []),
        ...(r.ai_ideas ?? []),
        ...(r.ai_action_items ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return parsedWords.some((word) => haystack.includes(word));
    });
  }, [reels, parsedWords]);

  async function handleCreate() {
    if (parsedWords.length === 0) {
      toast.error("Enter at least one buzzword");
      return;
    }
    if (!categoryName.trim()) {
      toast.error("Enter a category name");
      return;
    }
    if (matchingReels.length === 0) {
      toast.error("No reels matched — try different keywords");
      return;
    }

    setSaving(true);
    try {
      // 1. Create the category if it doesn't already exist
      const id = categoryName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `auto-${Date.now()}`;

      const existing = getAllCategories();
      const alreadyExists = existing.some((c) => c.id === id);

      if (!alreadyExists) {
        const COLORS = [
          "bg-rose-500/20 text-rose-300 border-rose-500/30",
          "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
          "bg-orange-500/20 text-orange-300 border-orange-500/30",
          "bg-pink-500/20 text-pink-300 border-pink-500/30",
          "bg-teal-500/20 text-teal-300 border-teal-500/30",
          "bg-violet-500/20 text-violet-300 border-violet-500/30",
        ];
        const custom = loadCustomCategories();
        const newCat: CustomCategory = {
          id,
          label: categoryName.trim(),
          emoji: categoryEmoji,
          color: COLORS[custom.length % COLORS.length],
          isBuiltin: false,
        };
        saveCustomCategories([...custom, newCat]);
        bumpSettingsVersion(); // makes sidebar re-read categories
      }

      // 2. Add the category id to each matching reel's extra_categories
      await Promise.all(
        matchingReels.map(async (reel) => {
          const currentExtra = reel.extra_categories ?? [];
          if (currentExtra.includes(id)) return; // already there
          const updated = await updateReel(reel.id, {
            extra_categories: [...currentExtra, id],
          });
          storeUpdateReel(reel.id, { extra_categories: updated.extra_categories });
        })
      );

      setDone(true);
      toast.success(
        `Category "${categoryName.trim()}" created and ${matchingReels.length} reel${matchingReels.length !== 1 ? "s" : ""} assigned!`
      );
      setTimeout(onClose, 1200);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Wand2 size={15} className="text-violet-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Auto-Organiser</h2>
              <p className="text-xs text-gray-500">Scan reels by keywords → create category</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-surface-hover transition-all"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Buzzwords input */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
              <Tag size={11} />
              Keywords / buzzwords
            </label>
            <textarea
              ref={inputRef}
              value={buzzwords}
              onChange={(e) => setBuzzwords(e.target.value)}
              placeholder={"e.g. productivity, morning routine, habits\n(one per line or comma-separated)"}
              rows={3}
              className="w-full px-3 py-2.5 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 transition-all resize-none"
            />
            <p className="text-xs text-gray-600">
              Scans reel titles, descriptions, tags, AI summaries and ideas
            </p>
          </div>

          {/* Match preview */}
          {parsedWords.length > 0 && (
            <div className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border",
              matchingReels.length > 0
                ? "bg-brand-500/10 border-brand-500/30"
                : "bg-surface-hover border-surface-border"
            )}>
              {matchingReels.length > 0 ? (
                <>
                  <Sparkles size={14} className="text-brand-400 shrink-0" />
                  <span className="text-sm text-white">
                    <span className="font-semibold text-brand-300">{matchingReels.length}</span>
                    {" "}reel{matchingReels.length !== 1 ? "s" : ""} matched
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {parsedWords.length} keyword{parsedWords.length !== 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-500">No reels matched — try different keywords</span>
              )}
            </div>
          )}

          {/* Matched reel preview (up to 5) */}
          {matchingReels.length > 0 && (
            <div className="space-y-1 max-h-28 overflow-y-auto">
              {matchingReels.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-surface-hover">
                  <span className="text-xs text-gray-400 truncate flex-1">{r.title}</span>
                </div>
              ))}
              {matchingReels.length > 5 && (
                <p className="text-xs text-gray-600 px-2">
                  +{matchingReels.length - 5} more reels…
                </p>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-surface-border" />

          {/* Category naming */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">New category name</label>
            <div className="flex gap-2">
              <input
                value={categoryEmoji}
                onChange={(e) => setCategoryEmoji(e.target.value)}
                className="w-10 text-center px-1 py-2 bg-surface-hover border border-surface-border rounded-xl text-sm outline-none"
                maxLength={2}
                placeholder="🏷️"
              />
              <input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. Morning Routines"
                className="flex-1 px-3 py-2 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 transition-all"
              />
            </div>
            <p className="text-xs text-gray-600">
              Reels are added to this category non-destructively — their primary category stays the same.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-border flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 rounded-xl hover:bg-surface-hover transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || done || parsedWords.length === 0 || !categoryName.trim() || matchingReels.length === 0}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all",
              done
                ? "bg-green-500/20 border border-green-500/30 text-green-300"
                : "bg-gradient-to-r from-brand-500 to-violet-600 text-white hover:from-brand-400 hover:to-violet-500 shadow-lg shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {saving ? (
              <><Loader2 size={14} className="animate-spin" /> Creating…</>
            ) : done ? (
              <><Check size={14} /> Done!</>
            ) : (
              <><Plus size={14} /> Create &amp; Assign {matchingReels.length > 0 ? `(${matchingReels.length})` : ""}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
