/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";

function tasksTable() {
  return createClient().from("tasks") as any;
}

export async function getTasks(reelId?: string): Promise<Task[]> {
  let query = tasksTable()
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
  const { data, error } = await tasksTable()
    .insert(task)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleTask(id: string, isDone: boolean): Promise<void> {
  const { error } = await tasksTable()
    .update({ is_done: !isDone })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await tasksTable().delete().eq("id", id);
  if (error) throw error;
}
