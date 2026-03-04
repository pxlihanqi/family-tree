import { Suspense } from "react";
import { getRolesAndPermissions } from "./actions";
import { PermissionsClient } from "./permissions-client";

async function PermissionsLoader() {
  const data = await getRolesAndPermissions();
  return <PermissionsClient {...data} />;
}

export default function PermissionsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">权限与角色管理</h1>
      <Suspense fallback={<div className="animate-pulse h-48 bg-stone-100 rounded-lg" />}>
        <PermissionsLoader />
      </Suspense>
    </div>
  );
}
