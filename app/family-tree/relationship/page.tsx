import { Suspense } from "react";
import { fetchAllFamilyMembers } from "../graph/actions";
import { RelationshipClient } from "./relationship-client";

async function RelationshipContent() {
  const { data, error } = await fetchAllFamilyMembers();

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold mb-6">关系路径</h1>
        <div className="text-sm text-red-500">加载成员数据失败：{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">关系路径</h1>
      <RelationshipClient members={data} />
    </div>
  );
}

export default function RelationshipPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 px-4">加载关系路径中...</div>}>
      <RelationshipContent />
    </Suspense>
  );
}
