"use server";

import { createClient } from "@/lib/supabase/server";
import { getLunarAgeYears } from "@/lib/lunar-age";

export interface StatisticsData {
  totalMembers: number;
  genderStats: { name: string; value: number; fill: string }[];
  generationStats: { name: string; value: number }[];
  statusStats: { name: string; value: number; fill: string }[];
  ageStats: { name: string; value: number }[];
  commonNames: { name: string; count: number }[];
  profileCompleteness: { name: string; value: number; rate: number; fill: string }[];
  residenceStats: { name: string; value: number }[];
  generationGenderStats: { name: string; male: number; female: number; unknown: number }[];
  avgLivingAge: number | null;
  avgLifespan: number | null;
  oldestLiving: { name: string; age: number } | null;
}

function calculateAge(birthday: string, endDate?: string | null) {
  return getLunarAgeYears(birthday, endDate ?? null);
}

export async function fetchFamilyStatistics(): Promise<{
  data: StatisticsData | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("family_members")
    .select("id, name, gender, generation, is_alive, birthday, death_date, official_position, spouse, residence_place, avatar")
    .order("generation", { ascending: true });

  if (error || !members) {
    console.error("Error fetching statistics data:", error);
    return { data: null, error: error?.message || "Failed to fetch data" };
  }

  const totalMembers = members.length;

  const livingMembers = members.filter((member) => member.is_alive);

  const genderCounts = livingMembers.reduce(
    (acc, member) => {
      const gender = member.gender || "未知";
      acc[gender] = (acc[gender] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const genderStats = [
    { name: "男", value: genderCounts["男"] || 0, fill: "#3b82f6" },
    { name: "女", value: genderCounts["女"] || 0, fill: "#ec4899" },
  ];
  if (genderCounts["未知"]) {
    genderStats.push({ name: "未知", value: genderCounts["未知"], fill: "#94a3b8" });
  }

  const generationCounts = members.reduce(
    (acc, member) => {
      const key = member.generation ? `第${member.generation}世` : "未知";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const sortedGenerations = Object.keys(generationCounts).sort((a, b) => {
    if (a === "未知") return 1;
    if (b === "未知") return -1;
    const genA = Number.parseInt(a.replace(/\D/g, ""), 10);
    const genB = Number.parseInt(b.replace(/\D/g, ""), 10);
    return genA - genB;
  });

  const generationStats = sortedGenerations.map((name) => ({
    name,
    value: generationCounts[name],
  }));

  const statusCounts = members.reduce(
    (acc, member) => {
      const status = member.is_alive ? "在世" : "已故";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statusStats = [
    { name: "在世", value: statusCounts["在世"] || 0, fill: "#22c55e" },
    { name: "已故", value: statusCounts["已故"] || 0, fill: "#64748b" },
  ];

  const ageGroups: Record<string, number> = {
    "0-10岁": 0,
    "11-20岁": 0,
    "21-30岁": 0,
    "31-40岁": 0,
    "41-50岁": 0,
    "51-60岁": 0,
    "61-70岁": 0,
    "71-80岁": 0,
    "80岁以上": 0,
  };

  const livingAges: { name: string; age: number }[] = [];
  const lifespans: number[] = [];

  members.forEach((member) => {
    if (!member.birthday) return;

    const age = calculateAge(member.birthday);
    if (age === null) return;

    if (member.is_alive) {
      livingAges.push({ name: member.name, age });
      if (age <= 10) ageGroups["0-10岁"]++;
      else if (age <= 20) ageGroups["11-20岁"]++;
      else if (age <= 30) ageGroups["21-30岁"]++;
      else if (age <= 40) ageGroups["31-40岁"]++;
      else if (age <= 50) ageGroups["41-50岁"]++;
      else if (age <= 60) ageGroups["51-60岁"]++;
      else if (age <= 70) ageGroups["61-70岁"]++;
      else if (age <= 80) ageGroups["71-80岁"]++;
      else ageGroups["80岁以上"]++;
      return;
    }

    if (!member.death_date) return;
    const lifespan = calculateAge(member.birthday, member.death_date);
    if (lifespan !== null && lifespan > 0) lifespans.push(lifespan);
  });

  const ageStats = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

  const nameCounts: Record<string, number> = {};
  members.forEach((m) => {
    if (m.name.length >= 2) {
      const genChar = m.name[1];
      nameCounts[genChar] = (nameCounts[genChar] || 0) + 1;
    }
  });

  const commonNames = Object.entries(nameCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  const completionDefinitions = [
    { name: "生日", key: "birthday", fill: "#22c55e" },
    { name: "居住地", key: "residence_place", fill: "#0ea5e9" },
    { name: "头像", key: "avatar", fill: "#a855f7" },
    { name: "配偶", key: "spouse", fill: "#f97316" },
    { name: "官职", key: "official_position", fill: "#eab308" },
  ] as const;

  const profileCompleteness = completionDefinitions.map((item) => {
    const value = members.filter((m) => {
      const field = m[item.key];
      if (typeof field === "string") return field.trim().length > 0;
      return Boolean(field);
    }).length;

    return {
      name: item.name,
      value,
      rate: totalMembers > 0 ? Number(((value / totalMembers) * 100).toFixed(1)) : 0,
      fill: item.fill,
    };
  });

  const residenceCounts = members.reduce((acc, member) => {
    const place = member.residence_place?.trim();
    if (!place) return acc;
    acc[place] = (acc[place] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const residenceStats = Object.entries(residenceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  const generationGenderMap = new Map<string, { male: number; female: number; unknown: number; index: number }>();
  members.forEach((member) => {
    const name = member.generation ? `第${member.generation}世` : "未知";
    if (!generationGenderMap.has(name)) {
      generationGenderMap.set(name, { male: 0, female: 0, unknown: 0, index: member.generation ?? 999 });
    }

    const target = generationGenderMap.get(name);
    if (!target) return;

    if (member.gender === "男") target.male += 1;
    else if (member.gender === "女") target.female += 1;
    else target.unknown += 1;
  });

  const generationGenderStats = Array.from(generationGenderMap.entries())
    .sort((a, b) => a[1].index - b[1].index)
    .map(([name, value]) => ({
      name,
      male: value.male,
      female: value.female,
      unknown: value.unknown,
    }));

  const avgLivingAge =
    livingAges.length > 0
      ? Number((livingAges.reduce((sum, item) => sum + item.age, 0) / livingAges.length).toFixed(1))
      : null;

  const avgLifespan =
    lifespans.length > 0
      ? Number((lifespans.reduce((sum, item) => sum + item, 0) / lifespans.length).toFixed(1))
      : null;

  const oldestLiving =
    livingAges.length > 0
      ? livingAges.reduce((max, item) => (item.age > max.age ? item : max), livingAges[0])
      : null;

  return {
    data: {
      totalMembers,
      genderStats,
      generationStats,
      statusStats,
      ageStats,
      commonNames,
      profileCompleteness,
      residenceStats,
      generationGenderStats,
      avgLivingAge,
      avgLifespan,
      oldestLiving,
    },
    error: null,
  };
}
