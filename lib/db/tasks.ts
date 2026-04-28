import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";

export async function getTasks(reelId?: string): Promise<Task[]> {
  const supabase = createClient();
  let query = supabase
    .from("tasks")
    .select("*, reel:reels(id, title, thumbnail_url, category)")
    .order("created_at", { ascending: false });

  if (reelId) {
    query = query.eq("reel_id", reelId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as Task[]) || [];
}

export async function createTask(
  task: Omit<Task, "id" | "created_at" | "user_id">
): Promise<Task> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...task, user_id: user?.id ?? "anonymous" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleTask(id: string, isDone: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ is_done: !isDone })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
