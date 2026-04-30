"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Sparkles, Send, Lightbulb, Copy, Check,
  Loader2, CheckSquare, FolderOpen, ChevronDown, ChevronUp,
  Trash2, Search,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getAllCategories } from "@/lib/categories";
import { getAllProjects, setProjectPlan, getProjectPlan } from "@/lib/projects";
import { updateReel } from "@/lib/db/reels";
import type { Reel } from "@/lib/types";
import type { Project } from "@/lib/projects";
import toast from "react-hot-toast";

const PROMPT_SUGGESTIONS = [
  "What's the common theme across these reels and how can I build a habit from them?",
  "Help me create a weekly action plan based on what I've saved",
  "What skills am I trying to learn? Give me a learning roadmap",
  "How can I combine insights from these reels into a single project?",
  "What are the quick wins I can implement this week?",
  "Summarise the top 3 ideas I should act on immediately",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  reelCount?: number;
  prompt?: string;
}

export function IdeateView() {
  const { reels, setActiveView, setPendingTaskTitle, setPendingProjectId, updateReel: storeUpdate } = useAppStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveToProjectOpen, setSaveToProjectOpen] = useState<string | null>(null); // message id
  const [projects] = useState<Project[]>(getAllProjects);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [reelSearch, setReelSearch] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const reelsWithContent = reels.filter((r) => r.status !== "archived");

  // Search-filtered reels
  const filteredReels = useMemo(() => {
    if (!reelSearch.trim()) return reelsWithContent;
    const q = reelSearch.toLowerCase();
    return reelsWithContent.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false) ||
        (r.ai_summary?.toLowerCase().includes(q) ?? false) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [reelsWithContent, reelSearch]);

  // Group filtered reels by all their categories
  const categoryGroups = useMemo(() => {
    const allCats = getAllCategories();
    const groups = new Map<string, { cat: ReturnType<typeof getAllCategories>[0]; reels: Reel[] }>();

    allCats.forEach((cat) => groups.set(cat.id, { cat, reels: [] }));

    filteredReels.forEach((reel) => {
      const catIds = Array.from(
        new Set([reel.category, ...(reel.extra_categories ?? [])])
      );
      catIds.forEach((catId) => {
        if (groups.has(catId)) {
          groups.get(catId)!.reels.push(reel);
        }
      });
    });

    // Only return groups that have reels, sorted by count desc
    return Array.from(groups.values())
      .filter((g) => g.reels.length > 0)
      .sort((a, b) => b.reels.length - a.reels.length);
  }, [filteredReels]);

  function toggleCategory(catId: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  }

  function selectAllInCategory(catReels: Reel[]) {
    const ids = catReels.map((r) => r.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function toggleReel(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() { setSelectedIds(new Set(reelsWithContent.map((r) => r.id))); }
  function selectNone() { setSelectedIds(new Set()); }

  async function handleIdeate() {
    if (selectedIds.size === 0) { toast.error("Select at least one reel first"); return; }
    if (!prompt.trim()) { toast.error("Enter a prompt or question"); return; }

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: prompt.trim(),
      reelCount: selectedIds.size,
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt("");
    setLoading(true);

    const selectedReels = reelsWithContent
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({
        title: r.title,
        description: r.description || "",
        summary: r.ai_summary || "",
      }));

    try {
      const res = await fetch("/api/ideate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reels: selectedReels, prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ideation failed");
      }

      const data = await res.json();
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.ideas,
        reelCount: selectedIds.size,
        prompt: userMsg.content,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ideation failed";
      if (msg.includes("GROQ_API_KEY")) {
        toast.error("Add your free GROQ_API_KEY to .env.local to enable AI ideation");
      } else {
        toast.error(msg);
      }
      // Remove the user message if we failed
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleCreateTask(content: string) {
    // Extract first sentence / bullet as a task title
    const firstLine = content.split("\n").find((l) => l.trim());
    const taskTitle = firstLine
      ?.replace(/^[#\-•\d.]+\s*/, "")
      .slice(0, 80) ?? "Task from Ideate";
    setPendingTaskTitle(taskTitle);
    setActiveView("tasks");
    toast.success("Switched to Tasks — title pre-filled!");
  }

  async function handleSaveToProject(messageId: string, projectId: string, content: string) {
    const proj = projects.find((p) => p.id === projectId);

    // 1. Save AI response to project plan
    const existing = getProjectPlan(projectId);
    const separator = existing ? "\n\n---\n\n" : "";
    const timestamp = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    setProjectPlan(projectId, existing + separator + `### Ideate — ${timestamp}\n\n${content}`);

    // 2. Tag all currently selected reels to the project
    const selectedReelsList = reelsWithContent.filter((r) => selectedIds.has(r.id));
    if (selectedReelsList.length > 0) {
      try {
        await Promise.all(selectedReelsList.map(async (reel) => {
          const current = new Set(reel.project_tags ?? []);
          if (current.has(projectId)) return;
          current.add(projectId);
          const next = Array.from(current);
          await updateReel(reel.id, { project_tags: next });
          storeUpdate(reel.id, { project_tags: next });
        }));
      } catch { /* non-fatal */ }
    }

    // 3. Navigate to Projects and auto-select the project
    setPendingProjectId(projectId);
    setActiveView("projects");
    setSaveToProjectOpen(null);
    toast.success(`Analysis + ${selectedReelsList.length} reel${selectedReelsList.length !== 1 ? "s" : ""} sent to ${proj?.label ?? "project"}`);
  }

  async function handleCopy(content: string) {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  }

  function clearHistory() {
    if (!confirm("Clear conversation history?")) return;
    setMessages([]);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: reel selector — category-grouped */}
      <div className="w-72 shrink-0 border-r border-surface-border flex flex-col">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 border-b border-surface-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white text-sm flex items-center gap-2">
              <Lightbulb size={15} className="text-brand-400" />
              Reels
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-600">{selectedIds.size} selected</span>
              <button onClick={selectAll} className="text-brand-400 hover:text-brand-300 transition-colors">All</button>
              <span className="text-gray-700">·</span>
              <button onClick={selectNone} className="text-gray-600 hover:text-gray-400 transition-colors">None</button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={reelSearch}
              onChange={(e) => setReelSearch(e.target.value)}
              placeholder="Search reels…"
              className="w-full pl-7 pr-3 py-1.5 bg-surface-hover border border-surface-border rounded-lg text-xs text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 transition-all"
            />
          </div>
        </div>

        {/* Category groups */}
        <div className="flex-1 overflow-y-auto py-2">
          {reelsWithContent.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8 px-4">
              No reels saved yet. Add some from the Dashboard.
            </p>
          ) : categoryGroups.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8 px-4">
              No reels match &quot;{reelSearch}&quot;
            </p>
          ) : (
            categoryGroups.map(({ cat, reels: catReels }) => {
              const isCollapsed = collapsedCategories.has(cat.id);
              const allInCatSelected = catReels.every((r) => selectedIds.has(r.id));
              const someInCatSelected = catReels.some((r) => selectedIds.has(r.id));

              return (
                <div key={cat.id} className="mb-1">
                  {/* Category header */}
                  <div className="flex items-center justify-between px-3 py-1.5">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className="flex items-center gap-1.5 flex-1 min-w-0 text-left group"
                    >
                      <span className="text-sm">{cat.emoji}</span>
                      <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-300 truncate transition-colors">
                        {cat.label}
                      </span>
                      <span className="text-xs text-gray-700 tabular-nums shrink-0">({catReels.length})</span>
                      {isCollapsed
                        ? <ChevronDown size={11} className="text-gray-700 shrink-0" />
                        : <ChevronUp size={11} className="text-gray-700 shrink-0" />
                      }
                    </button>
                    <button
                      onClick={() => selectAllInCategory(catReels)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full border transition-all shrink-0 ml-1",
                        allInCatSelected
                          ? "bg-brand-500/20 border-brand-500/40 text-brand-300"
                          : someInCatSelected
                          ? "border-brand-500/30 text-brand-400 hover:bg-brand-500/10"
                          : "border-surface-border text-gray-600 hover:text-gray-400 hover:border-gray-600"
                      )}
                    >
                      {allInCatSelected ? "✓ all" : "select all"}
                    </button>
                  </div>

                  {/* Reel list */}
                  {!isCollapsed && (
                    <div className="px-2 space-y-0.5">
                      {catReels.map((reel) => (
                        <button
                          key={reel.id}
                          onClick={() => toggleReel(reel.id)}
                          className={cn(
                            "w-full text-left px-2.5 py-2 rounded-lg border transition-all flex items-start gap-2",
                            selectedIds.has(reel.id)
                              ? "border-brand-500/30 bg-brand-500/10"
                              : "border-transparent hover:bg-surface-hover hover:border-surface-border"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                            selectedIds.has(reel.id)
                              ? "bg-brand-500 border-brand-500"
                              : "border-gray-600"
                          )}>
                            {selectedIds.has(reel.id) && <Check size={8} className="text-white" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-300 leading-snug line-clamp-2">
                              {reel.title}
                            </p>
                            {reel.ai_summary && (
                              <p className="text-[10px] text-gray-600 line-clamp-1 mt-0.5">{reel.ai_summary}</p>
                            )}
                          </div>
                          {reel.ai_summary && (
                            <Sparkles size={9} className="text-brand-500/60 shrink-0 mt-0.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: chat workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="gradient-text">Ideate</span>
              <Sparkles size={16} className="text-brand-400" />
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              AI thinking partner — {selectedIds.size} reel{selectedIds.size !== 1 ? "s" : ""} in context
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-gray-600 hover:text-red-400 hover:bg-red-500/10 border border-surface-border transition-all"
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-violet-500/20 border border-brand-500/20 flex items-center justify-center text-3xl mb-4">
                🧠
              </div>
              <h3 className="font-semibold text-white mb-2">Your AI thinking partner</h3>
              <p className="text-sm text-gray-500 max-w-sm mb-6">
                Select reels from the left, then ask AI to connect the dots, generate ideas, or build action plans.
              </p>
              {/* Prompt suggestions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-surface-border text-gray-500 hover:text-gray-300 hover:border-gray-600 transition-all text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation */}
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "user" ? (
                <div className="max-w-[85%] bg-brand-500/15 border border-brand-500/25 rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-sm text-white leading-relaxed">{msg.content}</p>
                  <p className="text-xs text-brand-400/60 mt-1">
                    {msg.reelCount} reel{msg.reelCount !== 1 ? "s" : ""} as context
                  </p>
                </div>
              ) : (
                <div className="max-w-[92%] bg-surface-card border border-surface-border rounded-2xl rounded-tl-sm overflow-hidden">
                  {/* AI message header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border bg-brand-500/5">
                    <div className="flex items-center gap-2">
                      <Sparkles size={12} className="text-brand-400" />
                      <span className="text-xs text-gray-400">AI · {msg.reelCount} reel{msg.reelCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Save to project */}
                      <div className="relative">
                        <button
                          onClick={() => setSaveToProjectOpen(saveToProjectOpen === msg.id ? null : msg.id)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-violet-300 hover:bg-violet-500/10 transition-all"
                          title="Send analysis + reels to project"
                        >
                          <FolderOpen size={12} />
                          <span className="hidden sm:inline">→ Project</span>
                        </button>
                        {saveToProjectOpen === msg.id && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-surface-card border border-surface-border rounded-xl shadow-xl z-20 overflow-hidden">
                            <p className="text-xs text-gray-500 px-3 py-2 border-b border-surface-border">Send analysis + tag reels to:</p>
                            {projects.length === 0 ? (
                              <p className="text-xs text-gray-600 px-3 py-2">No projects yet. Add one in Projects.</p>
                            ) : (
                              projects.map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => handleSaveToProject(msg.id, p.id, msg.content)}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-surface-hover hover:text-white transition-all flex items-center gap-2"
                                >
                                  <span>{p.emoji}</span>
                                  <span className="truncate">{p.label}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {/* Create task */}
                      <button
                        onClick={() => handleCreateTask(msg.content)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-green-300 hover:bg-green-500/10 transition-all"
                        title="Create a task from this response"
                      >
                        <CheckSquare size={12} />
                        <span className="hidden sm:inline">Task</span>
                      </button>
                      {/* Copy */}
                      <button
                        onClick={() => handleCopy(msg.content)}
                        className="p-1 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-surface-hover transition-all"
                        title="Copy"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                  {/* Message content */}
                  <div className="px-4 py-3">
                    <MarkdownContent content={msg.content} />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading bubble */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-surface-card border border-surface-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5">
                <Loader2 size={14} className="animate-spin text-brand-400" />
                <span className="text-sm text-gray-400">
                  Thinking across {selectedIds.size} reel{selectedIds.size !== 1 ? "s" : ""}…
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-6 py-4 border-t border-surface-border">
          {/* Prompt suggestions (compact, only show when there are messages) */}
          {messages.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {PROMPT_SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-surface-border text-gray-600 hover:text-gray-300 hover:border-gray-600 transition-all"
                >
                  {s.slice(0, 40)}…
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleIdeate();
                }}
                placeholder={
                  selectedIds.size === 0
                    ? "Select reels on the left first…"
                    : "Ask anything about your saved reels…"
                }
                rows={2}
                className="w-full px-4 py-3 bg-surface-hover border border-surface-border rounded-2xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 transition-all resize-none pr-16"
              />
              <div className="absolute bottom-2.5 right-3 text-xs text-gray-700">⌘↵</div>
            </div>
            <button
              onClick={handleIdeate}
              disabled={loading || selectedIds.size === 0 || !prompt.trim()}
              className="p-3 bg-gradient-to-r from-brand-500 to-violet-600 text-white rounded-2xl hover:from-brand-400 hover:to-violet-500 transition-all shadow-lg shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Lightweight markdown renderer
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith("# "))
          return <h3 key={i} className="text-base font-bold text-white mt-3 mb-1">{line.slice(2)}</h3>;
        if (line.startsWith("## "))
          return <h4 key={i} className="text-sm font-semibold text-gray-200 mt-2 mb-1">{line.slice(3)}</h4>;
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-300 my-0.5">
              <span className="text-brand-400 mt-1 shrink-0 text-xs">•</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        if (/^\d+\./.test(line))
          return (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-300 my-0.5">
              <span className="text-brand-400 font-mono text-xs mt-0.5 shrink-0 w-4">{line.match(/^\d+/)?.[0]}.</span>
              <span>{line.replace(/^\d+\.\s*/, "")}</span>
            </div>
          );
        if (line.startsWith("**") && line.endsWith("**"))
          return <p key={i} className="text-sm font-semibold text-white my-1">{line.slice(2, -2)}</p>;
        return <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

