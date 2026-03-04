"use server";

import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export interface ShareLink {
  token: string;
  expires_at: string | null;
  created_at: string;
}

export async function createShareLink(expiresInDays: number): Promise<ShareLink | null> {
  const supabase = await createClient();

  const token = crypto.randomBytes(20).toString("hex");
  const expiresAt = expiresInDays > 0
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("share_links")
    .insert({
      token,
      expires_at: expiresAt,
    })
    .select("token, expires_at, created_at")
    .single();

  if (error) {
    console.error("创建分享链接失败:", error);
    return null;
  }

  return data as ShareLink;
}

export async function getShareLink(token: string): Promise<ShareLink | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("share_links")
    .select("token, expires_at, created_at")
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }

  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }

  return data as ShareLink;
}

export async function getShareMembers(): Promise<{
  data: {
    id: number;
    name: string;
    generation: number | null;
    sibling_order: number | null;
    father_id: number | null;
    gender: "男" | "女" | null;
    official_position: string | null;
    is_alive: boolean;
    spouse: string | null;
    spouse_id: number | null;
    remarks: string | null;
    birthday: string | null;
    death_date: string | null;
    burial_place: string | null;
    residence_place: string | null;
    contact: string | null;
    avatar: string | null;
  }[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("family_members")
    .select("id, name, generation, sibling_order, father_id, gender, official_position, is_alive, spouse, spouse_id, remarks, birthday, death_date, burial_place, residence_place, contact, avatar")
    .order("generation", { ascending: true })
    .order("sibling_order", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

export async function getShareMemberById(memberId: number): Promise<{
  data: {
    id: number;
    name: string;
    generation: number | null;
    sibling_order: number | null;
    father_id: number | null;
    gender: "男" | "女" | null;
    official_position: string | null;
    is_alive: boolean;
    spouse: string | null;
    spouse_id: number | null;
    remarks: string | null;
    birthday: string | null;
    death_date: string | null;
    burial_place: string | null;
    residence_place: string | null;
    contact: string | null;
    avatar: string | null;
  } | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("family_members")
    .select("id, name, generation, sibling_order, father_id, gender, official_position, is_alive, spouse, spouse_id, remarks, birthday, death_date, burial_place, residence_place, contact, avatar")
    .eq("id", memberId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data || null, error: null };
}

export async function getShareLifeEventsByMemberId(memberId: number): Promise<{
  data: {
    id: number;
    title: string;
    description: string | null;
    event_date: string | null;
    created_at: string;
  }[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("life_events")
    .select("id, title, description, event_date, created_at")
    .eq("family_member_id", memberId)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}
