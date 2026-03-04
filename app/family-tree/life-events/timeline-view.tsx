"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, Info } from "lucide-react";
import type { LifeEvent } from "./actions";
import { RichTextViewer } from "@/components/rich-text/viewer";
import { cn } from "@/lib/utils";

interface TimelineViewProps {
  lifeEvents: LifeEvent[];
}

export function TimelineView({ lifeEvents }: TimelineViewProps) {
  // 按时间排序事件，无日期的事件放在最后
  const sortedEvents = [...lifeEvents].sort((a, b) => {
    if (!a.event_date) return 1;
    if (!b.event_date) return -1;
    return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
  });

  return (
    <div className="space-y-6">
      {/* 时间轴标题 */}
      <div>
        <h2 className="text-xl font-serif font-semibold tracking-wide text-slate-800 dark:text-slate-100 mb-1">
          生平时间轴
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-300/80">
          按时间顺序展示家族成员的重要人生事件
        </p>
      </div>

      {/* 时间轴内容 */}
      <div className="relative">
        {/* 时间轴线 */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-300 via-cyan-300 to-slate-300 dark:from-amber-500/60 dark:via-cyan-500/60 dark:to-slate-500/60"></div>

        {/* 时间轴事件 */}
        <div className="space-y-6">
          {sortedEvents.length === 0 ? (
            <div className="text-center py-12 border border-slate-200/70 dark:border-slate-700 rounded-xl bg-gradient-to-br from-slate-50 to-cyan-50/40 dark:from-slate-900/50 dark:to-cyan-950/30">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                <Clock className="h-8 w-8 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-lg text-slate-500 dark:text-slate-300/80">
                暂无生平事迹记录
              </p>
            </div>
          ) : (
            sortedEvents.map((event, index) => (
              <div key={event.id} className="relative pl-12">
                {/* 时间轴点 */}
                <div className="absolute left-1.5 top-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-cyan-500 border-2 border-white dark:border-slate-900 shadow-sm z-10"></div>
                
                {/* 事件内容 */}
                <Card className="transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden border-slate-200/80 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-900/70">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <CardTitle className="text-base font-serif font-semibold text-slate-800 dark:text-slate-100 break-words [overflow-wrap:anywhere]">
                        {event.title}
                      </CardTitle>
                      {event.event_date && (
                        <div className="flex items-center gap-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/70 px-2 py-1 rounded-md w-fit">
                          <Calendar className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                          <span className="font-medium">{new Date(event.event_date).toLocaleDateString("zh-CN")}</span>
                        </div>
                      )}
                    </div>
                    {!event.event_date && (
                      <CardDescription className="text-slate-500 dark:text-slate-400">
                        无具体日期
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-3">
                    {event.description && (
                      <div className="flex items-start gap-2 text-sm min-w-0">
                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500 dark:text-amber-400" />
                        <RichTextViewer
                          value={event.description}
                          className="min-w-0 flex-1 !text-slate-700 dark:!text-slate-200"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
