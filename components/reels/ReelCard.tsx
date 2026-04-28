"use client";

import Image from "next/image";
import { Heart, Sparkles, Calendar, MoreHorizontal, Check, Archive, Trash2, ChevronRight, FolderOpen, Tag } from "lucide-react";
import { useState } from "react";
import type { Reel } from "@/lib/types";
import { STATUS_CONFIG, formatDate, cn } from "@/lib/utils";
import { getCategoryById, getAllCategories } from "@/lib/categories";
import { getAllProjects } from "@/lib/projects";
import { Badge } from "@/components/ui/Badge";
import { toggleFavourite, updateReel, deleteReel } from "@/lib/db/reels";
import { useAppStore } from "@/lib/store";
import toast from "react-hot-toast";

interface ReelCardProps {
  reel: Reel;
  onClick: () => void;
  selectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export function ReelCard({ reel, onClick, selectMode, isSelected, onSelect }: ReelCardProps) {
  const { updateReel: storeUpdate, removeReel } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<"category" | "project" | null>(null);
  const [imgError, setImgError] = useState(false);

  const catConfig = getCategoryById(reel.category);
  const statusConfig = STATUS_CONFIG[reel.status];
  const allCategories = getAllCategories();
  const allProjects = getAllProjects();
  const projectTags: string[] = reel.project_tags ?? [];

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

  async function handleCategoryChange(categoryId: string) {
    closeMenu();
    if (categoryId === reel.category) return;
    try {
      await updateReel(reel.id, { category: categoryId });
      storeUpdate(reel.id, { category: categoryId });
      toast.success(`Moved to ${getCategoryById(categoryId).label}`);
    } catch {
      toast.error("Failed to move category");
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
      toast.success(current.has(projectId) ? `Added to ${proj?.label}` : `Removed from ${proj?.label}`);
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
      {/* Thumbnail */}
      <div className="relative aspect-[9/16] max-h-52 bg-surface-hover overflow-hidden">
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
          <div className="w-full h-full flex items-center justify-center text-4xl">
            {catConfig.emoji}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Top actions */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <Badge className={cn(catConfig.color, "text-xs")}>
            {catConfig.emoji} {catConfig.label}
          </Badge>
          <div className="flex gap-1">
            <button
              onClick={handleFavourite}
              className={cn(
                "p-1.5 rounded-full backdrop-blur-sm transition-all",
                reel.is_favourite
                  ? "text-yellow-400 bg-yellow-400/20"
                  : "text-white/60 bg-black/20 hover:text-yellow-400"
              )}
            >
              <Heart size={13} fill={reel.is_favourite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* AI badge */}
        {reel.ai_summary && (
          <div className="absolute bottom-2 left-2">
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-brand-500/30 text-brand-200 backdrop-blur-sm border border-brand-500/30">
              <Sparkles size={10} />
              AI analysed
            </span>
          </div>
        )}

        {/* Done check */}
        {reel.status === "done" && !selectMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
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

        {/* Select mode dim overlay */}
        {selectMode && !isSelected && (
          <div className="absolute inset-0 bg-black/20" />
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-sm text-white leading-snug line-clamp-2 flex-1">
            {reel.title}
          </h3>

          {/* Context menu */}
          {!selectMode && (
            <div className="relative shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setSubMenu(null); }}
                className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={14} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-7 z-50 bg-surface-card border border-surface-border rounded-xl shadow-xl w-48 py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Status */}
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

                  {/* Move to Category */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSubMenu(subMenu === "category" ? null : "category"); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-hover flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Tag size={11} /> Move to Category
                    </span>
                    <ChevronRight size={11} className={cn("transition-transform", subMenu === "category" && "rotate-90")} />
                  </button>

                  {subMenu === "category" && (
                    <div className="max-h-36 overflow-y-auto border-t border-surface-border bg-surface-hover">
                      {allCategories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={(e) => { e.stopPropagation(); handleCategoryChange(cat.id); }}
                          className="w-full text-left px-4 py-1.5 text-xs text-gray-300 hover:bg-surface-card flex items-center justify-between"
                        >
                          <span>{cat.emoji} {cat.label}</span>
                          {reel.category === cat.id && <Check size={10} className="text-brand-400" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Assign to Project */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSubMenu(subMenu === "project" ? null : "project"); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-surface-hover flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen size={11} /> Assign to Project
                    </span>
                    <ChevronRight size={11} className={cn("transition-transform", subMenu === "project" && "rotate-90")} />
                  </button>

                  {subMenu === "project" && (
                    <div className="max-h-36 overflow-y-auto border-t border-surface-border bg-surface-hover">
                      {allProjects.map((proj) => {
                        const assigned = projectTags.includes(proj.id);
                        return (
                          <button
                            key={proj.id}
                            onClick={(e) => { e.stopPropagation(); handleProjectToggle(proj.id); }}
                            className="w-full text-left px-4 py-1.5 text-xs text-gray-300 hover:bg-surface-card flex items-center justify-between"
                          >
                            <span>{proj.emoji} {proj.label}</span>
                            {assigned && <Check size={10} className="text-brand-400" />}
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

        {/* Status + date */}
        <div className="flex items-center justify-between">
          <span className={cn("text-xs px-2 py-0.5 rounded-full border", statusConfig.color)}>
            {statusConfig.label}
          </span>
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <Calendar size={10} />
            {formatDate(reel.created_at)}
          </span>
        </div>

        {/* Project tags */}
        {projectTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {projectTags.slice(0, 2).map((pid) => {
              const proj = allProjects.find((p) => p.id === pid);
              return proj ? (
                <span key={pid} className={cn("text-xs px-1.5 py-0.5 rounded-md border", proj.color)}>
                  {proj.emoji} {proj.label}
                </span>
              ) : null;
            })}
            {projectTags.length > 2 && (
              <span className="text-xs text-gray-600">+{projectTags.length - 2}</span>
            )}
          </div>
        )}

        {/* Tags */}
        {reel.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reel.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs text-gray-600 px-1.5 py-0.5 bg-surface-hover rounded-md">
                #{tag}
              </span>
            ))}
            {reel.tags.length > 3 && (
              <span className="text-xs text-gray-700">+{reel.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Action items count */}
        {reel.ai_action_items && reel.ai_action_items.length > 0 && (
          <div className="mt-2 pt-2 border-t border-surface-border text-xs text-gray-600">
            {reel.ai_action_items.length} action item{reel.ai_action_items.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
