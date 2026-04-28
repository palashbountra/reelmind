"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getAllCategories } from "@/lib/categories";
import type { CustomCategory, ReelStatus } from "@/lib/types";
import { CategoryManager } from "@/components/categories/CategoryManager";
import { BulkImportModal } from "@/components/reels/BulkImportModal";
import {
  LayoutDashboard, Lightbulb, CheckSquare, Star, Archive,
  Plus, ChevronLeft, Inbox, Clock, Check, BookMarked,
  Clapperboard, Settings2, FolderOpen, Upload,
} from "lucide-react";

const STATUS_ITEMS: { label: string; value: ReelStatus | "all"; icon: React.ReactNode; color: string }[] = [
  { label: "All Reels",   value: "all",         icon: <Inbox size={15} />,       color: "text-gray-400" },
  { label: "Unread",      value: "unread",      icon: <Clock size={15} />,       color: "text-slate-400" },
  { label: "In Progress", value: "in_progress", icon: <Clapperboard size={15} />,color: "text-blue-400" },
  { label: "Done",        value: "done",        icon: <Check size={15} />,       color: "text-green-400" },
];

interface SidebarProps {
  activeView: "dashboard" | "ideate" | "tasks" | "projects";
  onViewChange: (view: "dashboard" | "ideate" | "tasks" | "projects") => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { filters, setFilters, setAddReelOpen, setBulkImportOpen, reels, sidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  // Force re-render when categories change
  const [categories, setCategories] = useState<CustomCategory[]>([]);

  useEffect(() => {
    setCategories(getAllCategories());
  }, []);

  function refreshCategories() {
    setCategories(getAllCategories());
  }

  const categoryCount = (id: string) => reels.filter((r) => r.category === id).length;
  const statusCount = (status: ReelStatus | "all") =>
    status === "all" ? reels.length : reels.filter((r) => r.status === status).length;

  return (
    <>
      <aside
        className={cn(
          "h-screen flex flex-col bg-surface-card border-r border-surface-border transition-all duration-200 shrink-0",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-surface-border">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center text-white font-bold text-sm">
                🎬
              </div>
              <span className="font-bold text-white text-sm tracking-tight">ReelMind</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-surface-hover transition-colors ml-auto"
          >
            <ChevronLeft
              size={14}
              className={cn("transition-transform", sidebarCollapsed && "rotate-180")}
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {/* Add Reel button */}
          <button
            onClick={() => setAddReelOpen(true)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl",
              "bg-gradient-to-r from-brand-500/20 to-violet-500/20 border border-brand-500/30",
              "text-brand-300 hover:from-brand-500/30 hover:to-violet-500/30 transition-all text-sm font-medium"
            )}
          >
            <Plus size={15} className="shrink-0" />
            {!sidebarCollapsed && <span>Add Reel</span>}
          </button>

          {/* Bulk Import button */}
          <button
            onClick={() => setBulkImportOpen(true)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl",
              "border border-surface-border text-gray-500",
              "hover:text-gray-300 hover:bg-surface-hover transition-all text-sm"
            )}
          >
            <Upload size={14} className="shrink-0" />
            {!sidebarCollapsed && <span>Bulk Import</span>}
          </button>

          {/* Main views */}
          <div className="pt-2">
            {!sidebarCollapsed && (
              <p className="text-xs text-gray-600 px-3 mb-1 uppercase tracking-wider font-medium">Views</p>
            )}
            {[
              { label: "Dashboard", value: "dashboard" as const, icon: <LayoutDashboard size={15} /> },
              { label: "Projects",  value: "projects" as const,  icon: <FolderOpen size={15} /> },
              { label: "Ideate",    value: "ideate" as const,    icon: <Lightbulb size={15} /> },
              { label: "Tasks",     value: "tasks" as const,     icon: <CheckSquare size={15} /> },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => onViewChange(item.value)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all",
                  activeView === item.value
                    ? "bg-brand-500/15 text-brand-300 border border-brand-500/20"
                    : "text-gray-400 hover:text-white hover:bg-surface-hover"
                )}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="pt-2">
            {!sidebarCollapsed && (
              <p className="text-xs text-gray-600 px-3 mb-1 uppercase tracking-wider font-medium">Status</p>
            )}
            {STATUS_ITEMS.map((item) => (
              <button
                key={item.value}
                onClick={() => { onViewChange("dashboard"); setFilters({ status: item.value }); }}
                className={cn(
                  "w-full flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl text-sm transition-all",
                  filters.status === item.value && activeView === "dashboard"
                    ? "bg-surface-hover text-white"
                    : "text-gray-500 hover:text-gray-300 hover:bg-surface-hover"
                )}
              >
                <span className={cn("flex items-center gap-2", item.color)}>
                  {item.icon}
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </span>
                {!sidebarCollapsed && (
                  <span className="text-xs text-gray-600 tabular-nums">{statusCount(item.value)}</span>
                )}
              </button>
            ))}

            {/* Favourites */}
            <button
              onClick={() => { onViewChange("dashboard"); setFilters({ favourites: !filters.favourites }); }}
              className={cn(
                "w-full flex items-center justify-between gap-2.5 px-3 py-1.5 rounded-xl text-sm transition-all",
                filters.favourites
                  ? "bg-surface-hover text-yellow-400"
                  : "text-gray-500 hover:text-gray-300 hover:bg-surface-hover"
              )}
            >
              <span className="flex items-center gap-2">
                <Star size={15} />
                {!sidebarCollapsed && <span>Favourites</span>}
              </span>
              {!sidebarCollapsed && (
                <span className="text-xs text-gray-600 tabular-nums">
                  {reels.filter((r) => r.is_favourite).length}
                </span>
              )}
            </button>
          </div>

          {/* Categories */}
          {!sidebarCollapsed && (
            <div className="pt-2">
              <div className="flex items-center justify-between px-3 mb-1">
                <p className="text-xs text-gray-600 uppercase tracking-wider font-medium">Categories</p>
                <button
                  onClick={() => setCatManagerOpen(true)}
                  title="Manage categories"
                  className="p-1 rounded-md text-gray-600 hover:text-gray-300 hover:bg-surface-hover transition-all"
                >
                  <Settings2 size={12} />
                </button>
              </div>

              {categories.map((cat) => {
                const count = categoryCount(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onViewChange("dashboard");
                      setFilters({ category: filters.category === cat.id ? "all" : cat.id });
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-sm transition-all",
                      filters.category === cat.id && activeView === "dashboard"
                        ? "bg-surface-hover text-white"
                        : "text-gray-500 hover:text-gray-300 hover:bg-surface-hover"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="text-sm shrink-0">{cat.emoji}</span>
                      <span className="truncate">{cat.label}</span>
                    </span>
                    {count > 0 && (
                      <span className="text-xs text-gray-600 tabular-nums shrink-0">{count}</span>
                    )}
                  </button>
                );
              })}

              {/* Manage categories shortcut */}
              <button
                onClick={() => setCatManagerOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-gray-700 hover:text-gray-400 hover:bg-surface-hover transition-all mt-1"
              >
                <Plus size={11} />
                <span>Add / manage categories</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-surface-border space-y-1">
          <button
            onClick={() => { onViewChange("dashboard"); setFilters({ status: "archived" }); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:text-gray-400 hover:bg-surface-hover transition-all"
          >
            <Archive size={15} className="shrink-0" />
            {!sidebarCollapsed && <span>Archived</span>}
          </button>

          {!sidebarCollapsed && (
            <Link
              href="/bookmarklet"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:text-gray-400 hover:bg-surface-hover transition-all"
            >
              <BookMarked size={15} className="shrink-0" />
              <span>Quick Save Setup</span>
            </Link>
          )}

          {/* Instagram profile card */}
          <a
            href="https://www.instagram.com/palash_bountra_/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all group",
              "border border-surface-border hover:border-brand-500/30 hover:bg-surface-hover"
            )}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">
              P
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">palash_bountra_</p>
                <p className="text-xs text-gray-600">Instagram ↗</p>
              </div>
            )}
          </a>
        </div>
      </aside>

      {/* Category manager modal */}
      <CategoryManager
        open={catManagerOpen}
        onClose={() => setCatManagerOpen(false)}
        onCategoriesChange={refreshCategories}
      />

      {/* Bulk import modal */}
      <BulkImportModal />
    </>
  );
}
