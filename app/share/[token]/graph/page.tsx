import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getShareLink, getShareMembers } from "../../actions";
import { FamilyTreeGraph } from "@/app/family-tree/graph/family-tree-graph";

interface ShareGraphPageProps {
  params: Promise<{ token: string }>;
}

export default function ShareGraphPage({ params }: ShareGraphPageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <ShareGraphContent params={params} />
    </Suspense>
  );
}

async function ShareGraphContent({ params }: ShareGraphPageProps) {
  const { token } = await params;
  const share = await getShareLink(token);
  if (!share) {
    notFound();
  }

  const { data, error } = await getShareMembers();
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold mb-4">族谱分享（只读）</h1>
        <div className="text-sm text-red-500">加载数据失败：{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold mb-4">族谱分享（只读）</h1>
        <div className="text-sm text-muted-foreground">暂无族谱数据</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-background">
      <div className="h-full w-full p-0 sm:p-0">
        <FamilyTreeGraph initialData={data} readonly />
      </div>
    </div>
  );
}
