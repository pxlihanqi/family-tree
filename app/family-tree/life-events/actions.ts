"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// 生平事迹类型定义
export interface LifeEvent {
  id: number;
  family_member_id: number;
  title: string;
  description: string | null;
  event_date: string | null;
  created_at: string;
  updated_at: string;
}

// 创建生平事迹的输入类型
export interface CreateLifeEventInput {
  family_member_id: number;
  title: string;
  description: string | null;
  event_date: string | null;
}

// 更新生平事迹的输入类型
export interface UpdateLifeEventInput {
  title: string;
  description: string | null;
  event_date: string | null;
}

/**
 * 获取家族成员的所有生平事迹
 * @param familyMemberId 家族成员ID
 * @returns 生平事迹数组，按事件日期排序
 */
export async function getLifeEventsByFamilyMemberId(familyMemberId: number): Promise<LifeEvent[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("life_events")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("获取生平事迹失败:", error);
    return [];
  }

  return data;
}

/**
 * 创建新的生平事迹
 * @param input 生平事迹信息
 * @returns 创建成功的生平事迹
 */
export async function createLifeEvent(input: CreateLifeEventInput): Promise<LifeEvent | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("life_events")
    .insert({
      family_member_id: input.family_member_id,
      title: input.title,
      description: input.description,
      event_date: input.event_date,
    })
    .select("*")
    .single();

  if (error) {
    console.error("创建生平事迹失败:", error);
    return null;
  }

  // 重新验证路径，确保页面数据更新
  revalidatePath(`/family-tree`);
  
  return data;
}

/**
 * 更新生平事迹
 * @param eventId 生平事迹ID
 * @param input 更新的信息
 * @returns 更新成功的生平事迹
 */
export async function updateLifeEvent(eventId: number, input: UpdateLifeEventInput): Promise<LifeEvent | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("life_events")
    .update({
      title: input.title,
      description: input.description,
      event_date: input.event_date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select("*")
    .single();

  if (error) {
    console.error("更新生平事迹失败:", error);
    return null;
  }

  // 重新验证路径，确保页面数据更新
  revalidatePath(`/family-tree`);
  
  return data;
}

/**
 * 删除生平事迹
 * @param eventId 生平事迹ID
 * @returns 删除是否成功
 */
export async function deleteLifeEvent(eventId: number): Promise<boolean> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("life_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    console.error("删除生平事迹失败:", error);
    return false;
  }

  // 重新验证路径，确保页面数据更新
  revalidatePath(`/family-tree`);
  
  return true;
}
