"use client";

import Image from "next/image";
import { Heart, ExternalLink, Sparkles, Calendar, MoreHorizontal, Check, Archive, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Reel } from "@/lib/types";
import { STATUS_CONFIG, formatDate, cn } from "@/lib/utils";
import { getCategoryById } from "@/lib/categories";
import { Badge } from "@/components/ui/Badge";
import { toggleFavourite, updateReel, deleteReel } from "@/lib/db/reels";
import { useAppStore } from "@/lib/store";
import toast from "react-hot-toast";

interface ReelCardProps {
  reel: Reel;
  onClick: () => void;
}

export function ReelCard({ reel, onClick }: ReelCardProps) {
  const { updateReel: storeUpdate, removeReel } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const catConfig = getCategoryById(reel.category);
  const statusConfig = STATUS_CONFIG[reel.status];

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
    setMenuOpen(false);
    try {
      await updateReel(reel.id, { status });
      storeUpdate(reel.id, { status });
      toast.success(`Marked as ${STATUS_CONFIG[status].label}`);
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
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
      onClick={onClick}
      className={cn(
        "reel-card group relative bg-surface-card border border-surface-border rounded-2xl overflow-hidden",
        "cursor-pointer transition-all duration-200 hover:border-brand-500/30 animate-fade-in",
        reel.status === "done" && "opacity-70"
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
        {reel.status === "done" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="w-12 h-12 rounded-full bg-green-500/30 border-2 border-green-400 flex items-center justify-center">
              <Check size={24} className="text-green-400" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-sm text-white leading-snug line-clamp-2 flex-1">
            {reel.title}
          </h3>
          {/* Context menu */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-surface-hover transition-all opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-7 z-50 bg-surface-card border border-surface-border rounded-xl shadow-xl min-w-36 py-1"
                onClick={(e) => e.stopPropagation()}
              >
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
                <button onClick={handleDelete} className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            )}
          </div>
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

        {/* Tags */}
        {reel.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
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
