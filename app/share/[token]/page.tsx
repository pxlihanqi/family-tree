import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getShareLink, getShareMembers } from "../actions";

function maskContact(value: string | null) {
  if (!value) return "-";
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "****";
  return `${trimmed.slice(0, 3)}****${trimmed.slice(-2)}`;
}

function maskDate(value: string | null) {
  if (!value) return "-";
  return value.slice(0, 4) + "年";
}

function maskResidence(value: string | null) {
  if (!value) return "-";
  const trimmed = value.trim();
  if (trimmed.length <= 2) return trimmed[0] + "**";
  return trimmed.slice(0, 2) + "**";
}

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
      <ShareContent params={params} />
    </Suspense>
  );
}

async function ShareContent({ params }: SharePageProps) {
  const { token } = await params;
  const share = await getShareLink(token);
  if (!share) {
    notFound();
  }

  const { data, error } = await getShareMembers();
  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold mb-6">族谱分享</h1>
        <div className="text-sm text-red-500">加载数据失败：{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="container mx-auto py-10 px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">族谱分享（只读）</h1>
          <p className="text-sm text-stone-500">已对敏感字段脱敏显示</p>
        </div>

        <div className="overflow-x-auto bg-white rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-stone-600">
              <tr>
                <th className="text-left p-3">姓名</th>
                <th className="text-left p-3">世代</th>
                <th className="text-left p-3">排行</th>
                <th className="text-left p-3">性别</th>
                <th className="text-left p-3">生日</th>
                <th className="text-left p-3">居住地</th>
                <th className="text-left p-3">联系方式</th>
              </tr>
            </thead>
            <tbody>
              {data.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="p-3 font-medium">{member.name}</td>
                  <td className="p-3">{member.generation ? `第${member.generation}世` : "-"}</td>
                  <td className="p-3">{member.sibling_order ?? "-"}</td>
                  <td className="p-3">{member.gender ?? "-"}</td>
                  <td className="p-3">{maskDate(member.birthday)}</td>
                  <td className="p-3">{maskResidence(member.residence_place)}</td>
                  <td className="p-3">{maskContact(member.contact)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
