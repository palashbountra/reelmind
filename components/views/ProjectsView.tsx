"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Sparkles, Send, FolderOpen, Plus, Loader2,
  Copy, Check, Lightbulb, Trash2,
  FileText, ChevronDown, ChevronUp, Download,
  ArrowRight, Target, CheckSquare, RefreshCw,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  getAllProjects, loadCustomProjects, saveCustomProjects,
  createProject, deleteProject, getProjectPlan, setProjectPlan,
} from "@/lib/projects";
import { getCategoryById, getAllCategories } from "@/lib/categories";
import { updateReel } from "@/lib/db/reels";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { Project } from "@/lib/projects";
import type { Reel } from "@/lib/types";
import toast from "react-hot-toast";

type Step = "define" | "import" | "plan" | "execute";

const STEP_CONFIG: { id: Step; label: string; icon: string; desc: string }[] = [
  { id: "define",  label: "Define",  icon: "🎯", desc: "Set your project goal" },
  { id: "import",  label: "Import",  icon: "📥", desc: "Pull in your reels" },
  { id: "plan",    label: "Plan",    icon: "🧠", desc: "AI synthesis + notes" },
  { id: "execute", label: "Execute", icon: "⚡", desc: "Convert plan to tasks" },
];

const PROJECT_PROMPTS = [
  "What patterns in these reels are most relevant to my current work?",
  "Summarise the key ideas I should act on for this project",
  "What frameworks or mental models apply here?",
  "What are the 3 highest-impact things I can take from these reels?",
  "How do these reels connect? What's the common thread?",
];

