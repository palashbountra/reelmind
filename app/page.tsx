"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardView } from "@/components/views/DashboardView";
import { IdeateView } from "@/components/views/IdeateView";
import { TasksView } from "@/components/views/TasksView";
import { ProjectsView } from "@/components/views/ProjectsView";
import { AddReelModal } from "@/components/reels/AddReelModal";
import { useAppStore } from "@/lib/store";

type View = "dashboard" | "ideate" | "tasks" | "projects";

// Separate component so useSearchParams works inside Suspense
function AppContent() {
  const [view, setView] = useState<View>("dashboard");
  const { setAddReelOpen } = useAppStore();
  const searchParams = useSearchParams();

  // Handle bookmarklet: ?add=<instagram-url>
  useEffect(() => {
    const addUrl = searchParams.get("add");
    if (addUrl) {
      // Pre-populate and open the add reel modal
      // We store the URL in sessionStorage so AddReelModal can pick it up
      sessionStorage.setItem("reelmind_prefill_url", decodeURIComponent(addUrl));
      setAddReelOpen(true);
      // Clean the URL without reload
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, setAddReelOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-white">
      <Sidebar activeView={view} onViewChange={setView} />
      <main className="flex-1 overflow-hidden">
        {view === "dashboard" && <DashboardView />}
        {view === "projects" && <ProjectsView />}
        {view === "ideate" && <IdeateView />}
        {view === "tasks" && <TasksView />}
      </main>
      <AddReelModal />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-surface">
        <div className="text-center space-y-3">
          <div className="text-4xl">🎬</div>
          <p className="text-gray-500 text-sm">Loading ReelMind...</p>
        </div>
      </div>
    }>
      <AppContent />
    </Suspense>
  );
}
