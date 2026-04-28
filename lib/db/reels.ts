/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@/lib/supabase/client";
import type { Reel, ReelFilters } from "@/lib/types";

// Helper — cast the table to any so Supabase's strict generated types don't
// block us (we have no generated schema file, so the table resolves to never).
function reelsTable() {
  return createClient().from("reels") as any;
}

export async function getReels(filters?: ReelFilters): Promise<Reel[]> {
  let query = reelsTable().select("*");

  if (filters?.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.favourites) {
    query = query.eq("is_favourite", true);
  }
  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,ai_summary.ilike.%${filters.search}%`
    );
  }

  switch (filters?.sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "title":
      query = query.order("title", { ascending: true });
      break;
    case "category":
      query = query.order("category", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getReelById(id: string): Promise<Reel | null> {
  const { data, error } = await reelsTable()
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export async function getReelsByProject(projectId: string): Promise<Reel[]> {
  const { data, error } = await reelsTable()
    .select("*")
    .contains("project_tags", [projectId])
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createReel(
  reel: Omit<Reel, "id" | "created_at" | "updated_at" | "user_id">
): Promise<Reel> {
  const { data, error } = await reelsTable()
    .insert(reel)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateReel(
  id: string,
  updates: Partial<Reel>
): Promise<Reel> {
  const { data, error } = await reelsTable()
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteReel(id: string): Promise<void> {
  const { error } = await reelsTable().delete().eq("id", id);
  if (error) throw error;
}

export async function toggleFavourite(
  id: string,
  current: boolean
): Promise<void> {
  const { error } = await reelsTable()
    .update({ is_favourite: !current, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
