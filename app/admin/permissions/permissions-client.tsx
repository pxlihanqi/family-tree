"use client";

import * as React from "react";
import { showAlert } from "@/lib/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Permission, Role } from "./actions";
import { assignUserRole, removeUserRole, updateRolePermissions } from "./actions";

interface PermissionsClientProps {
  roles: Role[];
  permissions: Permission[];
  rolePermissions: { role_id: number; permission_id: number }[];
  error: string | null;
}

export function PermissionsClient({ roles, permissions, rolePermissions, error }: PermissionsClientProps) {
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>(roles[0]?.id.toString() ?? "");
  const [saving, setSaving] = React.useState(false);
  const [userId, setUserId] = React.useState("");
  const [userRoleId, setUserRoleId] = React.useState<string>(roles[0]?.id.toString() ?? "");

  const rolePermissionSet = React.useMemo(() => {
    const map = new Map<number, Set<number>>();
    rolePermissions.forEach((rp) => {
      if (!map.has(rp.role_id)) map.set(rp.role_id, new Set());
      map.get(rp.role_id)?.add(rp.permission_id);
    });
    return map;
  }, [rolePermissions]);

  const [checked, setChecked] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    const roleId = Number(selectedRoleId);
    const current = rolePermissionSet.get(roleId) ?? new Set();
    setChecked(new Set(current));
  }, [selectedRoleId, rolePermissionSet]);

  if (error) {
    return <div className="text-sm text-red-500">加载失败：{error}</div>;
  }

  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    acc[perm.resource] = acc[perm.resource] || [];
    acc[perm.resource].push(perm);
    return acc;
  }, {});

  const handleSave = async () => {
    setSaving(true);
    const roleId = Number(selectedRoleId);
    const result = await updateRolePermissions(roleId, Array.from(checked));
    setSaving(false);

    if (!result.success) {
      showAlert(result.error || "保存失败");
    } else {
      window.location.reload();
    }
  };

  const handleAssignRole = async () => {
    if (!userId.trim()) return;
    const result = await assignUserRole(userId.trim(), Number(userRoleId));
    if (!result.success) {
      showAlert(result.error || "分配失败");
    } else {
      showAlert("分配成功");
    }
  };

  const handleRemoveRole = async () => {
    if (!userId.trim()) return;
    const result = await removeUserRole(userId.trim(), Number(userRoleId));
    if (!result.success) {
      showAlert(result.error || "移除失败");
    } else {
      showAlert("已移除");
    }
  };

  return (
    <div className="space-y-8">
      <div className="border rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold">用户角色分配</h2>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="user-id">用户ID（UUID）</Label>
            <Input id="user-id" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="输入用户 UUID" />
          </div>
          <div className="space-y-2">
            <Label>角色</Label>
            <Select value={userRoleId} onValueChange={setUserRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAssignRole}>分配角色</Button>
          <Button variant="outline" onClick={handleRemoveRole}>移除角色</Button>
        </div>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">角色权限配置</h2>
            <p className="text-sm text-muted-foreground">勾选权限后保存</p>
          </div>
          <div className="min-w-[200px]">
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="border rounded-md p-3">
              <div className="text-sm font-medium mb-2">{resource}</div>
              <div className="flex flex-wrap gap-3">
                {perms.map((perm) => (
                  <label key={perm.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked.has(perm.id)}
                      onCheckedChange={(value) => {
                        const next = new Set(checked);
                        if (value) {
                          next.add(perm.id);
                        } else {
                          next.delete(perm.id);
                        }
                        setChecked(next);
                      }}
                    />
                    {perm.action}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存权限"}
          </Button>
        </div>
      </div>
    </div>
  );
}
