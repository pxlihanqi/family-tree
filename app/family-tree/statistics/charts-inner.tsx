"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StatisticsData } from "./actions";

interface StatisticsChartsInnerProps {
  data: StatisticsData;
}

const chartGridClass = "stroke-muted/40";
const axisClass = "text-[11px] fill-muted-foreground";

export function StatisticsChartsInner({ data }: StatisticsChartsInnerProps) {
  const maleCount = data.genderStats.find((g) => g.name === "男")?.value || 0;
  const femaleCount = data.genderStats.find((g) => g.name === "女")?.value || 0;
  const aliveCount = data.statusStats.find((s) => s.name === "在世")?.value || 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <Card className="xl:col-span-12 border-0 shadow-sm bg-gradient-to-r from-sky-50/80 via-background to-emerald-50/80 dark:from-sky-950/20 dark:to-emerald-950/20">
        <CardHeader>
          <CardTitle>数据概览</CardTitle>
          <CardDescription>成员规模、完整度与年龄摘要</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-center">
          <div className="rounded-lg bg-background/70 border p-3">
            <div className="text-3xl font-bold text-sky-600">{data.totalMembers}</div>
            <div className="text-xs text-muted-foreground mt-1">总人数</div>
          </div>
          <div className="rounded-lg bg-background/70 border p-3">
            <div className="text-3xl font-bold text-blue-600">{maleCount}</div>
            <div className="text-xs text-muted-foreground mt-1">在世男性</div>
          </div>
          <div className="rounded-lg bg-background/70 border p-3">
            <div className="text-3xl font-bold text-pink-600">{femaleCount}</div>
            <div className="text-xs text-muted-foreground mt-1">在世女性</div>
          </div>
          <div className="rounded-lg bg-background/70 border p-3">
            <div className="text-3xl font-bold text-emerald-600">{aliveCount}</div>
            <div className="text-xs text-muted-foreground mt-1">在世成员</div>
          </div>
          <div className="rounded-lg bg-background/70 border p-3">
            <div className="text-3xl font-bold text-violet-600">{data.generationStats.length}</div>
            <div className="text-xs text-muted-foreground mt-1">世代层级</div>
          </div>
          <div className="rounded-lg bg-background/70 border p-3">
            <div className="text-3xl font-bold text-amber-600">{data.avgLivingAge ?? "-"}</div>
            <div className="text-xs text-muted-foreground mt-1">在世平均年龄</div>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-4 shadow-sm">
        <CardHeader>
          <CardTitle>性别比例</CardTitle>
          <CardDescription>在世成员性别分布情况</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.genderStats}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={88}
                dataKey="value"
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {data.genderStats.map((entry, index) => (
                  <Cell key={`gender-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, "人数"]} />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-4 shadow-sm">
        <CardHeader>
          <CardTitle>在世状态</CardTitle>
          <CardDescription>在世与已故成员占比</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.statusStats}
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={88}
                dataKey="value"
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {data.statusStats.map((entry, index) => (
                  <Cell key={`status-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, "人数"]} />
              <Legend verticalAlign="bottom" height={24} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-4 shadow-sm">
        <CardHeader>
          <CardTitle>年龄摘要</CardTitle>
          <CardDescription>在世与已故年龄关键指标</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
          <div className="rounded-lg border bg-muted/20 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">在世平均年龄</span>
            <span className="text-xl font-semibold">{data.avgLivingAge ?? "-"}</span>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">已故平均寿命</span>
            <span className="text-xl font-semibold">{data.avgLifespan ?? "-"}</span>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">在世最高龄</span>
            <span className="text-right">
              <span className="text-sm font-medium block">{data.oldestLiving?.name ?? "-"}</span>
              <span className="text-xs text-muted-foreground">{data.oldestLiving ? `${data.oldestLiving.age} 岁` : "暂无"}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-6 shadow-sm">
        <CardHeader>
          <CardTitle>世代分布趋势</CardTitle>
          <CardDescription>各世代成员数量变化</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.generationStats} margin={{ top: 14, right: 20, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="generationFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className={chartGridClass} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} className={axisClass} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} className={axisClass} />
              <Tooltip formatter={(value) => [value, "人数"]} />
              <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#generationFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-6 shadow-sm">
        <CardHeader>
          <CardTitle>世代性别结构</CardTitle>
          <CardDescription>每一代中的男女与未知数量</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.generationGenderStats} margin={{ top: 14, right: 20, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className={chartGridClass} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} className={axisClass} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} className={axisClass} />
              <Tooltip formatter={(value) => [value, "人数"]} />
              <Legend />
              <Bar dataKey="male" name="男" fill="#3b82f6" radius={[3, 3, 0, 0]} stackId="g" />
              <Bar dataKey="female" name="女" fill="#ec4899" radius={[3, 3, 0, 0]} stackId="g" />
              <Bar dataKey="unknown" name="未知" fill="#94a3b8" radius={[3, 3, 0, 0]} stackId="g" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-6 shadow-sm">
        <CardHeader>
          <CardTitle>在世成员年龄分布</CardTitle>
          <CardDescription>已录入生日的在世成员年龄段</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.ageStats} margin={{ top: 14, right: 20, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className={chartGridClass} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} className={axisClass} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} className={axisClass} />
              <Tooltip formatter={(value) => [value, "人数"]} />
              <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} name="人数" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="xl:col-span-6 shadow-sm">
        <CardHeader>
          <CardTitle>居住地 Top 8</CardTitle>
          <CardDescription>家族成员当前居住地分布</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {data.residenceStats.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">暂无居住地数据</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.residenceStats} layout="vertical" margin={{ top: 10, right: 20, left: 24, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className={chartGridClass} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} className={axisClass} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={88} className={axisClass} />
                <Tooltip formatter={(value) => [value, "人数"]} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 6, 6, 0]} name="人数" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
