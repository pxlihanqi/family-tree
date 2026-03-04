"use client";

import * as React from "react";
import type { MemorialMember } from "./actions";
import { getOfferingsByMemberId } from "../offerings/actions";
import type { Offering } from "../offerings/actions";
import { Offerings } from "../offerings/offerings";
import { Flower2, Flame, Apple, CupSoda, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { RichTextViewer } from "@/components/rich-text/viewer";

interface MemorialClientProps {
  members: MemorialMember[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${y}年${m}月${d}日`;
}

export function MemorialClient({ members }: MemorialClientProps) {
  const [selectedId, setSelectedId] = React.useState<number | null>(members[0]?.id ?? null);
  const [offerings, setOfferings] = React.useState<Offering[]>([]);
  const [isLoadingOfferings, setIsLoadingOfferings] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredMembers = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter((member) => member.name.toLowerCase().includes(query));
  }, [members, searchQuery]);

  React.useEffect(() => {
    if (filteredMembers.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!filteredMembers.some((member) => member.id === selectedId)) {
      setSelectedId(filteredMembers[0].id);
    }
  }, [filteredMembers, selectedId]);

  const selectedMember = filteredMembers.find((member) => member.id === selectedId) ?? null;

  React.useEffect(() => {
    const loadOfferings = async () => {
      if (!selectedId) return;
      setIsLoadingOfferings(true);
      try {
        const data = await getOfferingsByMemberId(selectedId);
        setOfferings(data);
      } catch (error) {
        console.error("获取祭拜记录失败:", error);
      } finally {
        setIsLoadingOfferings(false);
      }
    };

    loadOfferings();
  }, [selectedId]);

  if (members.length === 0) {
    return (
      <div className="text-center py-16 border rounded-lg">
        <p className="text-sm text-muted-foreground">暂无已故成员</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="border rounded-xl overflow-hidden bg-stone-50/80">
        <div className="px-4 py-3 border-b space-y-3">
          <div className="text-xs font-semibold tracking-[0.2em] text-stone-500 uppercase">已故成员</div>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索已故成员姓名"
            className="h-9 bg-white"
          />
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-stone-500">未找到匹配成员</div>
          ) : (
            filteredMembers.map((member) => (
              <button
                type="button"
                key={member.id}
                onClick={() => setSelectedId(member.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-stone-100 transition-colors",
                  selectedId === member.id && "bg-stone-100"
                )}
              >
                <div className="font-semibold text-sm text-stone-800 font-serif">{member.name}</div>
                <div className="text-xs text-stone-500 mt-1">
                  {member.generation ? `第${member.generation}世` : "世代未知"}
                  {member.sibling_order ? ` · 行${member.sibling_order}` : ""}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="space-y-6">
        {selectedMember ? (
          <div className="border rounded-xl p-6 bg-white shadow-sm">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="w-28 h-28 rounded-full overflow-hidden border border-stone-200 bg-stone-100 flex items-center justify-center text-2xl font-semibold text-stone-700 font-serif">
                {selectedMember.avatar ? (
                  <img
                    src={selectedMember.avatar}
                    alt={selectedMember.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  selectedMember.name.slice(0, 1)
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-xl font-semibold text-stone-800 font-serif">{selectedMember.name}</h2>
                  <p className="text-sm text-stone-500">
                    {selectedMember.generation ? `第${selectedMember.generation}世` : "世代未知"}
                    {selectedMember.sibling_order ? ` · 行${selectedMember.sibling_order}` : ""}
                    {selectedMember.gender ? ` · ${selectedMember.gender}` : ""}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-sm text-stone-700">
                  <div>
                    <span className="text-stone-500">生辰：</span>
                    {formatDate(selectedMember.birthday)}
                  </div>
                  <div>
                    <span className="text-stone-500">卒年：</span>
                    {formatDate(selectedMember.death_date)}
                  </div>
                  <div>
                    <span className="text-stone-500">居住地：</span>
                    {selectedMember.residence_place || "未记录"}
                  </div>
                  <div>
                    <span className="text-stone-500">官职：</span>
                    {selectedMember.official_position || "未记录"}
                  </div>
                  <div>
                    <span className="text-stone-500">配偶：</span>
                    {selectedMember.spouse || "未记录"}
                  </div>
                  <div>
                    <span className="text-stone-500">埋葬地点：</span>
                    {selectedMember.burial_place || "未记录"}
                  </div>
                </div>
                <div className="pt-1">
                  <div className="text-stone-500 text-sm mb-1">简介：</div>
                  <div className="rounded-md border bg-stone-50 p-3 text-sm text-stone-700">
                    {selectedMember.remarks ? (
                      <RichTextViewer value={selectedMember.remarks} />
                    ) : (
                      "未记录"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {selectedMember ? (
          isLoadingOfferings ? (
            <div className="text-sm text-muted-foreground">加载祭拜记录中...</div>
          ) : (
            <Offerings
              familyMemberId={selectedMember.id}
              offerings={offerings}
              quickPresets={[
                { label: "鲜花一束", icon: <Flower2 className="h-4 w-4" /> },
                { label: "清香一炷", icon: <Flame className="h-4 w-4" /> },
                { label: "贡果一盘", icon: <Apple className="h-4 w-4" /> },
                { label: "清茶一盏", icon: <CupSoda className="h-4 w-4" /> },
                { label: "素帛一缕", icon: <ScrollText className="h-4 w-4" /> },
              ]}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
