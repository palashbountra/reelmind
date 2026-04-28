"use client";

import { useState, useEffect } from "react";
import { X, Plus, Pencil, Trash2, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  BUILTIN_CATEGORY_LIST,
  loadCustomCategories,
  saveCustomCategories,
  updateBuiltinCategory,
  resetBuiltinCategory,
  isBuiltinModified,
  deleteBuiltinCategory,
  createCategory,
  getNextColor,
  getAllCategories,
} from "@/lib/categories";
import type { CustomCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const EMOJI_OPTIONS = [
  "🚀","🎯","💡","🔥","🌟","🎮","📱","🎵","🏆","🌿",
  "🧪","🎤","📷","🛠️","🌈","💎","🦋","🌊","🧩","⚽",
  "🎬","📝","🖼️","🤖","🎸","🏔️","🍕","☕","🌙","🎪",
  "⚡","💪","💻","🎨","📈","🍳","✈️","🧠","💰","✨",
  "📚","🗂️","🏷️","🔑","🎁","🌍","🧲","🔬","🎭","🏠",
];

interface CategoryManagerProps {
  open: boolean;
  onClose: () => void;
  onCategoriesChange: () => void;
}

type EditTarget = { id: string; isBuiltin: boolean } | null;

export function CategoryManager({ open, onClose, onCategoriesChange }: CategoryManagerProps) {
  // All categories rendered in one unified list
  const [allCats, setAllCats] = useState<CustomCategory[]>([]);
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  // New category form
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("🏷️");
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  function refresh() {
    const custom = loadCustomCategories();
    setCustomCats(custom);
    setAllCats(getAllCategories());
  }

  function persistAndNotify() {
    refresh();
    onCategoriesChange();
  }

  // ── Add new custom category ──────────────────────────────────────────────────
  function handleAdd() {
    if (!newLabel.trim()) { toast.error("Enter a category name"); return; }

    const existingIds = getAllCategories().map((c) => c.id);
    const newCat = createCategory(newLabel, newEmoji, customCats.length);

    if (existingIds.includes(newCat.id)) {
      toast.error("A category with that name already exists");
      return;
    }

    const updated = [...customCats, newCat];
    saveCustomCategories(updated);
    setNewLabel("");
    setNewEmoji("🏷️");
    setAdding(false);
    persistAndNotify();
    toast.success(`"${newCat.label}" added`);
  }

  // ── Start editing any category ────────────────────────────────────────────────
  function handleStartEdit(cat: CustomCategory) {
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditEmoji(cat.emoji);
    setShowEmojiPicker(null);
  }

  // ── Save edit (works for both built-in and custom) ────────────────────────────
  function handleSaveEdit(cat: CustomCategory) {
    if (!editLabel.trim()) { toast.error("Name can't be empty"); return; }

    if (cat.isBuiltin) {
      updateBuiltinCategory(cat.id, editLabel.trim(), editEmoji);
    } else {
      const updated = customCats.map((c) =>
        c.id === cat.id ? { ...c, label: editLabel.trim(), emoji: editEmoji } : c
      );
      saveCustomCategories(updated);
    }

    setEditingId(null);
    persistAndNotify();
    toast.success("Category updated");
  }

  // ── Reset built-in to defaults ────────────────────────────────────────────────
  function handleReset(cat: CustomCategory) {
    const original = BUILTIN_CATEGORY_LIST.find((b) => b.id === cat.id);
    if (!original) return;
    resetBuiltinCategory(cat.id);
    persistAndNotify();
    toast.success(`"${original.label}" reset to default`);
  }

  // ── Delete any category (built-in or custom) ─────────────────────────────────
  function handleDelete(cat: CustomCategory) {
    if (!confirm(`Delete "${cat.label}"? Reels in this category will still show it but it won't appear in filters or when adding new reels.`)) return;
    if (cat.isBuiltin) {
      deleteBuiltinCategory(cat.id);
    } else {
      const updated = customCats.filter((c) => c.id !== cat.id);
      saveCustomCategories(updated);
    }
    persistAndNotify();
    toast.success(`"${cat.label}" removed`);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
          <div>
            <h2 className="font-semibold text-white">Manage Categories</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Edit labels &amp; emojis · Add · Delete any
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-surface-hover transition-all">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Add button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              All Categories ({allCats.length})
            </p>
            <Button size="sm" variant="primary" onClick={() => { setAdding(true); setShowEmojiPicker(null); }}>
              <Plus size={13} /> Add Category
            </Button>
          </div>

          {/* Add new form */}
          {adding && (
            <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-xl space-y-3 animate-fade-in">
              <p className="text-xs text-brand-300 font-medium">New category</p>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <button
                    onClick={() => setShowEmojiPicker(showEmojiPicker === "__new__" ? null : "__new__")}
                    className="w-10 h-10 rounded-xl bg-surface-hover border border-surface-border text-xl flex items-center justify-center hover:border-brand-500/50 transition-all"
                  >
                    {newEmoji}
                  </button>
                  {showEmojiPicker === "__new__" && (
                    <EmojiPicker
                      onSelect={(e) => { setNewEmoji(e); setShowEmojiPicker(null); }}
                    />
                  )}
                </div>
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Category name..."
                  className="flex-1 px-3 py-2 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 transition-all"
                  autoFocus
                />
              </div>
              {newLabel.trim() && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Preview:</span>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                    getNextColor(customCats.length)
                  )}>
                    {newEmoji} {newLabel}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => { setAdding(false); setNewLabel(""); }}>Cancel</Button>
                <Button size="sm" variant="primary" onClick={handleAdd}><Check size={12} /> Create</Button>
              </div>
            </div>
          )}

          {/* Unified category list */}
          <ul className="space-y-1.5">
            {allCats.map((cat) => {
              const modified = cat.isBuiltin && isBuiltinModified(cat.id);
              const original = cat.isBuiltin ? BUILTIN_CATEGORY_LIST.find((b) => b.id === cat.id) : null;

              return (
                <li
                  key={cat.id}
                  className="flex items-center gap-3 px-3 py-2.5 bg-surface-hover border border-surface-border rounded-xl group transition-all hover:border-gray-600"
                >
                  {editingId === cat.id ? (
                    /* ── Edit mode ── */
                    <div className="flex-1 flex items-center gap-2">
                      <div className="relative">
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === cat.id ? null : cat.id)}
                          className="w-9 h-9 rounded-lg bg-surface-card border border-surface-border text-lg flex items-center justify-center hover:border-brand-500/50 transition-all"
                        >
                          {editEmoji}
                        </button>
                        {showEmojiPicker === cat.id && (
                          <EmojiPicker onSelect={(e) => { setEditEmoji(e); setShowEmojiPicker(null); }} />
                        )}
                      </div>
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(cat)}
                        className="flex-1 px-3 py-1.5 bg-surface-card border border-brand-500/30 rounded-xl text-sm text-white outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEdit(cat)}
                        className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-all"
                        title="Save"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-surface-card transition-all"
                        title="Cancel"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <>
                      {/* Badge */}
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border flex-1 min-w-0",
                        cat.color
                      )}>
                        <span className="shrink-0">{cat.emoji}</span>
                        <span className="truncate">{cat.label}</span>
                        {modified && (
                          <span className="ml-0.5 text-brand-400 text-xs shrink-0" title="Customised">✎</span>
                        )}
                      </span>

                      {/* Actions */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        {/* Edit (everyone) */}
                        <button
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-surface-card transition-all"
                          title="Edit label & emoji"
                        >
                          <Pencil size={13} />
                        </button>

                        {/* Reset to default (built-ins that have been modified) */}
                        {cat.isBuiltin && modified && original && (
                          <button
                            onClick={() => handleReset(cat)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                            title={`Reset to "${original.emoji} ${original.label}"`}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}

                        {/* Delete (all categories) */}
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-1 pb-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <RotateCcw size={10} /> Reset to default
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <Trash2 size={10} /> Delete
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-surface-border shrink-0">
          <Button variant="secondary" className="w-full" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

// Reusable emoji picker dropdown
function EmojiPicker({ onSelect }: { onSelect: (e: string) => void }) {
  return (
    <div className="absolute top-11 left-0 z-20 bg-surface-card border border-surface-border rounded-xl p-2 grid grid-cols-8 gap-1 shadow-xl w-64">
      {[
        "🚀","🎯","💡","🔥","🌟","🎮","📱","🎵","🏆","🌿",
        "🧪","🎤","📷","🛠️","🌈","💎","🦋","🌊","🧩","⚽",
        "🎬","📝","🖼️","🤖","🎸","🏔️","🍕","☕","🌙","🎪",
        "⚡","💪","💻","🎨","📈","🍳","✈️","🧠","💰","✨",
        "📚","🗂️","🏷️","🔑","🎁","🌍","🧲","🔬","🎭","🏠",
      ].map((e) => (
        <button
          key={e}
          onClick={() => onSelect(e)}
          className="w-7 h-7 text-base rounded-lg hover:bg-surface-hover flex items-center justify-center transition-all"
        >
          {e}
        </button>
      ))}
    </div>
  );
}
