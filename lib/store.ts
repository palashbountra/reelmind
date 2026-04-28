import { create } from "zustand";
import type { Reel, ReelFilters, Task } from "./types";

interface AppState {
  // Reels
  reels: Reel[];
  setReels: (reels: Reel[]) => void;
  addReel: (reel: Reel) => void;
  updateReel: (id: string, updates: Partial<Reel>) => void;
  removeReel: (id: string) => void;

  // Tasks
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;

  // Filters
  filters: ReelFilters;
  setFilters: (filters: Partial<ReelFilters>) => void;
  resetFilters: () => void;

  // UI state
  selectedReelId: string | null;
  setSelectedReelId: (id: string | null) => void;
  addReelOpen: boolean;
  setAddReelOpen: (open: boolean) => void;
  bulkImportOpen: boolean;
  setBulkImportOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;

  // Settings version — increment after hydrating Supabase settings so
  // components that read localStorage (categories, projects) know to re-render.
  settingsVersion: number;
  bumpSettingsVersion: () => void;

  // Cross-linking: pending task creation from Ideate / Projects
  pendingTaskTitle: string | null;
  setPendingTaskTitle: (title: string | null) => void;

  // Active view — owned here so any component can switch views
  activeView: "dashboard" | "ideate" | "tasks" | "projects";
  setActiveView: (v: "dashboard" | "ideate" | "tasks" | "projects") => void;
}

const defaultFilters: ReelFilters = {
  category: "all",
  status: "all",
  search: "",
  favourites: false,
  sort: "newest",
};

export const useAppStore = create<AppState>((set) => ({
  reels: [],
  setReels: (reels) => set({ reels }),
  addReel: (reel) => set((s) => ({ reels: [reel, ...s.reels] })),
  updateReel: (id, updates) =>
    set((s) => ({
      reels: s.reels.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),
  removeReel: (id) =>
    set((s) => ({ reels: s.reels.filter((r) => r.id !== id) })),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [task, ...s.tasks] })),
  toggleTask: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, is_done: !t.is_done } : t
      ),
    })),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  filters: defaultFilters,
  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters } })),
  resetFilters: () => set({ filters: defaultFilters }),

  selectedReelId: null,
  setSelectedReelId: (id) => set({ selectedReelId: id }),
  addReelOpen: false,
  setAddReelOpen: (open) => set({ addReelOpen: open }),
  bulkImportOpen: false,
  setBulkImportOpen: (open) => set({ bulkImportOpen: open }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  settingsVersion: 0,
  bumpSettingsVersion: () =>
    set((s) => ({ settingsVersion: s.settingsVersion + 1 })),

  pendingTaskTitle: null,
  setPendingTaskTitle: (title) => set({ pendingTaskTitle: title }),

  activeView: "dashboard",
  setActiveView: (v) => set({ activeView: v }),
}));
