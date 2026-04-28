"use client";

import { useState, useEffect } from "react";
import { X, Link2, Sparkles, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { createReel } from "@/lib/db/reels";
import { isValidInstagramUrl, cn } from "@/lib/utils";
import { getAllCategories } from "@/lib/categories";
import { getAllProjects } from "@/lib/projects";
import type { ReelCategory, AIAnalysis } from "@/lib/types";
import toast from "react-hot-toast";

type Step = "url" | "details" | "ai" | "done";

export function AddReelModal() {
  const { addReelOpen, setAddReelOpen, addReel } = useAppStore();
  const [step, setStep] = useState<Step>("url");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  // Pick up bookmarklet pre-fill
  useEffect(() => {
    if (addReelOpen) {
      const prefill = sessionStorage.getItem("reelmind_prefill_url");
      if (prefill) {
        setUrl(prefill);
        sessionStorage.removeItem("reelmind_prefill_url");
      }
    }
  }, [addReelOpen]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<ReelCategory>("other");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // AI state
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [aiError, setAiError] = useState("");

  function resetForm() {
    setStep("url");
    setUrl("");
    setUrlError("");
    setTitle("");
    setDescription("");
    setThumbnailUrl(null);
    setCategory("other");
    setSelectedProjects([]);
    setNotes("");
    setAnalysis(null);
    setAiError("");
  }

  function handleClose() {
    setAddReelOpen(false);
    setTimeout(resetForm, 300);
  }

  async function handleFetchMetadata() {
    setUrlError("");
    if (!url.trim()) { setUrlError("Please paste an Instagram reel URL"); return; }
    if (!isValidInstagramUrl(url)) { setUrlError("That doesn't look like an Instagram reel URL"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setTitle(data.title || "Instagram Reel");
      setDescription(data.description || "");
      setThumbnailUrl(data.thumbnail_url || null);
      setStep("details");
    } catch {
      // Still proceed with manual entry
      setTitle("Instagram Reel");
      setStep("details");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunAI() {
    setAnalysing(true);
    setAiError("");
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI analysis failed");
      }
      const data: AIAnalysis = await res.json();
      setAnalysis(data);
      if (data.category) setCategory(data.category);
      setStep("ai");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI analysis failed";
      setAiError(msg);
      setStep("ai"); // Still go to AI step to show error + manual option
    } finally {
      setAnalysing(false);
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      const reel = await createReel({
        url,
        title: title || "Instagram Reel",
        description: description || null,
        thumbnail_url: thumbnailUrl,
        author_name: "Instagram",
        author_url: "https://instagram.com",
        category,
        tags: analysis?.tags ?? [],
        project_tags: selectedProjects,
        status: "unread",
        notes: notes || null,
        ai_summary: analysis?.summary ?? null,
        ai_ideas: analysis?.ideas ?? null,
        ai_action_items: analysis?.action_items ?? null,
        reminder_date: null,
        is_favourite: false,
      });
      addReel(reel);
      toast.success("Reel saved! 🎬");
      handleClose();
    } catch (err) {
      toast.error("Failed to save reel");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!addReelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="font-semibold text-white">Add a Reel</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === "url" && "Paste an Instagram reel URL"}
              {step === "details" && "Review and edit details"}
              {step === "ai" && "AI analysis results"}
            </p>
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-surface-hover transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 px-6 pt-4">
          {(["url", "details", "ai"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                step === s ? "bg-brand-500" :
                (["url", "details", "ai"] as Step[]).indexOf(step) > i ? "bg-brand-500/50" : "bg-surface-border"
              )}
            />
          ))}
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Step 1: URL */}
          {step === "url" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Instagram Reel URL</label>
                <div className="relative">
                  <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFetchMetadata()}
                    placeholder="https://www.instagram.com/reel/..."
                    className={cn(
                      "w-full pl-9 pr-4 py-3 bg-surface-hover border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all",
                      urlError ? "border-red-500/50 focus:border-red-500" : "border-surface-border focus:border-brand-500/50"
                    )}
                    autoFocus
                  />
                </div>
                {urlError && (
                  <p className="flex items-center gap-1 text-xs text-red-400 mt-1.5">
                    <AlertCircle size={12} /> {urlError}
                  </p>
                )}
              </div>

              <div className="bg-surface-hover border border-surface-border rounded-xl p-3 text-xs text-gray-500">
                <p className="font-medium text-gray-400 mb-1">📱 How to get the URL:</p>
                <p>On Instagram → open the reel → tap ··· → Copy link</p>
              </div>

              <Button variant="primary" className="w-full" loading={loading} onClick={handleFetchMetadata}>
                Fetch Reel Details →
              </Button>
            </div>
          )}

          {/* Step 2: Details */}
          {step === "details" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surface-hover border border-surface-border rounded-xl text-sm text-white outline-none focus:border-brand-500/50 transition-all"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Description / Caption</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-surface-hover border border-surface-border rounded-xl text-sm text-white outline-none focus:border-brand-500/50 transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Category</label>
                <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {getAllCategories().map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-xs border transition-all text-left",
                        category === cat.id
                          ? "bg-brand-500/20 border-brand-500/50 text-brand-300"
                          : "border-surface-border text-gray-500 hover:border-gray-600 hover:text-gray-300"
                      )}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Project tags */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Tag to Projects (optional)</label>
                <div className="flex flex-wrap gap-1.5">
                  {getAllProjects().map((proj) => {
                    const active = selectedProjects.includes(proj.id);
                    return (
                      <button
                        key={proj.id}
                        onClick={() => setSelectedProjects((prev) =>
                          prev.includes(proj.id) ? prev.filter((p) => p !== proj.id) : [...prev, proj.id]
                        )}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all",
                          active ? proj.color + " font-medium" : "border-surface-border text-gray-500 hover:border-gray-600 hover:text-gray-300"
                        )}
                      >
                        {proj.emoji} {proj.label}
                        {active && <span className="ml-0.5 opacity-60">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Personal Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why did you save this? What do you want to do with it?"
                  rows={2}
                  className="w-full px-3 py-2.5 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/50 transition-all resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { handleSave(); }} loading={loading} className="flex-1">
                  Save without AI
                </Button>
                <Button variant="primary" onClick={handleRunAI} loading={analysing} className="flex-1">
                  <Sparkles size={14} />
                  Analyse with AI
                </Button>
              </div>
              {aiError === "" && analysing && (
                <p className="text-xs text-center text-gray-500">Running AI analysis with Groq Llama 3...</p>
              )}
            </div>
          )}

          {/* Step 3: AI Results */}
          {step === "ai" && (
            <div className="space-y-4">
              {aiError ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    {aiError.includes("GROQ_API_KEY")
                      ? "Add your free GROQ_API_KEY to .env.local to enable AI analysis. See README."
                      : aiError}
                  </p>
                </div>
              ) : analysis ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3">
                    <p className="text-xs text-brand-300 font-medium mb-1 flex items-center gap-1">
                      <Sparkles size={11} /> AI Summary
                    </p>
                    <p className="text-xs text-gray-300 leading-relaxed">{analysis.summary}</p>
                  </div>

                  {/* Ideas */}
                  {analysis.ideas.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1.5">💡 Ideas generated</p>
                      <ul className="space-y-1">
                        {analysis.ideas.map((idea, i) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                            <span className="text-brand-400 mt-0.5">•</span> {idea}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action items */}
                  {analysis.action_items.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1.5">✅ Action items</p>
                      <ul className="space-y-1">
                        {analysis.action_items.map((item, i) => (
                          <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                            <Check size={10} className="text-green-400 mt-0.5 shrink-0" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tags */}
                  {analysis.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {analysis.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-0.5 bg-surface-hover border border-surface-border rounded-full text-gray-500">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <Button variant="primary" className="w-full" loading={loading} onClick={handleSave}>
                <Check size={14} /> Save to ReelMind
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
