import { fetchMemorialMembers } from "./actions";
import { MemorialClient } from "./memorial-client";

export async function MemorialLoader() {
  const { data, error } = await fetchMemorialMembers();

  if (error) {
    return <div className="text-sm text-red-500">加载纪念页数据失败：{error}</div>;
  }

  return <MemorialClient members={data} />;
}
