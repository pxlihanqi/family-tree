"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit/log";

export interface Role {
  id: number;
  name: string;
  description: string | null;
}

export interface Permission {
  id: number;
  resource: string;
  action: string;
  description: string | null;
}

export async function getRolesAndPermissions() {
  const supabase = await createClient();

  const [roles, permissions, rolePerms] = await Promise.all([
    supabase.from("roles").select("*").order("id", { ascending: true }),
    supabase.from("permissions").select("*").order("resource", { ascending: true }),
    supabase.from("role_permissions").select("role_id, permission_id"),
  ]);

  return {
    roles: roles.data || [],
    permissions: permissions.data || [],
    rolePermissions: rolePerms.data || [],
    error: roles.error?.message || permissions.error?.message || rolePerms.error?.message || null,
  };
}

export async function updateRolePermissions(roleId: number, permissionIds: number[]) {
  const permission = await requirePermission("role_permissions", "update");
  if (!permission.ok) {
    return { success: false, error: permission.error ?? "没有权限" };
  }

  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  if (permissionIds.length > 0) {
    const { error: insertError } = await supabase
      .from("role_permissions")
      .insert(permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })));

    if (insertError) {
      return { success: false, error: insertError.message };
    }
  }

  await logAudit({
    action: "update",
    resource: "role_permissions",
    recordId: roleId,
    details: { permissionIds },
  });

  return { success: true, error: null };
}

export async function assignUserRole(userId: string, roleId: number) {
  const permission = await requirePermission("user_roles", "update");
  if (!permission.ok) {
    return { success: false, error: permission.error ?? "没有权限" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role_id: roleId }, { onConflict: "user_id,role_id" });

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    action: "update",
    resource: "user_roles",
    details: { userId, roleId },
  });

  return { success: true, error: null };
}

export async function removeUserRole(userId: string, roleId: number) {
  const permission = await requirePermission("user_roles", "update");
  if (!permission.ok) {
    return { success: false, error: permission.error ?? "没有权限" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role_id", roleId);

  if (error) {
    return { success: false, error: error.message };
  }

  await logAudit({
    action: "delete",
    resource: "user_roles",
    details: { userId, roleId },
  });

  return { success: true, error: null };
}
