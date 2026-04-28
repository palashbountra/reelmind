"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckSquare, Plus, Trash2, Clock, Check,
  Circle, Bell, AlertCircle, Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { getTasks, createTask, toggleTask as dbToggle, deleteTask } from "@/lib/db/tasks";
import { formatDate, cn } from "@/lib/utils";
import { getCategoryById } from "@/lib/categories";
import { Button } from "@/components/ui/Button";
import type { Task } from "@/lib/types";
import toast from "react-hot-toast";

export function TasksView() {
  const { tasks, setTasks, addTask, toggleTask, removeTask, reels, pendingTaskTitle, setPendingTaskTitle } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    getTasks()
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [setTasks]);

  // Pre-fill from Ideate's "Create Task" action
  useEffect(() => {
    if (pendingTaskTitle) {
      setNewTitle(pendingTaskTitle);
      setPendingTaskTitle(null);
      // Focus + scroll into view
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [pendingTaskTitle, setPendingTaskTitle]);

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.is_done;
    if (filter === "done") return t.is_done;
    return true;
  });

  const pendingCount = tasks.filter((t) => !t.is_done).length;
  const doneCount = tasks.filter((t) => t.is_done).length;

  const now = new Date();
  const overdue = filtered.filter((t) => !t.is_done && t.due_date && new Date(t.due_date) < now);
  const upcoming = filtered.filter((t) => !t.is_done && (!t.due_date || new Date(t.due_date) >= now));
  const done = filtered.filter((t) => t.is_done);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const task = await createTask({
        reel_id: selectedReelId || null,
        title: newTitle.trim(),
        description: null,
        is_done: false,
        due_date: dueDate || null,
      });
      addTask(task);
      setNewTitle("");
      setDueDate("");
      setSelectedReelId(null);
      toast.success("Task added");
    } catch {
      toast.error("Failed to add task");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(task: Task) {
    await dbToggle(task.id, task.is_done);
    toggleTask(task.id);
    if (!task.is_done) toast.success("Task completed! 🎉", { duration: 1500 });
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    removeTask(id);
    toast.success("Task removed");
  }

  async function handleImportActionItems() {
    const reelsWithActions = reels.filter(
      (r) => r.ai_action_items && r.ai_action_items.length > 0 && r.status !== "archived"
    );
    if (reelsWithActions.length === 0) {
      toast.error("No AI action items found. Add reels with AI analysis first.");
      return;
    }
    let imported = 0;
    for (const reel of reelsWithActions) {
      for (const item of reel.ai_action_items!) {
        try {
          const task = await createTask({
            reel_id: reel.id,
            title: item,
            description: null,
            is_done: false,
            due_date: null,
          });
          addTask(task);
          imported++;
        } catch { /* skip duplicates */ }
      }
    }
    toast.success(`Imported ${imported} action item${imported !== 1 ? "s" : ""} as tasks`);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-surface-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Tasks &amp; Reminders
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {pendingCount} pending · {doneCount} done
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleImportActionItems}>
            <Bell size={13} />
            Import from AI
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {(["all", "pending", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                filter === f
                  ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                  : "text-gray-500 hover:text-gray-300 hover:bg-surface-hover"
              )}
            >
              {f === "all" ? `All (${tasks.length})` : f === "pending" ? `Pending (${pendingCount})` : `Done (${doneCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Add task form */}
      <div className="px-6 py-4 border-b border-surface-border bg-surface-hover/30">
        {/* Ideate hint if pre-filled */}
        {newTitle && (
          <div className="flex items-center gap-1.5 mb-2 text-xs text-brand-400">
            <Sparkles size={11} />
            <span>Pre-filled from Ideate — edit and press Enter to save</span>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a new task…"
            className={cn(
              "flex-1 px-3 py-2 bg-surface-hover border rounded-xl text-sm text-white placeholder:text-gray-600 outline-none transition-all",
              newTitle
                ? "border-brand-500/40 ring-1 ring-brand-500/20"
                : "border-surface-border focus:border-brand-500/40"
            )}
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-3 py-2 bg-surface-hover border border-surface-border rounded-xl text-xs text-gray-400 outline-none cursor-pointer"
          />
          <Button variant="primary" size="sm" onClick={handleAdd} loading={adding}>
            <Plus size={14} />
          </Button>
        </div>

        {/* Link to reel */}
        {reels.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-600">Link to reel:</span>
            <select
              value={selectedReelId || ""}
              onChange={(e) => setSelectedReelId(e.target.value || null)}
              className="flex-1 px-2 py-1 bg-surface-hover border border-surface-border rounded-lg text-xs text-gray-400 outline-none cursor-pointer"
            >
              <option value="">None</option>
              {reels
                .filter((r) => r.status !== "archived")
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {getCategoryById(r.category).emoji} {r.title.slice(0, 50)}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-surface-card border border-surface-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-hover border border-surface-border flex items-center justify-center text-2xl mb-3">
              ✅
            </div>
            <h3 className="font-semibold text-white mb-1">
              {filter === "done" ? "No completed tasks yet" : "All caught up!"}
            </h3>
            <p className="text-xs text-gray-500">
              {filter === "pending" || filter === "all"
                ? "Add tasks above, or import action items from AI-analysed reels"
                : "Complete some tasks to see them here"}
            </p>
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <TaskGroup
                title="Overdue"
                icon={<AlertCircle size={13} className="text-red-400" />}
                tasks={overdue}
                onToggle={handleToggle}
                onDelete={handleDelete}
                reels={reels}
                titleColor="text-red-400"
              />
            )}
            {upcoming.length > 0 && (
              <TaskGroup
                title={filter === "all" ? "Pending" : "Tasks"}
                icon={<Circle size={13} className="text-blue-400" />}
                tasks={upcoming}
                onToggle={handleToggle}
                onDelete={handleDelete}
                reels={reels}
                titleColor="text-white"
              />
            )}
            {done.length > 0 && (
              <TaskGroup
                title="Completed"
                icon={<Check size={13} className="text-green-400" />}
                tasks={done}
                onToggle={handleToggle}
                onDelete={handleDelete}
                reels={reels}
                titleColor="text-gray-500"
                dimmed
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TaskGroup({
  title, icon, tasks, onToggle, onDelete, reels, titleColor, dimmed = false,
}: {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
  reels: import("@/lib/types").Reel[];
  titleColor?: string;
  dimmed?: boolean;
}) {
  return (
    <div>
      <div className={cn("flex items-center gap-1.5 mb-2", titleColor)}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">
          {title} ({tasks.length})
        </span>
      </div>
      <ul className="space-y-2">
        {tasks.map((task) => {
          const linkedReel = reels.find((r) => r.id === task.reel_id);
          const isOverdue = !task.is_done && task.due_date && new Date(task.due_date) < new Date();

          return (
            <li
              key={task.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all group",
                dimmed
                  ? "bg-surface-card/50 border-surface-border/50 opacity-60"
                  : "bg-surface-card border-surface-border"
              )}
            >
              <button
                onClick={() => onToggle(task)}
                className={cn(
                  "w-5 h-5 rounded-lg border shrink-0 mt-0.5 flex items-center justify-center transition-all",
                  task.is_done
                    ? "bg-green-500/30 border-green-500/50 text-green-400"
                    : "border-surface-border hover:border-brand-500/50"
                )}
              >
                {task.is_done && <Check size={11} />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn("text-sm text-white leading-snug", task.is_done && "line-through text-gray-500")}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {linkedReel && (
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <span>{getCategoryById(linkedReel.category).emoji}</span>
                      <span className="truncate max-w-[120px]">{linkedReel.title}</span>
                    </span>
                  )}
                  {task.due_date && (
                    <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-400" : "text-gray-600")}>
                      <Clock size={10} />
                      {isOverdue ? "Overdue · " : "Due "}
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-xs text-gray-700">{formatDate(task.created_at)}</span>
                </div>
              </div>

              <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
