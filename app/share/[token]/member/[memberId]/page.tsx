import { notFound } from "next/navigation";
import { getShareLink, getShareLifeEventsByMemberId, getShareMemberById, getShareMembers } from "@/app/share/actions";
import { RichTextViewer } from "@/components/rich-text/viewer";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { getLunarAgeText } from "@/lib/lunar-age";

interface ShareMemberPageProps {
  params: Promise<{ token: string; memberId: string }>;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return `${y}年${m}月${d}日`;
}

function getZodiacText(birthday: string | null) {
  if (!birthday) return "未记录";
  const year = new Date(birthday).getFullYear();
  if (Number.isNaN(year)) return "未记录";
  const zodiac = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
  return zodiac[((year - 4) % 12 + 12) % 12] ?? "未记录";
}

export default async function ShareMemberPage({ params }: ShareMemberPageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
      <ShareMemberContent params={params} />
    </Suspense>
  );
}

async function ShareMemberContent({ params }: ShareMemberPageProps) {
  const { token, memberId } = await params;
  const share = await getShareLink(token);
  if (!share) {
    notFound();
  }

  const id = Number.parseInt(memberId, 10);
  if (Number.isNaN(id)) {
    notFound();
  }

  const { data: member, error } = await getShareMemberById(id);
  const { data: allMembers } = await getShareMembers();
  const { data: lifeEvents } = await getShareLifeEventsByMemberId(id);
  if (error || !member) {
    return (
      <div className="min-h-screen bg-stone-50 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-lg border bg-white p-6 text-sm text-red-500">
          加载成员详情失败：{error || "未找到成员"}
        </div>
      </div>
    );
  }

  const fatherName = member.father_id
    ? allMembers.find((item) => item.id === member.father_id)?.name || "未记录"
    : "未记录";
  const siblings = allMembers.filter((item) => item.father_id === member.father_id && item.id !== member.id);
  const ownChildren = allMembers.filter((item) => item.father_id === member.id);
  const spouseChildren =
    member.gender === "女" && member.spouse_id
      ? allMembers.filter((item) => item.father_id === member.spouse_id)
      : [];
  const children = Array.from(new Map([...ownChildren, ...spouseChildren].map((item) => [item.id, item])).values());
  const ageText = getLunarAgeText(member.birthday, member.death_date);
  const zodiacText = getZodiacText(member.birthday);

  return (
    <div className="min-h-screen bg-[#fdfbf7] px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-5xl rounded-lg border-2 border-double border-stone-200 bg-white shadow-xl">
        <div className="border-b bg-stone-100/50 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-full border-2 border-stone-300 bg-stone-200">
              {member.avatar ? <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-800">{member.name}</h1>
              <p className="text-xs text-stone-500">
                {member.generation ? `第 ${member.generation} 世` : "世代未知"}
                {member.sibling_order ? ` • 行 ${member.sibling_order}` : ""}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {member.gender ? (
              <Badge variant="outline" className={member.gender === "男" ? "border-blue-200 text-blue-700 bg-blue-50" : "border-pink-200 text-pink-700 bg-pink-50"}>
                {member.gender}
              </Badge>
            ) : null}
            <Badge variant="outline" className={member.is_alive ? "border-green-200 text-green-700 bg-green-50" : "border-stone-300 text-stone-600 bg-stone-100"}>
              {member.is_alive ? "在世" : "已故"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-2">
          <div className="space-y-4 text-sm text-stone-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-stone-500 mb-1">父亲</div>
                <div className="rounded border bg-stone-50 p-2">{fatherName}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-1">配偶</div>
                <div className="rounded border bg-stone-50 p-2">{member.spouse || "未记录"}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>生辰：{formatDate(member.birthday)}</div>
              <div>卒年：{member.is_alive ? "-" : formatDate(member.death_date)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>年龄：{ageText}</div>
              <div>生肖：{zodiacText}</div>
            </div>
            <div>居住地：{member.residence_place || "未记录"}</div>
            <div>联系方式：{member.is_alive ? member.contact || "未记录" : "-"}</div>
            {!member.is_alive ? <div>埋葬地点：{member.burial_place || "未记录"}</div> : null}
            <div>官职：{member.official_position || "未记录"}</div>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs text-stone-500 mb-1">兄弟姐妹</div>
              <div className="flex flex-wrap gap-2">
                {siblings.length === 0 ? <span className="text-stone-500">未记录</span> : siblings.map((item) => (
                  <a key={item.id} className="rounded bg-stone-100 px-2 py-1 text-xs hover:bg-stone-200" href={`/share/${token}/member/${item.id}`}>
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-500 mb-1">子女</div>
              <div className="flex flex-wrap gap-2">
                {children.length === 0 ? <span className="text-stone-500">未记录</span> : children.map((item) => (
                  <a key={item.id} className="rounded bg-stone-100 px-2 py-1 text-xs hover:bg-stone-200" href={`/share/${token}/member/${item.id}`}>
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
            <div className="rounded border p-3">
              <div className="mb-2 text-xs text-stone-500">简介</div>
              {member.remarks ? <RichTextViewer value={member.remarks} /> : <div className="text-stone-500">暂无简介</div>}
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 sm:px-8 sm:pb-8">
          <div className="rounded-lg border p-4">
            <div className="mb-3 text-sm font-medium text-stone-700">人生事迹</div>
            <div className="space-y-3">
              {lifeEvents.length === 0 ? (
                <div className="text-sm text-stone-500">暂无人生事迹记录</div>
              ) : (
                lifeEvents.map((event) => (
                  <div key={event.id} className="rounded-md border bg-stone-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-stone-800">{event.title}</div>
                      <div className="text-xs text-stone-500">{event.event_date ? formatDate(event.event_date) : "无具体日期"}</div>
                    </div>
                    <div className="mt-2 text-sm text-stone-600">
                      {event.description ? <RichTextViewer value={event.description} /> : "暂无说明"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
