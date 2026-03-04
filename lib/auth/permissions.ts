"use server";

import { createClient } from "@/lib/supabase/server";

export async function requirePermission(resource: string, action: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return { ok: false, error: "未登录" };
  }

  const { data, error } = await supabase.rpc("has_permission", {
    p_resource: resource,
    p_action: action,
  });

  if (error) {
    console.error("权限检查失败:", error);
    return { ok: false, error: "权限检查失败" };
  }

  if (!data) {
    return { ok: false, error: "没有权限" };
  }

  return { ok: true };
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}
