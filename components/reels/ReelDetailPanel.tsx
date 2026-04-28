"use client";

import { useEffect, useState } from "react";
import {
  X, ExternalLink, Star, Sparkles, CheckSquare, Edit3,
  Heart, Calendar, Tag, FileText, Lightbulb, Check, Plus
} from "lucide-react";
import type { Reel, Task } from "@/lib/types";
import { STATUS_CONFIG, formatDate, cn } from "@/lib/utils";
import { getCategoryById } from "@/lib/categories";
import { getAllProjects, getProjectById } from "@/lib/projects";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { updateReel, toggleFavourite } from "@/lib/db/reels";
import { createTask, getTasks, toggleTask as dbToggleTask } from "@/lib/db/tasks";
import { useAppStore } from "@/lib/store";
import toast from "react-hot-toast";

interface ReelDetailPanelProps {
  reel: Reel;
  onClose: () => void;
}

export function ReelDetailPanel({ reel, onClose }: ReelDetailPanelProps) {
  const { updateReel: storeUpdate } = useAppStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(reel.notes || "");
  const [activeTab, setActiveTab] = useState<"overview" | "ideas" | "tasks">("overview");

  const catConfig = getCategoryById(reel.category);
  const statusConfig = STATUS_CONFIG[reel.status];
  const allProjects = getAllProjects();

  useEffect(() => {
    getTasks(reel.id).then(setTasks).catch(console.error);
  }, [reel.id]);

  async function handleFavourite() {
    await toggleFavourite(reel.id, reel.is_favourite);
    storeUpdate(reel.id, { is_favourite: !reel.is_favourite });
  }

  async function handleSaveNotes() {
    await updateReel(reel.id, { notes });
    storeUpdate(reel.id, { notes });
    setEditingNotes(false);
    toast.success("Notes saved");
  }

  async function handleStatusChange(status: Reel["status"]) {
    await updateReel(reel.id, { status });
    storeUpdate(reel.id, { status });
    toast.success(`Marked as ${STATUS_CONFIG[status].label}`);
  }

  async function handleToggleProject(projectId: string) {
    const current = reel.project_tags ?? [];
    const updated = current.includes(projectId)
      ? current.filter((p) => p !== projectId)
      : [...current, projectId];
    await updateReel(reel.id, { project_tags: updated });
    storeUpdate(reel.id, { project_tags: updated });
  }

  async function handleAddTask() {
    if (!newTask.trim()) return;
    try {
      const task = await createTask({
        reel_id: reel.id,
        title: newTask.trim(),
        description: null,
        is_done: false,
        due_date: null,
      });
      setTasks((prev) => [task, ...prev]);
      setNewTask("");
    } catch {
      toast.error("Failed to add task");
    }
  }

  async function handleToggleTask(task: Task) {
    await dbToggleTask(task.id, task.is_done);
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_done: !t.is_done } : t))
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface-card border-l border-surface-border w-full max-w-md animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-surface-border">
        <div className="flex-1 pr-3">
          <Badge className={cn(catConfig.color, "mb-2")}>
            {catConfig.emoji} {catConfig.label}
          </Badge>
          <h2 className="font-semibold text-white text-sm leading-snug line-clamp-2">
            {reel.title}
          </h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-surface-hover transition-all shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-border">
        <a
          href={reel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ExternalLink size={12} /> Open Reel
        </a>
        <div className="h-3 w-px bg-surface-border" />
        <button onClick={handleFavourite} className={cn("flex items-center gap-1.5 text-xs transition-colors", reel.is_favourite ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400")}>
          <Heart size={12} fill={reel.is_favourite ? "currentColor" : "none"} />
          {reel.is_favourite ? "Unfavourite" : "Favourite"}
        </button>
        <div className="h-3 w-px bg-surface-border" />
        <span className="text-xs text-gray-600 flex items-center gap-1">
          <Calendar size={11} /> {formatDate(reel.created_at)}
        </span>
      </div>

      {/* Status selector */}
      <div className="flex gap-1.5 px-5 py-3 border-b border-surface-border">
        {(["unread", "in_progress", "done", "archived"] as Reel["status"][]).map((s) => (
          <button
            key={s}
            onClick={() => handleStatusChange(s)}
            className={cn(
              "flex-1 text-xs py-1.5 px-2 rounded-lg border transition-all",
              reel.status === s
                ? cn(STATUS_CONFIG[s].color, "font-medium")
                : "border-surface-border text-gray-600 hover:text-gray-400"
            )}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border">
        {[
          { id: "overview" as const, label: "Overview", icon: <FileText size={12} /> },
          { id: "ideas" as const, label: "Ideas", icon: <Lightbulb size={12} /> },
          { id: "tasks" as const, label: "Tasks", icon: <CheckSquare size={12} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 border-b-2 transition-all",
              activeTab === tab.id
                ? "border-brand-500 text-brand-300"
                : "border-transparent text-gray-500 hover:text-gray-300"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Overview tab */}
        {activeTab === "overview" && (
          <>
            {/* AI Summary */}
            {reel.ai_summary && (
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-3">
                <p className="text-xs text-brand-300 font-medium mb-1.5 flex items-center gap-1">
                  <Sparkles size={11} /> AI Summary
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">{reel.ai_summary}</p>
              </div>
            )}

            {/* Description */}
            {reel.description && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1.5">Caption</p>
                <p className="text-xs text-gray-400 leading-relaxed">{reel.description}</p>
              </div>
            )}

            {/* Tags */}
            {reel.tags.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1">
                  <Tag size={11} /> Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {reel.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-surface-hover border border-surface-border rounded-full text-gray-400">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Project tags */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1">
                🗂️ Projects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allProjects.map((proj) => {
                  const active = (reel.project_tags ?? []).includes(proj.id);
                  return (
                    <button
                      key={proj.id}
                      onClick={() => handleToggleProject(proj.id)}
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all",
                        active ? proj.color + " font-medium" : "border-surface-border text-gray-600 hover:border-gray-500 hover:text-gray-400"
                      )}
                    >
                      {proj.emoji} {proj.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-500 font-medium">Personal Notes</p>
                {!editingNotes && (
                  <button onClick={() => setEditingNotes(true)} className="text-xs text-gray-600 hover:text-gray-300 flex items-center gap-1">
                    <Edit3 size={10} /> Edit
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="What do you want to do with this reel?"
                    className="w-full px-3 py-2 bg-surface-hover border border-brand-500/30 rounded-xl text-xs text-white placeholder:text-gray-600 outline-none resize-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditingNotes(false)}>Cancel</Button>
                    <Button size="sm" variant="primary" onClick={handleSaveNotes}>Save</Button>
                  </div>
                </div>
              ) : (
                <p
                  onClick={() => setEditingNotes(true)}
                  className={cn(
                    "text-xs leading-relaxed rounded-xl p-2 cursor-pointer hover:bg-surface-hover transition-all",
                    notes ? "text-gray-300" : "text-gray-600 italic"
                  )}
                >
                  {notes || "Add your notes here..."}
                </p>
              )}
            </div>
          </>
        )}

        {/* Ideas tab */}
        {activeTab === "ideas" && (
          <div className="space-y-4">
            {reel.ai_ideas && reel.ai_ideas.length > 0 ? (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">💡 AI-generated ideas</p>
                <ul className="space-y-2">
                  {reel.ai_ideas.map((idea, i) => (
                    <li key={i} className="flex items-start gap-2 p-2.5 bg-surface-hover border border-surface-border rounded-xl">
                      <span className="text-brand-400 text-xs mt-0.5 shrink-0">{i + 1}.</span>
                      <span className="text-xs text-gray-300">{idea}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                <Lightbulb size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">No AI ideas yet.</p>
                <p className="text-xs mt-1">Re-add this reel with AI analysis enabled.</p>
              </div>
            )}

            {/* Action items */}
            {reel.ai_action_items && reel.ai_action_items.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-2">✅ Action items</p>
                <ul className="space-y-1.5">
                  {reel.ai_action_items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                      <Check size={12} className="text-green-400 mt-0.5 shrink-0" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tasks tab */}
        {activeTab === "tasks" && (
          <div className="space-y-3">
            {/* Add task input */}
            <div className="flex gap-2">
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                placeholder="Add a task for this reel..."
                className="flex-1 px-3 py-2 bg-surface-hover border border-surface-border rounded-xl text-xs text-white placeholder:text-gray-600 outline-none focus:border-brand-500/30 transition-all"
              />
              <Button size="sm" variant="primary" onClick={handleAddTask}>
                <Plus size={13} />
              </Button>
            </div>

            {/* Task list */}
            {tasks.length === 0 ? (
              <p className="text-center text-xs text-gray-600 py-6">
                No tasks yet. Add one above.
              </p>
            ) : (
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-start gap-2.5 p-2.5 bg-surface-hover border border-surface-border rounded-xl"
                  >
                    <button
                      onClick={() => handleToggleTask(task)}
                      className={cn(
                        "w-4 h-4 rounded-md border shrink-0 mt-0.5 flex items-center justify-center transition-all",
                        task.is_done
                          ? "bg-green-500/30 border-green-500/50 text-green-400"
                          : "border-surface-border hover:border-brand-500/50"
                      )}
                    >
                      {task.is_done && <Check size={10} />}
                    </button>
                    <span className={cn("text-xs text-gray-300", task.is_done && "line-through text-gray-600")}>
                      {task.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
