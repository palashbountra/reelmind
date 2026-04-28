"use client";

import { useState } from "react";
import {
  Sparkles, Send, Lightbulb, RefreshCw, Copy, Check,
  ChevronDown, ChevronUp, Loader2
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { getCategoryById } from "@/lib/categories";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Reel } from "@/lib/types";
import toast from "react-hot-toast";

const PROMPT_SUGGESTIONS = [
  "What's the common theme across these reels and how can I build a habit from them?",
  "Help me create a weekly action plan based on what I've saved",
  "What skills am I trying to learn? Give me a learning roadmap",
  "How can I combine insights from these reels into a single project?",
  "What are the quick wins I can implement this week?",
  "Summarise the top 3 ideas I should act on immediately",
];

export function IdeateView() {
  const { reels } = useAppStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandSelector, setExpandSelector] = useState(true);

  // Only show reels with content (title + at least description or summary)
  const reelsWithContent = reels.filter(
    (r) => r.status !== "archived"
  );

  function toggleReel(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(reelsWithContent.map((r) => r.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  async function handleIdeate() {
    if (selectedIds.size === 0) {
      toast.error("Select at least one reel first");
      return;
    }
    if (!prompt.trim()) {
      toast.error("Enter a prompt or question");
      return;
    }

    const selectedReels = reelsWithContent
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({
        title: r.title,
        description: r.description || "",
        summary: r.ai_summary || "",
      }));

    setLoading(true);
    setResult("");

    try {
      const res = await fetch("/api/ideate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reels: selectedReels, prompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ideation failed");
      }

      const data = await res.json();
      setResult(data.ideas);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Ideation failed";
      if (msg.includes("GROQ_API_KEY")) {
        toast.error("Add your free GROQ_API_KEY to .env.local to enable AI ideation");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: reel selector */}
      <div className="w-72 shrink-0 border-r border-surface-border flex flex-col">
        <div className="px-4 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-white text-sm flex items-center gap-2">
            <Lightbulb size={16} className="text-brand-400" />
            Select Reels
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedIds.size} of {reelsWithContent.length} selected
          </p>
          <div className="flex gap-2 mt-2">
            <button onClick={selectAll} className="text-xs text-brand-400 hover:text-brand-300">All</button>
            <span className="text-gray-700">·</span>
            <button onClick={selectNone} className="text-xs text-gray-500 hover:text-gray-300">None</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {reelsWithContent.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8">
              No reels saved yet. Add some from the Dashboard.
            </p>
          ) : (
            reelsWithContent.map((reel) => (
              <ReelSelectCard
                key={reel.id}
                reel={reel}
                selected={selectedIds.has(reel.id)}
                onToggle={() => toggleReel(reel.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: ideation workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-border">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="gradient-text">Ideate</span>
            <Sparkles size={18} className="text-brand-400" />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Select reels on the left, then ask AI to synthesise ideas, patterns, and action plans.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Prompt suggestions */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-2">💡 Try asking...</p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setPrompt(s)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full border transition-all text-left",
                    prompt === s
                      ? "border-brand-500/50 bg-brand-500/10 text-brand-300"
                      : "border-surface-border text-gray-500 hover:text-gray-300 hover:border-gray-600"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt input */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 font-medium">Your question or prompt</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleIdeate();
                }}
                placeholder="Ask anything about your saved reels..."
                rows={3}
                className="w-full px-4 py-3 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 transition-all resize-none"
              />
              <div className="absolute bottom-2.5 right-3 text-xs text-gray-700">
                ⌘↵ to send
              </div>
            </div>
            <Button
              variant="primary"
              onClick={handleIdeate}
              loading={loading}
              disabled={selectedIds.size === 0 || !prompt.trim()}
              className="w-full"
            >
              <Sparkles size={14} />
              {loading ? "Thinking..." : "Generate Ideas"}
              {!loading && <Send size={13} />}
            </Button>
          </div>

          {/* Result */}
          {loading && (
            <div className="flex items-center justify-center py-12 gap-3 text-gray-500">
              <Loader2 size={20} className="animate-spin text-brand-400" />
              <span className="text-sm">AI is synthesising ideas from your {selectedIds.size} selected reels...</span>
            </div>
          )}

          {result && !loading && (
            <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden animate-fade-in">
              {/* Result header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-brand-500/5">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-brand-400" />
                  <span className="text-sm font-medium text-white">AI Response</span>
                  <span className="text-xs text-gray-600">
                    based on {selectedIds.size} reel{selectedIds.size !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setResult(""); setPrompt(""); }}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-surface-hover transition-all"
                    title="Clear"
                  >
                    <RefreshCw size={13} />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-surface-hover transition-all"
                    title="Copy"
                  >
                    {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              {/* Result content */}
              <div className="px-4 py-4">
                <div className="prose prose-sm prose-invert max-w-none">
                  {result.split("\n").map((line, i) => {
                    if (!line.trim()) return <div key={i} className="h-2" />;
                    if (line.startsWith("# ")) return <h3 key={i} className="text-base font-bold text-white mt-3 mb-1">{line.slice(2)}</h3>;
                    if (line.startsWith("## ")) return <h4 key={i} className="text-sm font-semibold text-gray-200 mt-2 mb-1">{line.slice(3)}</h4>;
                    if (line.startsWith("- ") || line.startsWith("• ")) {
                      return (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-300 my-1">
                          <span className="text-brand-400 mt-0.5 shrink-0">•</span>
                          <span>{line.slice(2)}</span>
                        </div>
                      );
                    }
                    if (/^\d+\./.test(line)) {
                      return (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-300 my-1">
                          <span className="text-brand-400 font-mono text-xs mt-0.5 shrink-0 w-4">{line.match(/^\d+/)?.[0]}.</span>
                          <span>{line.replace(/^\d+\.\s*/, "")}</span>
                        </div>
                      );
                    }
                    if (line.startsWith("**") && line.endsWith("**")) {
                      return <p key={i} className="text-sm font-semibold text-white my-1">{line.slice(2, -2)}</p>;
                    }
                    return <p key={i} className="text-sm text-gray-300 leading-relaxed my-1">{line}</p>;
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Empty prompt state */}
          {!result && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500/20 to-violet-500/20 border border-brand-500/20 flex items-center justify-center text-3xl mb-4">
                🧠
              </div>
              <h3 className="font-semibold text-white mb-2">Your AI thinking partner</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Select reels from the left, choose or type a prompt, and let AI connect the dots between everything you've saved.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReelSelectCard({
  reel,
  selected,
  onToggle,
}: {
  reel: Reel;
  selected: boolean;
  onToggle: () => void;
}) {
  const catConfig = getCategoryById(reel.category);
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full text-left p-3 rounded-xl border transition-all",
        selected
          ? "border-brand-500/40 bg-brand-500/10"
          : "border-surface-border bg-surface-hover hover:border-gray-600"
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox */}
        <div className={cn(
          "w-4 h-4 rounded-md border shrink-0 mt-0.5 flex items-center justify-center transition-all",
          selected ? "bg-brand-500 border-brand-500 text-white" : "border-surface-border"
        )}>
          {selected && <Check size={10} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs">{catConfig.emoji}</span>
            <span className="text-xs font-medium text-white truncate">{reel.title}</span>
          </div>
          {reel.ai_summary ? (
            <p className="text-xs text-gray-500 line-clamp-2">{reel.ai_summary}</p>
          ) : reel.description ? (
            <p className="text-xs text-gray-600 line-clamp-2">{reel.description}</p>
          ) : null}
          {reel.ai_summary && (
            <span className="inline-flex items-center gap-0.5 text-xs text-brand-400 mt-1">
              <Sparkles size={9} /> AI analysed
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
