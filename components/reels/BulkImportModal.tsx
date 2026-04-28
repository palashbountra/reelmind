"use client";

import { useState, useRef } from "react";
import {
  X, Upload, Link2, Play, CheckCircle2, XCircle,
  AlertCircle, Loader2, FileJson, ChevronRight, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/lib/store";
import { createReel } from "@/lib/db/reels";
import { isValidInstagramUrl, cn } from "@/lib/utils";
import { getAllCategories } from "@/lib/categories";
import { getAllProjects } from "@/lib/projects";
import type { ReelCategory } from "@/lib/types";
import toast from "react-hot-toast";

interface ImportReel {
  url: string;
  status: "pending" | "running" | "done" | "error";
  title?: string;
  error?: string;
}

type Tab = "paste" | "instagram-json";

export function BulkImportModal() {
  const { bulkImportOpen, setBulkImportOpen, addReel } = useAppStore();
  const [tab, setTab] = useState<Tab>("paste");

  // Paste tab state
  const [rawText, setRawText] = useState("");
  const [parsedUrls, setParsedUrls] = useState<string[]>([]);
  const [urlError, setUrlError] = useState("");

  // JSON tab state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonParsed, setJsonParsed] = useState<string[]>([]);
  const [jsonFileName, setJsonFileName] = useState("");

  // Shared state
  const [category, setCategory] = useState<ReelCategory>("other");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [runAI, setRunAI] = useState(false);
  const [importing, setImporting] = useState(false);
  const [items, setItems] = useState<ImportReel[]>([]);
  const [phase, setPhase] = useState<"config" | "running" | "done">("config");

  const allCats = getAllCategories();
  const allProjects = getAllProjects();

  function close() {
    if (importing) return;
    setBulkImportOpen(false);
    setTimeout(() => {
      setTab("paste");
      setRawText("");
      setParsedUrls([]);
      setJsonParsed([]);
      setJsonFileName("");
      setUrlError("");
      setCategory("other");
      setSelectedProjects([]);
      setRunAI(false);
      setItems([]);
      setPhase("config");
    }, 300);
  }

  // ── Parse pasted text ──────────────────────────────────────────────────────
  function handleParsePaste() {
    setUrlError("");
    const lines = rawText
      .split(/[\n,\s]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const valid: string[] = [];
    const invalid: string[] = [];

    for (const line of lines) {
      if (isValidInstagramUrl(line)) valid.push(line);
      else if (line.startsWith("http")) invalid.push(line);
    }

    if (valid.length === 0) {
      setUrlError("No valid Instagram reel URLs found. Make sure each URL starts with https://www.instagram.com/reel/ or /p/");
      return;
    }
    if (invalid.length > 0) {
      setUrlError(`${valid.length} valid URLs found. ${invalid.length} skipped (not Instagram reel URLs).`);
    }
    setParsedUrls([...new Set(valid)]); // deduplicate
  }

  // ── Parse Instagram JSON export ────────────────────────────────────────────
  function handleJsonUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;

        // Try to extract all Instagram URLs from the JSON regardless of structure
        const urlMatches = text.match(/https?:\/\/(www\.)?instagram\.com\/[^\s"'\\]+/g) ?? [];
        const valid = urlMatches.filter((u) => isValidInstagramUrl(u));
        const unique = [...new Set(valid)];

        if (unique.length === 0) {
          toast.error("No Instagram reel URLs found in this file. Make sure you exported saved posts from Instagram.");
          return;
        }

        setJsonParsed(unique);
        toast.success(`Found ${unique.length} Instagram URLs in your export`);
      } catch {
        toast.error("Could not read the file. Make sure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);
  }

  const activeUrls = tab === "paste" ? parsedUrls : jsonParsed;

  function toggleProject(id: string) {
    setSelectedProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  // ── Run the import ─────────────────────────────────────────────────────────
  async function handleImport() {
    if (activeUrls.length === 0) return;

    const initial: ImportReel[] = activeUrls.map((url) => ({
      url,
      status: "pending",
    }));
    setItems(initial);
    setPhase("running");
    setImporting(true);

    let done = 0;
    let failed = 0;

    for (let i = 0; i < initial.length; i++) {
      // Mark as running
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: "running" } : it))
      );

      try {
        // 1. Fetch metadata
        let title = "Instagram Reel";
        let description: string | null = null;

        try {
          const metaRes = await fetch("/api/metadata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: initial[i].url }),
          });
          if (metaRes.ok) {
            const meta = await metaRes.json();
            title = meta.title || title;
            description = meta.description || null;
          }
        } catch {
          // Continue even if metadata fetch fails
        }

        // 2. Optionally run AI
        let ai_summary: string | null = null;
        let ai_ideas: string[] | null = null;
        let ai_action_items: string[] | null = null;
        let ai_tags: string[] = [];
        let ai_category = category;

        if (runAI) {
          try {
            const aiRes = await fetch("/api/analyse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, description: description || "" }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              ai_summary = aiData.summary ?? null;
              ai_ideas = aiData.ideas ?? null;
              ai_action_items = aiData.action_items ?? null;
              ai_tags = aiData.tags ?? [];
              if (aiData.category) ai_category = aiData.category;
            }
          } catch {
            // Continue without AI
          }
        }

        // 3. Save to DB
        const reel = await createReel({
          url: initial[i].url,
          title,
          description,
          thumbnail_url: null,
          author_name: null,
          author_url: null,
          category: ai_category,
          tags: ai_tags,
          project_tags: selectedProjects,
          status: "unread",
          notes: null,
          ai_summary,
          ai_ideas,
          ai_action_items,
          reminder_date: null,
          is_favourite: false,
        });

        addReel(reel);
        done++;

        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "done", title } : it
          )
        );
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : "Failed";
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: "error", error: msg } : it
          )
        );
      }

      // Small delay to avoid hammering APIs
      if (i < initial.length - 1) await new Promise((r) => setTimeout(r, 300));
    }

    setImporting(false);
    setPhase("done");
    toast.success(`Imported ${done} reel${done !== 1 ? "s" : ""}${failed > 0 ? ` · ${failed} failed` : ""}`);
  }

  if (!bulkImportOpen) return null;

  const doneCount = items.filter((i) => i.status === "done").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const runningIdx = items.findIndex((i) => i.status === "running");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <div className="relative w-full max-w-2xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
          <div>
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Upload size={16} className="text-brand-400" /> Bulk Import Reels
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add 10–200 reels at once from Instagram
            </p>
          </div>
          <button
            onClick={close}
            disabled={importing}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-surface-hover transition-all disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Config phase ── */}
          {phase === "config" && (
            <div className="px-6 py-5 space-y-5">
              {/* Tab switcher */}
              <div className="flex gap-1 p-1 bg-surface-hover rounded-xl border border-surface-border">
                <button
                  onClick={() => setTab("paste")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all",
                    tab === "paste"
                      ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <Link2 size={13} /> Paste URLs
                </button>
                <button
                  onClick={() => setTab("instagram-json")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all",
                    tab === "instagram-json"
                      ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  <FileJson size={13} /> Instagram Export
                </button>
              </div>

              {/* Paste URLs tab */}
              {tab === "paste" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">
                      Paste Instagram URLs — one per line
                    </label>
                    <textarea
                      value={rawText}
                      onChange={(e) => { setRawText(e.target.value); setParsedUrls([]); setUrlError(""); }}
                      placeholder={"https://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/reel/DEF456/\nhttps://www.instagram.com/p/GHI789/"}
                      rows={6}
                      className="w-full px-3 py-3 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-700 outline-none focus:border-brand-500/40 transition-all resize-none font-mono text-xs"
                    />
                  </div>
                  {urlError && (
                    <p className="flex items-start gap-1.5 text-xs text-amber-400">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" /> {urlError}
                    </p>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleParsePaste}
                    disabled={!rawText.trim()}
                  >
                    Parse URLs
                  </Button>
                  {parsedUrls.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                      <span className="text-sm text-green-300">
                        {parsedUrls.length} valid reel{parsedUrls.length !== 1 ? "s" : ""} ready to import
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Instagram JSON tab */}
              {tab === "instagram-json" && (
                <div className="space-y-3">
                  <div className="p-4 bg-brand-500/5 border border-brand-500/20 rounded-xl space-y-2">
                    <p className="text-xs font-medium text-brand-300">How to export from Instagram:</p>
                    <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
                      <li>Open Instagram → Settings → <strong className="text-gray-300">Your Activity</strong></li>
                      <li>Tap <strong className="text-gray-300">Download your information</strong></li>
                      <li>Select <strong className="text-gray-300">Saved posts</strong> (or All data)</li>
                      <li>Choose <strong className="text-gray-300">JSON format</strong> → Request download</li>
                      <li>Instagram emails you a zip — unzip and upload the <code className="text-brand-300">saved_posts.json</code> file here</li>
                    </ol>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      onChange={handleJsonUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-surface-border rounded-xl text-gray-500 hover:border-brand-500/40 hover:text-brand-400 transition-all"
                    >
                      <FileJson size={28} />
                      <span className="text-sm">{jsonFileName || "Click to upload saved_posts.json"}</span>
                      <span className="text-xs text-gray-700">or any Instagram data export JSON file</span>
                    </button>
                  </div>
                  {jsonParsed.length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                      <span className="text-sm text-green-300">
                        {jsonParsed.length} Instagram URLs found in export
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Settings — category, projects, AI */}
              {activeUrls.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-surface-border">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    Import settings (applies to all {activeUrls.length} reels)
                  </p>

                  {/* Category */}
                  <div>
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">Default Category</label>
                    <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {allCats.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={cn(
                            "px-2 py-1.5 rounded-lg text-xs border transition-all text-left truncate",
                            category === cat.id
                              ? "bg-brand-500/20 border-brand-500/50 text-brand-300"
                              : "border-surface-border text-gray-500 hover:border-gray-600 hover:text-gray-300"
                          )}
                        >
                          {cat.emoji} {cat.label}
                        </button>
                      ))}
                    </div>
                    {runAI && (
                      <p className="text-xs text-gray-600 mt-1">
                        ✨ AI will suggest the best category per reel automatically
                      </p>
                    )}
                  </div>

                  {/* Project tags */}
                  <div>
                    <label className="block text-xs text-gray-400 font-medium mb-1.5">
                      Tag to Projects (optional — select all that apply)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {allProjects.map((proj) => {
                        const active = selectedProjects.includes(proj.id);
                        return (
                          <button
                            key={proj.id}
                            onClick={() => toggleProject(proj.id)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all",
                              active
                                ? proj.color + " font-medium"
                                : "border-surface-border text-gray-500 hover:border-gray-600 hover:text-gray-300"
                            )}
                          >
                            <span>{proj.emoji}</span> {proj.label}
                            {active && <span className="text-current opacity-60">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI toggle */}
                  <div className="flex items-start gap-3 p-3 bg-surface-hover border border-surface-border rounded-xl">
                    <button
                      onClick={() => setRunAI(!runAI)}
                      className={cn(
                        "w-8 h-5 rounded-full transition-all shrink-0 mt-0.5 relative",
                        runAI ? "bg-brand-500" : "bg-surface-border"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow",
                          runAI ? "left-3.5" : "left-0.5"
                        )}
                      />
                    </button>
                    <div>
                      <p className="text-sm text-white font-medium flex items-center gap-1.5">
                        <Sparkles size={12} className="text-brand-400" />
                        Run AI analysis on each reel
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Uses Groq to extract summary, ideas, and action items. Adds ~2s per reel.
                        {activeUrls.length > 30 && (
                          <span className="text-amber-400"> For {activeUrls.length} reels, consider importing without AI first, then analysing selectively.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleImport}
                  >
                    <Play size={14} />
                    Import {activeUrls.length} Reel{activeUrls.length !== 1 ? "s" : ""}
                    {runAI && " with AI"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Running / Done phase ── */}
          {(phase === "running" || phase === "done") && (
            <div className="px-6 py-5 space-y-4">
              {/* Progress summary */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {phase === "running" ? "Importing..." : "Import complete"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {doneCount} imported · {errorCount} failed · {items.length - doneCount - errorCount} remaining
                  </p>
                </div>
                {phase === "done" && (
                  <Button size="sm" variant="primary" onClick={close}>
                    Done <ChevronRight size={13} />
                  </Button>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-300"
                  style={{ width: `${Math.round(((doneCount + errorCount) / items.length) * 100)}%` }}
                />
              </div>

              {/* Item list */}
              <ul className="space-y-1.5 max-h-80 overflow-y-auto">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl border text-xs transition-all",
                      item.status === "done"
                        ? "bg-green-500/5 border-green-500/20"
                        : item.status === "error"
                        ? "bg-red-500/5 border-red-500/20"
                        : item.status === "running"
                        ? "bg-brand-500/10 border-brand-500/30"
                        : "bg-surface-hover border-surface-border opacity-50"
                    )}
                  >
                    <span className="shrink-0">
                      {item.status === "done" && <CheckCircle2 size={14} className="text-green-400" />}
                      {item.status === "error" && <XCircle size={14} className="text-red-400" />}
                      {item.status === "running" && <Loader2 size={14} className="text-brand-400 animate-spin" />}
                      {item.status === "pending" && <div className="w-3.5 h-3.5 rounded-full border border-gray-700" />}
                    </span>
                    <span className="flex-1 truncate text-gray-300">
                      {item.title || item.url.replace("https://www.instagram.com/", "instagram.com/")}
                    </span>
                    {item.status === "error" && (
                      <span className="text-red-400 truncate shrink-0 max-w-[140px]">{item.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
