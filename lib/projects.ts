// ── Projects — connect reels to your active work ─────────────────────────────
// Projects are separate from categories. A reel's category = what topic it is.
// A reel's project_tags = which active projects it's relevant to.

const CUSTOM_PROJECTS_KEY = "reelmind_custom_projects";

export interface Project {
  id: string;
  label: string;
  emoji: string;
  color: string; // tailwind badge classes
  description: string;
  isDefault: boolean;
}

// Your real active projects — pulled from your Obsidian CLAUDE.md
export const DEFAULT_PROJECTS: Project[] = [
  {
    id: "efl-dashboard",
    label: "EFL Dashboard",
    emoji: "📊",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    description: "Competitive Intelligence Dashboard for Eureka Forbes",
    isDefault: true,
  },
  {
    id: "interlink",
    label: "Interlink",
    emoji: "🔗",
    color: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    description: "Personal AI second brain & Obsidian OS",
    isDefault: true,
  },
  {
    id: "stock-market",
    label: "Stock Market",
    emoji: "📈",
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    description: "Stock Market Automation project",
    isDefault: true,
  },
  {
    id: "personal-learning",
    label: "Personal Learning",
    emoji: "🧠",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    description: "Skills, mindset, and knowledge for personal growth",
    isDefault: true,
  },
  {
    id: "life-skills",
    label: "Life Skills",
    emoji: "✨",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    description: "Practical life skills and habits",
    isDefault: true,
  },
];

export function loadCustomProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PROJECTS_KEY);
    return raw ? (JSON.parse(raw) as Project[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_PROJECTS_KEY, JSON.stringify(projects));
}

export function getAllProjects(): Project[] {
  return [...DEFAULT_PROJECTS, ...loadCustomProjects()];
}

export function getProjectById(id: string): Project | undefined {
  return getAllProjects().find((p) => p.id === id);
}

export function createProject(label: string, emoji: string, description: string): Project {
  const id = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `project-${Date.now()}`;
  const colors = [
    "bg-rose-500/20 text-rose-300 border-rose-500/30",
    "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    "bg-orange-500/20 text-orange-300 border-orange-500/30",
    "bg-pink-500/20 text-pink-300 border-pink-500/30",
    "bg-teal-500/20 text-teal-300 border-teal-500/30",
  ];
  const custom = loadCustomProjects();
  const color = colors[custom.length % colors.length];
  return { id, label: label.trim(), emoji, description: description.trim(), color, isDefault: false };
}
