"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/permissions";

export async function logAudit(params: {
  action: "create" | "update" | "delete";
  resource: string;
  recordId?: string | number | null;
  details?: Record<string, unknown> | null;
}) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const payload = {
    user_id: userId,
    action: params.action,
    resource: params.resource,
    record_id: params.recordId ? String(params.recordId) : null,
    details: params.details ?? null,
  };

  const { error } = await supabase.from("audit_logs").insert(payload);
  if (error) {
    console.error("写入操作日志失败:", error);
  }
}
