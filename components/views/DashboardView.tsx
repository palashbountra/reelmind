"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Grid3X3, List, Plus, CheckSquare, X, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getReels, deleteReel as dbDeleteReel } from "@/lib/db/reels";
import { ReelCard } from "@/components/reels/ReelCard";
import { ReelDetailPanel } from "@/components/reels/ReelDetailPanel";
import { STATUS_CONFIG, cn } from "@/lib/utils";
import { getCategoryById } from "@/lib/categories";
import type { ReelStatus } from "@/lib/types";
import toast from "react-hot-toast";

export function DashboardView() {
  const {
    reels, setReels,
    filters, setFilters,
    selectedReelId, setSelectedReelId,
    setAddReelOpen,
    removeReel,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [gridMode, setGridMode] = useState<"grid" | "list">("grid");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const toggleId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} reel${selectedIds.size !== 1 ? "s" : ""}? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => dbDeleteReel(id)));
      Array.from(selectedIds).forEach((id) => removeReel(id));
      toast.success(`Deleted ${selectedIds.size} reel${selectedIds.size !== 1 ? "s" : ""}`);
      exitSelectMode();
    } catch {
      toast.error("Failed to delete some reels");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    getReels()
      .then(setReels)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setReels]);

  // Client-side filtering on the already-loaded reels
  const filtered = useMemo(() => {
    let list = [...reels];

    if (filters.category && filters.category !== "all") {
      list = list.filter((r) => r.category === filters.category);
    }
    if (filters.status && filters.status !== "all") {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.favourites) {
      list = list.filter((r) => r.is_favourite);
    }
    if (filters.project && filters.project !== "all") {
      list = list.filter((r) => (r.project_tags ?? []).includes(filters.project as string));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false) ||
          (r.ai_summary?.toLowerCase().includes(q) ?? false) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    switch (filters.sort) {
      case "oldest":
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "title":
        list.sort((a, b) => a.title.trim().toLowerCase().localeCompare(b.title.trim().toLowerCase()));
        break;
      case "category":
        list.sort((a, b) => a.category.toLowerCase().localeCompare(b.category.toLowerCase()));
        break;
      default: // newest
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [reels, filters]);

  const selectedReel = reels.find((r) => r.id === selectedReelId) ?? null;

  // Stats for header
  const stats = {
    total: reels.length,
    unread: reels.filter((r) => r.status === "unread").length,
    inProgress: reels.filter((r) => r.status === "in_progress").length,
    done: reels.filter((r) => r.status === "done").length,
    aiAnalysed: reels.filter((r) => r.ai_summary).length,
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className={cn("flex-1 flex flex-col overflow-hidden relative", selectedReel && "hidden md:flex")}>
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-surface-border space-y-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                {selectMode
                  ? selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : "Select reels"
                  : filters.favourites
                  ? "⭐ Favourites"
                  : filters.category && filters.category !== "all"
                  ? `${getCategoryById(filters.category).emoji} ${getCategoryById(filters.category).label}`
                  : filters.status && filters.status !== "all"
                  ? `${STATUS_CONFIG[filters.status as ReelStatus].label} Reels`
                  : "All Reels"}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectMode
                  ? "Tap reels to select"
                  : `${filtered.length} reel${filtered.length !== 1 ? "s" : ""}${filters.search ? ` matching "${filters.search}"` : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectMode ? (
                <button
                  onClick={exitSelectMode}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-hover border border-surface-border text-white text-sm font-medium rounded-xl hover:bg-surface-card transition-all"
                >
                  <X size={14} /> Cancel
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { setSelectMode(true); setSelectedReelId(null); }}
                    className="flex items-center gap-2 px-3 py-2 bg-surface-hover border border-surface-border text-gray-400 text-sm font-medium rounded-xl hover:text-white hover:border-brand-500/40 transition-all"
                  >
                    <CheckSquare size={14} /> Select
                  </button>
                  <button
                    onClick={() => setAddReelOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-medium rounded-xl hover:from-brand-400 hover:to-violet-500 transition-all shadow-lg shadow-brand-500/20"
                  >
                    <Plus size={15} /> Add Reel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          {reels.length > 0 && (
            <div className="flex gap-3">
              {[
                { label: "Total", value: stats.total, color: "text-white" },
                { label: "Unread", value: stats.unread, color: "text-slate-400" },
                { label: "In Progress", value: stats.inProgress, color: "text-blue-400" },
                { label: "Done", value: stats.done, color: "text-green-400" },
                { label: "AI Analysed", value: stats.aiAnalysed, color: "text-brand-400" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center px-3 py-1.5 bg-surface-hover border border-surface-border rounded-xl min-w-[60px]">
                  <span className={cn("text-lg font-bold tabular-nums", s.color)}>{s.value}</span>
                  <span className="text-xs text-gray-600">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Search + controls */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                placeholder="Search reels, tags, summaries..."
                value={filters.search ?? ""}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="w-full pl-9 pr-4 py-2 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 transition-all"
              />
            </div>

            {/* Sort */}
            <select
              value={filters.sort ?? "newest"}
              onChange={(e) => setFilters({ sort: e.target.value as typeof filters.sort })}
              className="px-3 py-2 bg-surface-hover border border-surface-border rounded-xl text-xs text-gray-400 outline-none cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">A → Z</option>
              <option value="category">Category</option>
            </select>

            {/* Grid/List toggle */}
            <div className="flex border border-surface-border rounded-xl overflow-hidden">
              <button
                onClick={() => setGridMode("grid")}
                className={cn("p-2 transition-all", gridMode === "grid" ? "bg-surface-hover text-white" : "text-gray-600 hover:text-gray-400")}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setGridMode("list")}
                className={cn("p-2 transition-all", gridMode === "list" ? "bg-surface-hover text-white" : "text-gray-600 hover:text-gray-400")}
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Reel grid */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className={cn(
              gridMode === "grid"
                ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "flex flex-col gap-3"
            )}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-[9/16] max-h-52 bg-surface-hover" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-surface-hover rounded-full w-3/4" />
                    <div className="h-3 bg-surface-hover rounded-full w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              hasFilters={!!(filters.search || (filters.category && filters.category !== "all") || (filters.status && filters.status !== "all") || filters.favourites)}
              onAdd={() => setAddReelOpen(true)}
              onReset={() => setFilters({ search: "", category: "all", status: "all", favourites: false })}
            />
          ) : (
            <div className={cn(
              gridMode === "grid"
                ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "flex flex-col gap-3"
            )}>
              {filtered.map((reel) => (
                gridMode === "grid" ? (
                  <ReelCard
                    key={reel.id}
                    reel={reel}
                    onClick={() => setSelectedReelId(reel.id)}
                    selectMode={selectMode}
                    isSelected={selectedIds.has(reel.id)}
                    onSelect={() => toggleId(reel.id)}
                  />
                ) : (
                  <ReelListRow
                    key={reel.id}
                    reel={reel}
                    onClick={selectMode ? () => toggleId(reel.id) : () => setSelectedReelId(reel.id)}
                    isSelected={selectMode ? selectedIds.has(reel.id) : selectedReelId === reel.id}
                  />
                )
              ))}
            </div>
          )}
        </div>
        {/* Bulk delete bottom bar */}
        {selectMode && selectedIds.size > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
            <div className="flex items-center gap-3 px-5 py-3 bg-surface-card border border-surface-border rounded-2xl shadow-2xl shadow-black/50 backdrop-blur-md">
              <span className="text-sm text-white font-medium">
                {selectedIds.size} reel{selectedIds.size !== 1 ? "s" : ""} selected
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
              >
                <Trash2 size={13} />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedReel && (
        <div className="w-full md:w-96 shrink-0 border-l border-surface-border overflow-y-auto">
          <ReelDetailPanel
            reel={selectedReel}
            onClose={() => setSelectedReelId(null)}
          />
        </div>
      )}
    </div>
  );
}

// List row variant
function ReelListRow({ reel, onClick, isSelected }: { reel: import("@/lib/types").Reel; onClick: () => void; isSelected: boolean }) {
  const catConfig = getCategoryById(reel.category);
  const statusConfig = STATUS_CONFIG[reel.status];

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all",
        isSelected
          ? "bg-brand-500/10 border-brand-500/30"
          : "bg-surface-card border-surface-border hover:border-brand-500/20 hover:bg-surface-hover"
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-surface-hover flex items-center justify-center text-xl shrink-0">
        {catConfig.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{reel.title}</p>
        {reel.ai_summary && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{reel.ai_summary}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-xs px-2 py-0.5 rounded-full border", statusConfig.color)}>
          {statusConfig.label}
        </span>
        {reel.is_favourite && <span className="text-yellow-400 text-xs">⭐</span>}
        {reel.ai_summary && <span className="text-brand-400 text-xs">✨</span>}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onAdd, onReset }: { hasFilters: boolean; onAdd: () => void; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-hover border border-surface-border flex items-center justify-center text-3xl mb-4">
        {hasFilters ? <Search size={28} className="text-gray-600" /> : "🎬"}
      </div>
      <h3 className="font-semibold text-white mb-1">
        {hasFilters ? "No reels match your filters" : "No reels yet"}
      </h3>
      <p className="text-sm text-gray-500 mb-4 max-w-xs">
        {hasFilters
          ? "Try adjusting your search or filters"
          : "Start by adding your first saved Instagram reel"}
      </p>
      {hasFilters ? (
        <button onClick={onReset} className="text-sm text-brand-400 hover:text-brand-300 transition-colors">
          Clear filters
        </button>
      ) : (
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-medium rounded-xl"
        >
          <Plus size={15} /> Add your first reel
        </button>
      )}
    </div>
  );
}
