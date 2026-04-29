"use client";

import Image from "next/image";
import {
  Heart, Sparkles, Calendar, MoreHorizontal, Check,
  Archive, Trash2, FolderOpen, Tag, Play,
} from "lucide-react";
import { useState } from "react";
import type { Reel } from "@/lib/types";
import { STATUS_CONFIG, formatDate, cn } from "@/lib/utils";
import { getCategoryById, getAllCategories } from "@/lib/categories";
import { getAllProjects } from "@/lib/projects";
import { toggleFavourite, updateReel, deleteReel } from "@/lib/db/reels";
import { useAppStore } from "@/lib/store";
import toast from "react-hot-toast";

interface ReelCardProps {
  reel: Reel;
  onClick: () => void;
  onPlay?: () => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function ReelCard({ reel, onClick, onPlay, selectMode, isSelected, onSelect }: ReelCardProps) {
  const { updateReel: storeUpdate, removeReel } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<"category" | "project" | null>(null);
  const [imgError, setImgError] = useState(false);

  const allCategories = getAllCategories();
  const allProjects = getAllProjects();
  const projectTags: string[] = reel.project_tags ?? [];

  // All categories this reel belongs to (primary + extras)
  const allReelCategoryIds = Array.from(
    new Set([reel.category, ...(reel.extra_categories ?? [])].filter(Boolean))
  );
  const allReelCats = allReelCategoryIds.map((id) => getCategoryById(id));
  const primaryCat = getCategoryById(reel.category);
  const statusConfig = STATUS_CONFIG[reel.status];

  function closeMenu() {
    setMenuOpen(false);
    setSubMenu(null);
  }

  async function handleFavourite(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await toggleFavourite(reel.id, reel.is_favourite);
      storeUpdate(reel.id, { is_favourite: !reel.is_favourite });
    } catch {
      toast.error("Failed to update favourite");
    }
  }

