"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardView } from "@/components/views/DashboardView";
import { IdeateView } from "@/components/views/IdeateView";
import { TasksView } from "@/components/views/TasksView";
import { ProjectsView } from "@/components/views/ProjectsView";
import { AddReelModal } from "@/components/reels/AddReelModal";
import { SplashScreen } from "@/components/SplashScreen";
import { useAppStore } from "@/lib/store";
import { hydrateSettings } from "@/lib/settings";

// Separate component so useSearchParams works inside Suspense
function AppContent() {
  const { activeView, setActiveView, setAddReelOpen, bumpSettingsVersion } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);
  const searchParams = useSearchParams();

  // Hydrate settings from Supabase on mount so categories/projects
  // survive new deployments without resetting.
  useEffect(() => {
    hydrateSettings().then(() => {
      bumpSettingsVersion();
    });
  }, [bumpSettingsVersion]);

  // Handle bookmarklet: ?add=<instagram-url>
  useEffect(() => {
    const addUrl = searchParams.get("add");
    if (addUrl) {
      sessionStorage.setItem("reelmind_prefill_url", decodeURIComponent(addUrl));
      setAddReelOpen(true);
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams, setAddReelOpen]);

  return (
    <>
      {showSplash && (
        <SplashScreen onEnter={() => setShowSplash(false)} />
      )}

      <div className="flex h-screen overflow-hidden bg-surface text-white">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {activeView === "dashboard" && <DashboardView />}
          {activeView === "projects"  && <ProjectsView />}
          {activeView === "ideate"    && <IdeateView />}
          {activeView === "tasks"     && <TasksView />}
        </main>
        <AddReelModal />
      </div>
    </>
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