export function ProjectsView() {
  const { reels, setBulkImportOpen, updateReel: storeUpdate, pendingProjectId, setPendingProjectId, setPendingTaskTitle, setActiveView } = useAppStore();
  const [projects, setProjects] = useState<Project[]>(getAllProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<Step>("define");

  // Ideation state
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Plan editor
  const [planText, setPlanText] = useState("");
  const [planSaving, setPlanSaving] = useState(false);
  const planSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Import from categories
  const [importCategoryId, setImportCategoryId] = useState<string>("all");
  const [importSelectedIds, setImportSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  // Add project
  const [addingProject, setAddingProject] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎯");
  const [newDesc, setNewDesc] = useState("");

  // Project description edit
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  const allCategories = getAllCategories();
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  // Pick up pendingProjectId from Ideate
  useEffect(() => {
    if (pendingProjectId) {
      setSelectedProjectId(pendingProjectId);
      setActiveStep("plan");
      setPendingProjectId(null);
    }
  }, [pendingProjectId, setPendingProjectId]);

  // Load plan when project changes
  useEffect(() => {
    if (selectedProjectId) {
      setPlanText(getProjectPlan(selectedProjectId));
    }
  }, [selectedProjectId]);

  const projectReels = useMemo(() => {
    if (!selectedProjectId) return [];
    return reels.filter((r) => r.status !== "archived" && r.project_tags?.includes(selectedProjectId));
  }, [reels, selectedProjectId]);

  const importCandidates = useMemo(() => {
    if (!selectedProjectId) return [];
    return reels.filter((r) => {
      if (r.status === "archived") return false;
      if ((r.project_tags ?? []).includes(selectedProjectId)) return false;
      if (importCategoryId === "all") return true;
      return r.category === importCategoryId || (r.extra_categories ?? []).includes(importCategoryId);
    });
  }, [reels, selectedProjectId, importCategoryId]);

  function countReels(projectId: string) {
    return reels.filter((r) => r.status !== "archived" && r.project_tags?.includes(projectId)).length;
  }

  const handlePlanChange = useCallback((text: string) => {
    setPlanText(text);
    if (planSaveTimeout.current) clearTimeout(planSaveTimeout.current);
    planSaveTimeout.current = setTimeout(() => {
      if (selectedProjectId) {
        setPlanSaving(true);
        setProjectPlan(selectedProjectId, text);
        setTimeout(() => setPlanSaving(false), 600);
      }
    }, 800);
  }, [selectedProjectId]);

  async function handleSynthesize() {
    if (!prompt.trim() || projectReels.length === 0) return;
    setLoading(true); setResult("");
    try {
      const reelsPayload = projectReels.slice(0, 20).map((r) => ({
        title: r.title, description: r.description || "", summary: r.ai_summary || "",
      }));
      const res = await fetch("/api/ideate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reels: reelsPayload,
          prompt: `Context: working on "${selectedProject?.label}" — ${selectedProject?.description ?? ""}.\n\n${prompt}`,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Synthesis failed"); }
      const data = await res.json();
      setResult(data.ideas);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Synthesis failed";
      toast.error(msg.includes("GROQ_API_KEY") ? "Add your GROQ_API_KEY to .env.local" : msg);
    } finally { setLoading(false); }
  }

  function handleSaveResultToPlan() {
    if (!result || !selectedProjectId) return;
    const sep = planText ? "\n\n---\n\n" : "";
    const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    handlePlanChange(planText + sep + `### AI Synthesis — ${date}\n\n${result}`);
    toast.success("Added to project plan");
  }

  async function handleImportReels() {
    if (importSelectedIds.size === 0 || !selectedProjectId) return;
    setImporting(true);
    try {
      await Promise.all(Array.from(importSelectedIds).map(async (reelId) => {
        const reel = reels.find((r) => r.id === reelId);
        if (!reel) return;
        const next = Array.from(new Set([...(reel.project_tags ?? []), selectedProjectId]));
        await updateReel(reelId, { project_tags: next });
        storeUpdate(reelId, { project_tags: next });
      }));
      toast.success(`${importSelectedIds.size} reel${importSelectedIds.size !== 1 ? "s" : ""} added to ${selectedProject?.label}`);
      setImportSelectedIds(new Set());
      // Auto advance to plan step after importing
      setActiveStep("plan");
    } catch { toast.error("Failed to import some reels"); }
    finally { setImporting(false); }
  }

  function handleDeleteProject(proj: Project) {
    if (!confirm(`Delete "${proj.label}"? This won't affect your reels.`)) return;
    deleteProject(proj.id);
    setProjects(getAllProjects());
    if (selectedProjectId === proj.id) setSelectedProjectId(null);
    toast.success(`"${proj.label}" removed`);
  }

  function handleAddProject() {
    if (!newLabel.trim()) { toast.error("Enter a project name"); return; }
    const proj = createProject(newLabel, newEmoji, newDesc);
    const custom = loadCustomProjects();
    if (custom.some((p) => p.id === proj.id)) { toast.error("A project with that name already exists"); return; }
    saveCustomProjects([...custom, proj]);
    setProjects(getAllProjects());
    setNewLabel(""); setNewEmoji("🎯"); setNewDesc(""); setAddingProject(false);
    setSelectedProjectId(proj.id);
    setActiveStep("define");
    toast.success(`"${proj.label}" created`);
  }

  async function handleSaveDesc() {
    if (!selectedProjectId || !selectedProject) return;
    const custom = loadCustomProjects();
    const updated = custom.map((p) => p.id === selectedProjectId ? { ...p, description: descDraft } : p);
    saveCustomProjects(updated);
    setProjects(getAllProjects());
    setEditingDesc(false);
    toast.success("Goal saved");
  }

  // Parse plan text lines into actionable items for Execute step
  const planLines = useMemo(() => {
    if (!planText) return [];
    return planText.split("\n").filter((l) => l.trim()).map((line, i) => {
      const isAction = /^[-•*]\s|^\d+\.\s|^(TODO|TASK|ACTION|DO):/i.test(line.trim());
      const clean = line.replace(/^[-•*\d.]+\s*/, "").replace(/^(TODO|TASK|ACTION|DO):\s*/i, "").trim();
      return { id: i, raw: line, clean, isAction };
    });
  }, [planText]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left sidebar: project list ── */}
      <div className="w-64 shrink-0 border-r border-surface-border flex flex-col">
        <div className="px-4 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-white text-sm flex items-center gap-2">
            <FolderOpen size={16} className="text-brand-400" /> My Projects
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">Click to open workspace</p>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {projects.map((proj) => {
            const count = countReels(proj.id);
            return (
              <div
                key={proj.id}
                className={cn(
                  "group w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-start gap-2",
                  selectedProjectId === proj.id
                    ? "border-brand-500/40 bg-brand-500/10"
                    : "border-surface-border bg-surface-hover hover:border-gray-600"
                )}
              >
                <button
                  onClick={() => { setSelectedProjectId(proj.id); setResult(""); setPrompt(""); setActiveStep("define"); }}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{proj.emoji}</span>
                      <span className="text-sm font-medium text-white truncate">{proj.label}</span>
                    </span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded-full border shrink-0 ml-1", count > 0 ? "bg-brand-500/20 text-brand-300 border-brand-500/30" : "text-gray-700 border-surface-border")}>
                      {count}
                    </span>
                  </div>
                  {proj.description && <p className="text-xs text-gray-600 mt-0.5 truncate">{proj.description}</p>}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-gray-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}

          {addingProject ? (
            <div className="p-3 bg-surface-card border border-surface-border rounded-xl space-y-2 mt-2">
              <div className="flex gap-2">
                <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className="w-10 text-center px-1 py-1.5 bg-surface-hover border border-surface-border rounded-lg text-sm outline-none" maxLength={2} />
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddProject()} placeholder="Project name" autoFocus className="flex-1 px-2 py-1.5 bg-surface-hover border border-surface-border rounded-lg text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40" />
              </div>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Goal / description (optional)" className="w-full px-2 py-1.5 bg-surface-hover border border-surface-border rounded-lg text-xs text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40" />
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setAddingProject(false)}>Cancel</Button>
                <Button size="sm" variant="primary" onClick={handleAddProject}><Check size={11} /> Create</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingProject(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-600 hover:text-gray-400 hover:bg-surface-hover transition-all mt-1">
              <Plus size={11} /> New project
            </button>
          )}
        </div>

        <div className="px-3 py-3 border-t border-surface-border">
          <button onClick={() => setBulkImportOpen(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-brand-400 border border-brand-500/20 hover:bg-brand-500/10 transition-all">
            <Plus size={12} /> Bulk import reels
          </button>
        </div>
      </div>

      {/* ── Right: project workspace ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedProject ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-surface-hover border border-surface-border flex items-center justify-center text-3xl mb-4">🗂️</div>
            <h3 className="font-semibold text-white mb-2">Select or create a project</h3>
            <p className="text-sm text-gray-500 max-w-sm">Each project has a 4-step workspace: Define your goal, import relevant reels, synthesise with AI, then execute as tasks.</p>
            <button onClick={() => setAddingProject(true)} className="mt-5 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-medium rounded-xl">
              <Plus size={14} /> Create first project
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* ── Project header ── */}
            <div className="px-6 py-4 border-b border-surface-border sticky top-0 bg-[#0f0f13] z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedProject.emoji} {selectedProject.label}
                  </h1>
                  {selectedProject.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{selectedProject.description}</p>
                  )}
                </div>
                <span className={cn("px-3 py-1 rounded-full text-xs border font-medium", selectedProject.color)}>
                  {projectReels.length} reel{projectReels.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* ── Step tabs ── */}
              <div className="flex gap-1 mt-4">
                {STEP_CONFIG.map((step, idx) => {
                  const isActive = activeStep === step.id;
                  const isPast = STEP_CONFIG.findIndex((s) => s.id === activeStep) > idx;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveStep(step.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border",
                        isActive
                          ? "bg-brand-500/20 border-brand-500/50 text-brand-200"
                          : isPast
                          ? "bg-surface-hover border-surface-border text-gray-400"
                          : "border-surface-border text-gray-600 hover:text-gray-400 hover:border-gray-600"
                      )}
                    >
                      <span>{step.icon}</span>
                      <span>{step.label}</span>
                      {isPast && <Check size={10} className="text-green-400 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── STEP CONTENT ── */}
            <div className="px-6 py-6 space-y-5">

              {/* ═══════════════════ DEFINE ═══════════════════ */}
              {activeStep === "define" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                      <Target size={16} className="text-brand-400" /> Define your project goal
                    </h2>
                    <p className="text-xs text-gray-500">What are you trying to achieve? This context is sent to AI when synthesising.</p>
                  </div>

                  <div className="bg-surface-card border border-surface-border rounded-2xl p-4 space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Project Goal / Description</label>
                      {editingDesc ? (
                        <div className="space-y-2">
                          <textarea
                            value={descDraft}
                            onChange={(e) => setDescDraft(e.target.value)}
                            rows={4}
                            autoFocus
                            placeholder={`What's the goal of ${selectedProject.label}? What do you want to learn or build?`}
                            className="w-full px-3 py-2.5 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 resize-none"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setEditingDesc(false)}>Cancel</Button>
                            <Button size="sm" variant="primary" onClick={handleSaveDesc}><Check size={11} /> Save</Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => { setDescDraft(selectedProject.description ?? ""); setEditingDesc(true); }}
                          className={cn(
                            "px-3 py-2.5 rounded-xl border text-sm cursor-pointer transition-all",
                            selectedProject.description
                              ? "bg-surface-hover border-surface-border text-white hover:border-brand-500/40"
                              : "border-dashed border-surface-border text-gray-600 hover:border-brand-500/40 hover:text-gray-400"
                          )}
                        >
                          {selectedProject.description || "Click to write your project goal…"}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-surface-border pt-3">
                      <label className="text-xs text-gray-500 mb-2 block">Plan / Notes (auto-saved)</label>
                      <textarea
                        value={planText}
                        onChange={(e) => handlePlanChange(e.target.value)}
                        placeholder={`Notes, links, ideas for ${selectedProject.label}…\n\nThis is your scratchpad — AI synthesis will be appended here automatically.`}
                        rows={6}
                        className="w-full px-3 py-2.5 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 resize-none font-mono"
                      />
                      {planSaving && <p className="text-xs text-gray-600 mt-1">Saving…</p>}
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveStep("import")}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-medium rounded-xl hover:from-brand-400 hover:to-violet-500 transition-all shadow-lg shadow-brand-500/20"
                  >
                    Next: Import Reels <ArrowRight size={15} />
                  </button>
                </div>
              )}

              {/* ═══════════════════ IMPORT ═══════════════════ */}
              {activeStep === "import" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                      <Download size={16} className="text-violet-400" /> Import reels into {selectedProject.label}
                    </h2>
                    <p className="text-xs text-gray-500">Filter by category, select the reels you want, then add them to this project.</p>
                  </div>

                  {/* Category filter */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => { setImportCategoryId("all"); setImportSelectedIds(new Set()); }}
                      className={cn("text-xs px-2.5 py-1 rounded-full border transition-all", importCategoryId === "all" ? "bg-brand-500/20 border-brand-500/50 text-brand-300" : "border-surface-border text-gray-500 hover:border-gray-600 hover:text-gray-300")}
                    >
                      All
                    </button>
                    {allCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => { setImportCategoryId(cat.id); setImportSelectedIds(new Set()); }}
                        className={cn("text-xs px-2.5 py-1 rounded-full border transition-all", importCategoryId === cat.id ? "bg-brand-500/20 border-brand-500/50 text-brand-300" : "border-surface-border text-gray-500 hover:border-gray-600 hover:text-gray-300")}
                      >
                        {cat.emoji} {cat.label}
                      </button>
                    ))}
                  </div>

                  {importCandidates.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-gray-600">
                        {importCategoryId === "all" ? "All reels are already in this project 🎉" : "No reels in this category to import"}
                      </p>
                      {projectReels.length > 0 && (
                        <button onClick={() => setActiveStep("plan")} className="mt-3 text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 mx-auto">
                          Continue to Plan <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setImportSelectedIds(importSelectedIds.size === importCandidates.length ? new Set() : new Set(importCandidates.map((r) => r.id)))}
                          className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        >
                          {importSelectedIds.size === importCandidates.length ? "Deselect all" : `Select all (${importCandidates.length})`}
                        </button>
                        {importSelectedIds.size > 0 && <span className="text-xs text-gray-500">{importSelectedIds.size} selected</span>}
                      </div>

                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {importCandidates.map((reel) => {
                          const cat = getCategoryById(reel.category);
                          const sel = importSelectedIds.has(reel.id);
                          return (
                            <button
                              key={reel.id}
                              onClick={() => { const n = new Set(importSelectedIds); n.has(reel.id) ? n.delete(reel.id) : n.add(reel.id); setImportSelectedIds(n); }}
                              className={cn("w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all", sel ? "bg-brand-500/10 border-brand-500/40" : "bg-surface-hover border-surface-border hover:border-gray-600")}
                            >
                              <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all", sel ? "bg-brand-500 border-brand-500" : "border-surface-border")}>
                                {sel && <Check size={9} className="text-white" strokeWidth={3} />}
                              </div>
                              <span className="text-base shrink-0">{cat.emoji}</span>
                              <span className="text-sm text-gray-300 truncate flex-1">{reel.title}</span>
                              {reel.ai_summary && <Sparkles size={11} className="text-brand-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleImportReels}
                        disabled={importSelectedIds.size === 0 || importing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-brand-500 text-white text-sm font-medium rounded-xl hover:from-violet-500 hover:to-brand-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                      >
                        {importing ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <><Download size={14} /> Add {importSelectedIds.size > 0 ? `${importSelectedIds.size} reels` : "selected reels"} → {selectedProject.label}</>}
                      </button>
                    </>
                  )}

                  {/* Already in project */}
                  {projectReels.length > 0 && (
                    <div className="border-t border-surface-border pt-4">
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">
                        Already in project ({projectReels.length})
                      </p>
                      <div className="space-y-1.5">
                        {projectReels.map((reel) => (
                          <ReelProjectCard key={reel.id} reel={reel} />
                        ))}
                      </div>
                      <button onClick={() => setActiveStep("plan")} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-medium rounded-xl">
                        Next: Plan with AI <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ═══════════════════ PLAN ═══════════════════ */}
              {activeStep === "plan" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                      <Sparkles size={16} className="text-brand-400" /> AI Synthesis
                    </h2>
                    <p className="text-xs text-gray-500">{projectReels.length} reel{projectReels.length !== 1 ? "s" : ""} in context · Ask AI to find patterns, build a plan, or connect ideas.</p>
                  </div>

                  {projectReels.length === 0 ? (
                    <div className="text-center py-8 bg-surface-card border border-surface-border rounded-2xl">
                      <p className="text-sm text-gray-600 mb-3">No reels in this project yet</p>
                      <button onClick={() => setActiveStep("import")} className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 mx-auto">
                        ← Import reels first
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Prompt suggestions */}
                      <div className="flex flex-wrap gap-1.5">
                        {PROJECT_PROMPTS.map((s) => (
                          <button
                            key={s}
                            onClick={() => setPrompt(s)}
                            className={cn("text-xs px-3 py-1.5 rounded-full border transition-all text-left", prompt === s ? "border-brand-500/50 bg-brand-500/10 text-brand-300" : "border-surface-border text-gray-500 hover:text-gray-300 hover:border-gray-600")}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSynthesize(); }}
                          placeholder={`Ask AI about your ${selectedProject.label} reels… (⌘↵ to run)`}
                          rows={3}
                          className="w-full px-4 py-3 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 resize-none"
                        />
                        <Button variant="primary" onClick={handleSynthesize} loading={loading} disabled={!prompt.trim()} className="w-full">
                          <Sparkles size={14} />
                          {loading ? "Synthesising…" : `Synthesise for ${selectedProject.label}`}
                          {!loading && <Send size={13} />}
                        </Button>
                      </div>

                      {loading && (
                        <div className="flex items-center justify-center py-8 gap-3 text-gray-500">
                          <Loader2 size={18} className="animate-spin text-brand-400" />
                          <span className="text-sm">Connecting {projectReels.length} reels…</span>
                        </div>
                      )}

                      {result && !loading && (
                        <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border bg-brand-500/5">
                            <div className="flex items-center gap-2">
                              <Sparkles size={13} className="text-brand-400" />
                              <span className="text-sm font-medium text-white">AI Response</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={handleSaveResultToPlan} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-brand-300 hover:bg-brand-500/10 transition-all" title="Add to plan">
                                <FileText size={12} /> Save to plan
                              </button>
                              <button onClick={() => setActiveStep("execute")} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-green-300 hover:bg-green-500/10 transition-all">
                                <CheckSquare size={12} /> → Execute
                              </button>
                              <button onClick={async () => { await navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-surface-hover">
                                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                              </button>
                              <button onClick={() => { setResult(""); setPrompt(""); }} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-surface-hover">
                                <RefreshCw size={13} />
                              </button>
                            </div>
                          </div>
                          <div className="px-4 py-4">
                            <MarkdownContent content={result} />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Plan notepad */}
                  <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-brand-400" />
                        <span className="text-sm font-medium text-white">Project Plan</span>
                        {planSaving && <span className="text-xs text-gray-600 animate-pulse">Saving…</span>}
                        {planText && !planSaving && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                      </div>
                      {planText && (
                        <button onClick={() => setActiveStep("execute")} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                          Execute plan <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <textarea
                        value={planText}
                        onChange={(e) => handlePlanChange(e.target.value)}
                        placeholder={`Write your plan for ${selectedProject.label}…\n\n- Use bullet points for action items\n- AI synthesis is appended here automatically`}
                        rows={8}
                        className="w-full px-3 py-3 bg-surface-hover border border-surface-border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none focus:border-brand-500/40 resize-none font-mono leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════ EXECUTE ═══════════════════ */}
              {activeStep === "execute" && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                      <CheckSquare size={16} className="text-green-400" /> Execute — convert plan to tasks
                    </h2>
                    <p className="text-xs text-gray-500">Click "→ Task" on any action item to send it to your task list.</p>
                  </div>

                  {!planText ? (
                    <div className="text-center py-8 bg-surface-card border border-surface-border rounded-2xl">
                      <p className="text-sm text-gray-600 mb-3">No plan yet</p>
                      <button onClick={() => setActiveStep("plan")} className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1 mx-auto">
                        ← Build a plan first
                      </button>
                    </div>
                  ) : (
                    <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-surface-border flex items-center gap-2">
                        <FileText size={13} className="text-brand-400" />
                        <span className="text-sm font-medium text-white">Plan items</span>
                        <span className="text-xs text-gray-600">· click → Task to convert</span>
                      </div>
                      <div className="px-3 py-3 space-y-1 max-h-[60vh] overflow-y-auto">
                        {planLines.map((line) => {
                          if (line.raw.startsWith("#")) {
                            return (
                              <p key={line.id} className={cn("font-semibold text-white pt-2", line.raw.startsWith("### ") ? "text-sm" : line.raw.startsWith("## ") ? "text-base" : "text-lg")}>
                                {line.raw.replace(/^#+\s*/, "")}
                              </p>
                            );
                          }
                          if (!line.clean) return <div key={line.id} className="h-2" />;
                          return (
                            <div
                              key={line.id}
                              className={cn(
                                "group flex items-start gap-2 px-3 py-2 rounded-xl transition-all",
                                line.isAction ? "hover:bg-surface-hover" : ""
                              )}
                            >
                              {line.isAction && (
                                <span className="text-brand-400/60 text-xs mt-0.5 shrink-0">•</span>
                              )}
                              <span className="flex-1 text-sm text-gray-300 leading-relaxed">{line.clean}</span>
                              {line.isAction && (
                                <button
                                  onClick={() => {
                                    setPendingTaskTitle(line.clean.slice(0, 100));
                                    setActiveView("tasks");
                                    toast.success("Switched to Tasks — title pre-filled!");
                                  }}
                                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-0.5 bg-green-500/15 border border-green-500/30 text-green-300 text-xs rounded-lg transition-all hover:bg-green-500/25 shrink-0"
                                >
                                  <CheckSquare size={10} /> Task
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tagged reels */}
                  {projectReels.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">
                        Reels in this project ({projectReels.length})
                      </p>
                      <div className="space-y-2">
                        {projectReels.map((reel) => (
                          <ReelProjectCard key={reel.id} reel={reel} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReelProjectCard({ reel }: { reel: Reel }) {
  const catConfig = getCategoryById(reel.category);
  return (
    <div className="flex items-start gap-3 p-3 bg-surface-card border border-surface-border rounded-xl hover:border-gray-600 transition-all">
      <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-base shrink-0">{catConfig.emoji}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{reel.title}</p>
        {reel.ai_summary ? (
          <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{reel.ai_summary}</p>
        ) : reel.description ? (
          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{reel.description}</p>
        ) : null}
      </div>
      {reel.ai_summary && <Lightbulb size={12} className="text-brand-400 shrink-0 mt-1" />}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-1">
      {content.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;
        if (line.startsWith("# ")) return <h3 key={i} className="text-base font-bold text-white mt-3 mb-1">{line.slice(2)}</h3>;
        if (line.startsWith("## ")) return <h4 key={i} className="text-sm font-semibold text-gray-200 mt-2 mb-1">{line.slice(3)}</h4>;
        if (line.startsWith("- ") || line.startsWith("• "))
          return <div key={i} className="flex items-start gap-2 text-sm text-gray-300 my-0.5"><span className="text-brand-400 mt-1 shrink-0 text-xs">•</span><span>{line.slice(2)}</span></div>;
        if (/^\d+\./.test(line))
          return <div key={i} className="flex items-start gap-2 text-sm text-gray-300 my-0.5"><span className="text-brand-400 font-mono text-xs mt-0.5 shrink-0 w-4">{line.match(/^\d+/)?.[0]}.</span><span>{line.replace(/^\d+\.\s*/, "")}</span></div>;
        return <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}
