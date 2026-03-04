"use server";

import { createClient } from "@/lib/supabase/server";

export interface Announcement {
  id: number;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  capacity: number | null;
  created_at: string;
}

export interface AnnouncementWithStats extends Announcement {
  signup_count: number;
}

export interface AnnouncementSignup {
  id: number;
  announcement_id: number;
  name: string;
  contact: string | null;
  notes: string | null;
  created_at: string;
}

export async function getAnnouncements(): Promise<AnnouncementWithStats[]> {
  const supabase = await createClient();

  const { data: announcements, error } = await supabase
    .from("announcements")
    .select("*")
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("获取公告失败:", error);
    return [];
  }

  const ids = (announcements || []).map((item) => item.id);
  if (ids.length === 0) return [];

  const { data: signups, error: signupsError } = await supabase
    .from("announcement_signups")
    .select("announcement_id")
    .in("announcement_id", ids);

  if (signupsError) {
    console.error("获取报名数据失败:", signupsError);
  }

  const countMap = new Map<number, number>();
  (signups || []).forEach((item) => {
    countMap.set(item.announcement_id, (countMap.get(item.announcement_id) || 0) + 1);
  });

  return (announcements || []).map((item) => ({
    ...item,
    signup_count: countMap.get(item.id) || 0,
  }));
}

export async function getAnnouncementById(id: number): Promise<AnnouncementWithStats | null> {
  const supabase = await createClient();

  const { data: announcement, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !announcement) {
    console.error("获取公告失败:", error);
    return null;
  }

  const { count, error: countError } = await supabase
    .from("announcement_signups")
    .select("*", { count: "exact", head: true })
    .eq("announcement_id", id);

  if (countError) {
    console.error("获取报名人数失败:", countError);
  }

  return {
    ...announcement,
    signup_count: count ?? 0,
  };
}

export async function createAnnouncement(input: {
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  capacity: number | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      event_date: input.event_date || null,
      location: input.location?.trim() || null,
      capacity: input.capacity,
    });

  if (error) {
    console.error("创建公告失败:", error);
    return false;
  }

  return true;
}

export async function updateAnnouncement(id: number, input: {
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  capacity: number | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      event_date: input.event_date || null,
      location: input.location?.trim() || null,
      capacity: input.capacity,
    })
    .eq("id", id);

  if (error) {
    console.error("更新公告失败:", error);
    return false;
  }

  return true;
}

export async function deleteAnnouncement(id: number): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) {
    console.error("删除公告失败:", error);
    return false;
  }
  return true;
}

export async function signupAnnouncement(input: {
  announcement_id: number;
  name: string;
  contact: string | null;
  notes: string | null;
}): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcement_signups")
    .insert({
      announcement_id: input.announcement_id,
      name: input.name.trim(),
      contact: input.contact?.trim() || null,
      notes: input.notes?.trim() || null,
    });

  if (error) {
    console.error("报名失败:", error);
    return false;
  }

  return true;
}

export async function getSignupsByAnnouncementId(announcementId: number): Promise<AnnouncementSignup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcement_signups")
    .select("*")
    .eq("announcement_id", announcementId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("获取报名列表失败:", error);
    return [];
  }

  return data || [];
}
