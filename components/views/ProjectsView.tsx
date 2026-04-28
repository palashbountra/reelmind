"use client";

import { useState, useMemo } from "react";
import {
  Sparkles, Send, FolderOpen, Plus, Loader2,
  RefreshCw, Copy, Check, ChevronRight, Lightbulb
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getAllProjects, loadCustomProjects, saveCustomProjects, createProject } from "@/lib/projects";
import { getCategoryById } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/lib/projects";
import type { Reel } from "@/lib/types";
import toast from "react-hot-toast";

const PROJECT_PROMPTS = [
  "What patterns in these reels are most relevant to my current work?",
  "Summarise the key ideas I should act on for this project",
  "What frameworks or mental models in these reels apply here?",
  "What are the 3 highest-impact things I can take from these reels?",
  "How do these reels connect? What's the common thread?",
];

export function ProjectsView() {
  const { reels, setBulkImportOpen } = useAppStore();
  const [projects, setProjects] = useState<Project[]>(getAllProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Ideation state
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Add project state
  const [addingProject, setAddingProject] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎯");
  const [newDesc, setNewDesc] = useState("");

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const projectReels = useMemo(() => {
    if (!selectedProjectId) return [];
    return reels.filter(
      (r) => r.status !== "archived" && r.project_tags?.includes(selectedProjectId)
    );
  }, [reels, selectedProjectId]);

  // Count reels per project
  function countReels(projectId: string) {
    return reels.filter(
      (r) => r.status !== "archived" && r.project_tags?.includes(projectId)
    ).length;
  }

  async function handleSynthesize() {
    if (!prompt.trim() || projectReels.length === 0) return;
    setLoading(true);
    setResult("");
    try {
      const reelsPayload = projectReels.slice(0, 20).map((r) => ({
        title: r.title,
        description: r.description || "",
        summary: r.ai_summary || "",
      }));

      const contextPrompt = `Context: I'm working on "${selectedProject?.label}" — ${selectedProject?.description}.\n\n${prompt}`;

      const res = await fetch("/api/ideate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reels: reelsPayload, prompt: contextPrompt }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Synthesis failed");
      }

      const data = await res.json();
      setResult(data.ideas);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Synthesis failed";
      if (msg.includes("GROQ_API_KEY")) {
        toast.error("Add your GROQ_API_KEY to .env.local to enable AI synthesis");
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

  function handleAddProject() {
    if (!newLabel.trim()) { toast.error("Enter a project name"); return; }
    const proj = createProject(newLabel, newEmoji, newDesc);
    const custom = loadCustomProjects();
    if (custom.some((p) => p.id === proj.id)) {
      toast.error("A project with that name already exists");
      return;
    }
    const updated = [...custom, proj];
    saveCustomProjects(updated);
    setProjects(getAllProjects());
    setNewLabel("");
    setNewEmoji("🎯");
    setNewDesc("");
    setAddingProject(false);
    toast.success(`"${proj.label}" project added`);
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left — project list */}
      <div className="w-72 shrink-0 border-r border-surface-border flex flex-col">
        <div className="px-4 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-white text-sm flex items-center gap-2">
            <FolderOpen size={16} className="text-brand-400" />
            My Projects
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Tag reels to projects — get AI insights per project
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {projects.map((proj) => {
            const count = countReels(proj.id);
            return (
              <button
                key={proj.id}
                onClick={() => {
                  setSelectedProjectId(proj.id);
                  setResult("");
                  setPrompt("");
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl border transition-all",
                  selectedProjectId === proj.id
                    ? "border-brand-500/40 bg-brand-500/10"
                    : "border-surface-border bg-surface-hover hover:border-gray-600"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{proj.emoji}</span>
                    <span className="text-sm font-medium text-white truncate">{proj.label}</span>
                  </span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full border shrink-0 ml-2",
                    count > 0
                      ? "bg-brand-500/20 text-brand-300 border-brand-500/30"
                      : "text-gray-700 border-surface-border"
                  )}>
                    {count}
                  </span>
                </div>
                {proj.description && (
                  <p className="text-xs text-gray-600 mt-0.5 truncate">{proj.description}</p>
                )}
              </button>
            );
          })}

          {/* Add project */}
          {addingProject ? (
            <div className="p-3 bg-surface-card border border-surface-border rounded-xl space-y-2 mt-2">
              <div className="flex gap-2">
                <input
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="w-10 text-center px-1 py-1.5 bg-surface-hover border border-surface-border rounded-lg text-sm outline-none"
                  maxLength={2}
                  placeholder="🎯"
                />
                <input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                  placeholder="Project name"
                  autoFocus
                  className="flex-1 px-2 py-1.5 bg-surface-hover border border-surface-border rounded-lg text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40"
                />
              </div>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Short description (optional)"
                className="w-full px-2 py-1.5 bg-surface-hover border border-surface-border rounded-lg text-xs text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40"
              />
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setAddingProject(false)}>Cancel</Button>
                <Button size="sm" variant="primary" onClick={handleAddProject}>
                  <Check size={11} /> Add
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingProject(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-600 hover:text-gray-400 hover:bg-surface-hover transition-all mt-1"
            >
              <Plus size={11} /> Add project
            </button>
          )}
        </div>

        {/* Bulk import shortcut */}
        <div className="px-3 py-3 border-t border-surface-border">
          <button
            onClick={() => setBulkImportOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-brand-400 border border-brand-500/20 hover:bg-brand-500/10 transition-all"
          >
            <Plus size={12} /> Bulk import reels
          </button>
        </div>
      </div>

      {/* Right — project workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedProject ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-surface-hover border border-surface-border flex items-center justify-center text-3xl mb-4">
              🗂️
            </div>
            <h3 className="font-semibold text-white mb-2">Select a project</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Tag reels to your active projects — EFL Dashboard, Interlink, Stock Market — then ask AI to synthesise insights specifically for that project.
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setBulkImportOpen(true)}>
                <Plus size={12} /> Bulk import reels
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Project header */}
            <div className="px-6 py-5 border-b border-surface-border shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{selectedProject.emoji}</span>
                    <span>{selectedProject.label}</span>
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedProject.description}</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs border font-medium",
                  selectedProject.color
                )}>
                  {projectReels.length} reel{projectReels.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {projectReels.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <div className="w-14 h-14 rounded-2xl bg-surface-hover border border-surface-border flex items-center justify-center text-2xl mb-3">
                    {selectedProject.emoji}
                  </div>
                  <h3 className="font-semibold text-white mb-1">No reels tagged to {selectedProject.label} yet</h3>
                  <p className="text-sm text-gray-500 mb-4 max-w-sm">
                    When you add reels, tag them to this project and they'll show up here. Use Bulk Import to bring in all your saved reels at once.
                  </p>
                  <Button size="sm" variant="primary" onClick={() => setBulkImportOpen(true)}>
                    <Plus size={12} /> Bulk import & tag to {selectedProject.label}
                  </Button>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-6">
                  {/* Prompt suggestions */}
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">
                      💡 Ask AI about your {projectReels.length} {selectedProject.label} reels...
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PROJECT_PROMPTS.map((s) => (
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

                  {/* Synthesis input */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 font-medium">
                      Ask anything about these reels in the context of {selectedProject.label}
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSynthesize();
                      }}
                      placeholder={`What do these reels tell me about working on ${selectedProject.label}?`}
                      rows={3}
                      className="w-full px-4 py-3 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 transition-all resize-none"
                    />
                    <Button
                      variant="primary"
                      onClick={handleSynthesize}
                      loading={loading}
                      disabled={projectReels.length === 0 || !prompt.trim()}
                      className="w-full"
                    >
                      <Sparkles size={14} />
                      {loading ? "Synthesising..." : `Synthesise for ${selectedProject.label}`}
                      {!loading && <Send size={13} />}
                    </Button>
                    {projectReels.length > 20 && (
                      <p className="text-xs text-gray-600 text-center">
                        Using top 20 of {projectReels.length} reels for synthesis
                      </p>
                    )}
                  </div>

                  {/* AI result */}
                  {loading && (
                    <div className="flex items-center justify-center py-10 gap-3 text-gray-500">
                      <Loader2 size={20} className="animate-spin text-brand-400" />
                      <span className="text-sm">Connecting your {projectReels.length} reels to {selectedProject.label}...</span>
                    </div>
                  )}

                  {result && !loading && (
                    <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden animate-fade-in">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-brand-500/5">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-brand-400" />
                          <span className="text-sm font-medium text-white">
                            {selectedProject.emoji} {selectedProject.label} Insights
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
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
                            return <p key={i} className="text-sm text-gray-300 leading-relaxed my-1">{line}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reel list */}
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">
                      Reels tagged to {selectedProject.label} ({projectReels.length})
                    </p>
                    <div className="space-y-2">
                      {projectReels.map((reel) => (
                        <ReelProjectCard key={reel.id} reel={reel} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReelProjectCard({ reel }: { reel: Reel }) {
  const catConfig = getCategoryById(reel.category);
  return (
    <div className="flex items-start gap-3 p-3 bg-surface-card border border-surface-border rounded-xl hover:border-gray-600 transition-all">
      <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-base shrink-0">
        {catConfig.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{reel.title}</p>
        {reel.ai_summary ? (
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{reel.ai_summary}</p>
        ) : reel.description ? (
          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{reel.description}</p>
        ) : null}
        {reel.ai_action_items && reel.ai_action_items.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {reel.ai_action_items.slice(0, 2).map((item, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                ✓ {item.slice(0, 40)}{item.length > 40 ? "…" : ""}
              </span>
            ))}
          </div>
        )}
      </div>
      {reel.ai_summary && (
        <span className="text-xs text-brand-400 shrink-0 flex items-center gap-0.5">
          <Lightbulb size={10} /> AI
        </span>
      )}
    </div>
  );
}