  async function handleStatusChange(e: React.MouseEvent, status: Reel["status"]) {
    e.stopPropagation();
    closeMenu();
    try {
      await updateReel(reel.id, { status });
      storeUpdate(reel.id, { status });
      toast.success(`Marked as ${STATUS_CONFIG[status].label}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  // Multi-category toggle: freely add/remove any category
  async function handleCategoryToggle(e: React.MouseEvent, catId: string) {
    e.stopPropagation();
    const currentSet = new Set(allReelCategoryIds);

    if (currentSet.has(catId)) {
      if (currentSet.size <= 1) {
        toast.error("A reel must have at least one category");
        return;
      }
      currentSet.delete(catId);
    } else {
      currentSet.add(catId);
    }

    const newList = Array.from(currentSet);
    // Keep existing primary if still in set, else first item becomes primary
    const newPrimary = currentSet.has(reel.category) ? reel.category : newList[0];
    const newExtra = newList.filter((id) => id !== newPrimary);

    try {
      await updateReel(reel.id, { category: newPrimary, extra_categories: newExtra });
      storeUpdate(reel.id, { category: newPrimary, extra_categories: newExtra });
    } catch {
      toast.error("Failed to update categories");
    }
  }

  async function handleProjectToggle(projectId: string) {
    const current = new Set(projectTags);
    current.has(projectId) ? current.delete(projectId) : current.add(projectId);
    const next = Array.from(current);
    try {
      await updateReel(reel.id, { project_tags: next });
      storeUpdate(reel.id, { project_tags: next });
      const proj = allProjects.find((p) => p.id === projectId);
      toast.success(
        current.has(projectId) ? `Added to ${proj?.label}` : `Removed from ${proj?.label}`
      );
    } catch {
      toast.error("Failed to update project");
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    closeMenu();
    if (!confirm("Delete this reel?")) return;
    try {
      await deleteReel(reel.id);
      removeReel(reel.id);
      toast.success("Reel deleted");
    } catch {
      toast.error("Failed to delete reel");
    }
  }

  return (
    <div
      onClick={selectMode ? onSelect : onClick}
      className={cn(
        "reel-card group relative bg-surface-card border rounded-2xl overflow-hidden",
        "cursor-pointer transition-all duration-200 animate-fade-in",
        selectMode && isSelected
          ? "border-brand-500 ring-2 ring-brand-500/40"
          : selectMode
          ? "border-surface-border hover:border-brand-500/50"
          : "border-surface-border hover:border-brand-500/30",
        reel.status === "done" && !selectMode && "opacity-70"
      )}
    >
      {/* ── Full 9:16 Thumbnail ── */}
      <div className="relative aspect-[9/16] bg-surface-hover overflow-hidden">
        {reel.thumbnail_url && !imgError ? (
          <Image
            src={reel.thumbnail_url}
            alt={reel.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {primaryCat.emoji}
          </div>
        )}

        {/* Gradient overlay — stronger at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

        {/* ── Top-left: all category emojis ── */}
        <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap max-w-[70%]">
          {allReelCats.map((cat) => (
            <span
              key={cat.id}
              className="text-base leading-none drop-shadow-lg"
              title={cat.label}
            >
              {cat.emoji}
            </span>
          ))}
        </div>

        {/* ── Top-right: favourite + context menu ── */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={handleFavourite}
            className={cn(
              "p-1.5 rounded-full backdrop-blur-sm transition-all",
              reel.is_favourite
                ? "text-yellow-400 bg-yellow-400/20"
                : "text-white/60 bg-black/20 hover:text-yellow-400 opacity-0 group-hover:opacity-100"
            )}
          >
            <Heart size={13} fill={reel.is_favourite ? "currentColor" : "none"} />
          </button>

          {/* Context menu button */}
          {!selectMode && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setSubMenu(null); }}
                className="p-1.5 rounded-full bg-black/30 backdrop-blur-sm text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={13} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-8 z-50 bg-surface-card border border-surface-border rounded-xl shadow-xl w-52 py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Status changes */}
                  <button onClick={(e) => handleStatusChange(e, "in_progress")} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-hover flex items-center gap-2">
                    🔵 Mark In Progress
                  </button>
                  <button onClick={(e) => handleStatusChange(e, "done")} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-hover flex items-center gap-2">
                    ✅ Mark Done
                  </button>
                  <button onClick={(e) => handleStatusChange(e, "archived")} className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-hover flex items-center gap-2">
                    <Archive size={11} /> Archive
                  </button>

                  <div className="my-1 border-t border-surface-border" />

                  {/* Multi-category picker */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSubMenu(subMenu === "category" ? null : "category"); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-hover flex items-center gap-2"
                  >
                    <Tag size={11} />
                    <span className="flex-1">Categories</span>
                    <span className="text-gray-600 tabular-nums">{allReelCategoryIds.length}</span>
                  </button>

                  {subMenu === "category" && (
                    <div className="max-h-44 overflow-y-auto border-t border-surface-border bg-surface-hover">
                      <p className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider">
                        Select all that apply
                      </p>
                      {allCategories.map((cat) => {
                        const active = allReelCategoryIds.includes(cat.id);
                        const isPrimary = cat.id === reel.category;
                        return (
                          <button
                            key={cat.id}
                            onClick={(e) => handleCategoryToggle(e, cat.id)}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-card flex items-center gap-2.5"
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                              active
                                ? "bg-brand-500 border-brand-500"
                                : "border-surface-border bg-transparent"
                            )}>
                              {active && <Check size={9} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className="flex-1 flex items-center gap-1">
                              {cat.emoji} {cat.label}
                            </span>
                            {isPrimary && (
                              <span className="text-[10px] text-brand-400 opacity-70">primary</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Assign to Project */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSubMenu(subMenu === "project" ? null : "project"); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-hover flex items-center gap-2"
                  >
                    <FolderOpen size={11} />
                    <span className="flex-1">Assign to Project</span>
                    {projectTags.length > 0 && (
                      <span className="text-gray-600 tabular-nums">{projectTags.length}</span>
                    )}
                  </button>

                  {subMenu === "project" && (
                    <div className="max-h-36 overflow-y-auto border-t border-surface-border bg-surface-hover">
                      {allProjects.map((proj) => {
                        const assigned = projectTags.includes(proj.id);
                        return (
                          <button
                            key={proj.id}
                            onClick={(e) => { e.stopPropagation(); handleProjectToggle(proj.id); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-card flex items-center gap-2.5"
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all",
                              assigned
                                ? "bg-brand-500 border-brand-500"
                                : "border-surface-border bg-transparent"
                            )}>
                              {assigned && <Check size={9} className="text-white" strokeWidth={3} />}
                            </div>
                            <span>{proj.emoji} {proj.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="my-1 border-t border-surface-border" />
                  <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Centre: Play button (shown on hover, not in select mode) ── */}
        {!selectMode && onPlay && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
            aria-label="Play reel"
          >
            <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:scale-110 transition-transform shadow-xl">
              <Play size={22} className="text-white ml-1" fill="white" />
            </div>
          </button>
        )}

        {/* AI badge */}
        {reel.ai_summary && (
          <div className="absolute bottom-2 left-2">
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-500/30 text-brand-200 backdrop-blur-sm border border-brand-500/30">
              <Sparkles size={10} />
              AI
            </span>
          </div>
        )}

        {/* Done check overlay */}
        {reel.status === "done" && !selectMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-green-500/30 border-2 border-green-400 flex items-center justify-center">
              <Check size={24} className="text-green-400" />
            </div>
          </div>
        )}

        {/* Select mode checkmark */}
        {selectMode && (
          <div className="absolute inset-0 flex items-start justify-start p-2">
            <div className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
              isSelected
                ? "bg-brand-500 border-brand-500"
                : "bg-black/40 border-white/60 backdrop-blur-sm"
            )}>
              {isSelected && <Check size={13} className="text-white" strokeWidth={3} />}
            </div>
          </div>
        )}
        {selectMode && !isSelected && (
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        )}

        {/* Bottom title + meta overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8">
          <h3 className="font-semibold text-sm text-white leading-snug line-clamp-2 drop-shadow">
            {reel.title}
          </h3>
          <div className="flex items-center justify-between mt-1.5">
            <span className={cn("text-xs px-2 py-0.5 rounded-full border backdrop-blur-sm", statusConfig.color)}>
              {statusConfig.label}
            </span>
            <span className="text-xs text-white/50 flex items-center gap-1">
              <Calendar size={9} />
              {formatDate(reel.created_at)}
            </span>
          </div>

          {/* Project tags */}
          {projectTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {projectTags.slice(0, 2).map((pid) => {
                const proj = allProjects.find((p) => p.id === pid);
                return proj ? (
                  <span key={pid} className={cn("text-[10px] px-1.5 py-0.5 rounded-md border backdrop-blur-sm", proj.color)}>
                    {proj.emoji} {proj.label}
                  </span>
                ) : null;
              })}
              {projectTags.length > 2 && (
                <span className="text-[10px] text-white/40">+{projectTags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
