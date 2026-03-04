"use server";

import { createClient } from "@/lib/supabase/server";

export interface Offering {
  id: number;
  family_member_id: number;
  content: string;
  offered_by: string | null;
  offered_at: string;
}

export async function getOfferingsByMemberId(familyMemberId: number): Promise<Offering[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("offerings")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .order("offered_at", { ascending: false });

  if (error) {
    console.error("获取祭拜记录失败:", error);
    return [];
  }

  return data || [];
}

export async function createOffering(options: {
  family_member_id: number;
  content: string;
  offered_by: string | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const content = options.content.trim();

  if (!content) {
    return false;
  }

  const { error } = await supabase
    .from("offerings")
    .insert({
      family_member_id: options.family_member_id,
      content,
      offered_by: options.offered_by?.trim() || null,
    });

  if (error) {
    console.error("创建祭拜记录失败:", error);
    return false;
  }

  return true;
}

export async function deleteOffering(offeringId: number): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("offerings")
    .delete()
    .eq("id", offeringId);

  if (error) {
    console.error("删除祭拜记录失败:", error);
    return false;
  }

  return true;
}
