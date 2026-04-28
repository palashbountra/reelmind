export type ReelStatus = "unread" | "in_progress" | "done" | "archived";

// Category is now an open string — built-in ones are listed here for autocomplete,
// but any custom string is valid too
export type ReelCategory = string;

export const BUILTIN_CATEGORIES = [
  "productivity", "fitness", "coding", "design", "business",
  "cooking", "travel", "mindset", "finance", "creative", "learning", "other",
] as const;

export type BuiltinCategory = typeof BUILTIN_CATEGORIES[number];

export interface CustomCategory {
  id: string;       // slug key used in DB, e.g. "my-category"
  label: string;    // display name, e.g. "My Category"
  emoji: string;    // e.g. "🚀"
  color: string;    // tailwind classes
  isBuiltin: boolean;
}

export interface Reel {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  author_name: string | null;
  author_url: string | null;
  category: ReelCategory;
  tags: string[];
  project_tags: string[];        // which active projects this reel is relevant to
  extra_categories: string[];   // secondary category memberships (non-destructive)
  status: ReelStatus;
  notes: string | null;
  ai_summary: string | null;
  ai_ideas: string[] | null;
  ai_action_items: string[] | null;
  reminder_date: string | null;
  is_favourite: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  reel_id: string | null;
  title: string;
  description: string | null;
  is_done: boolean;
  due_date: string | null;
  created_at: string;
  reel?: Reel;
}

export interface IdeaNote {
  id: string;
  user_id: string;
  reel_id: string;
  content: string;
  created_at: string;
  reel?: Reel;
}

export interface ReelFilters {
  category?: ReelCategory | "all";
  status?: ReelStatus | "all";
  search?: string;
  favourites?: boolean;
  sort?: "newest" | "oldest" | "title" | "category";
  project?: string | "all";  // filter by project tag
}

export interface AIAnalysis {
  summary: string;
  ideas: string[];
  action_items: string[];
  tags: string[];
  category: ReelCategory;
}

// Supabase DB types
export type Database = {
  public: {
    Tables: {
      reels: {
        Row: Reel;
        Insert: Omit<Reel, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Reel, "id" | "user_id" | "created_at">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at">;
        Update: Partial<Omit<Task, "id" | "user_id" | "created_at">>;
      };
      idea_notes: {
        Row: IdeaNote;
        Insert: Omit<IdeaNote, "id" | "created_at">;
        Update: Partial<Omit<IdeaNote, "id" | "user_id" | "created_at">>;
      };
    };
  };
};
