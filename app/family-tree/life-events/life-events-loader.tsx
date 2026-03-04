import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getLifeEventsByFamilyMemberId } from "./actions";
import { LifeEvents } from "./life-events";
import { TimelineView } from "./timeline-view";
import { fetchMemberById } from "../actions";

interface LifeEventsLoaderProps {
  memberId: number | null;
}

export async function LifeEventsLoader({ memberId }: LifeEventsLoaderProps) {
  if (!memberId) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold mb-4">请选择家族成员</h1>
          <Button asChild>
            <Link href="/family-tree">
            <ChevronLeft className="h-4 w-4 mr-2" />
            返回家族成员列表
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // 获取家族成员信息
  const familyMember = await fetchMemberById(memberId);
  
  if (!familyMember) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-semibold mb-4">家族成员不存在</h1>
          <Button asChild>
            <Link href="/family-tree">
            <ChevronLeft className="h-4 w-4 mr-2" />
            返回家族成员列表
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // 获取生平事迹
  const lifeEvents = await getLifeEventsByFamilyMemberId(memberId);

  return (
    <div className="space-y-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/family-tree">
            <ChevronLeft className="h-4 w-4 mr-2" />
            返回列表
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            {familyMember.name} 的生平事迹
          </h1>
        </div>
        <p className="text-stone-500 dark:text-stone-400">
          记录和查看 {familyMember.name} 的重要人生事件
        </p>
      </div>

      {/* 内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 生平事迹管理 */}
        <div>
          <LifeEvents
            familyMemberId={memberId}
            lifeEvents={lifeEvents}
          />
        </div>

        {/* 时间轴视图 */}
        <div>
          <TimelineView lifeEvents={lifeEvents} />
        </div>
      </div>
    </div>
  );
}
