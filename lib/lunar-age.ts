function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const value = dateString.trim();
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toSolarAgeYears(birth: Date, end: Date): number | null {
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  const dayDiff = end.getDate() - birth.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

const lunarMonthMap: Record<string, number> = {
  正月: 1,
  一月: 1,
  二月: 2,
  三月: 3,
  四月: 4,
  五月: 5,
  六月: 6,
  七月: 7,
  八月: 8,
  九月: 9,
  十月: 10,
  冬月: 11,
  十一月: 11,
  腊月: 12,
  十二月: 12,
};

function getLunarParts(date: Date): { year: number; month: number; day: number } | null {
  try {
    const formatter = new Intl.DateTimeFormat("zh-Hans-CN-u-ca-chinese", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const partValue = (type: string) =>
      parts.find((part) => (part.type as string) === type)?.value ?? "";
    const relatedYear = Number.parseInt(
      partValue("relatedYear"),
      10
    );
    const monthToken = partValue("month").replace("闰", "");
    const day = Number.parseInt(partValue("day"), 10);
    const month = lunarMonthMap[monthToken];
    if (!Number.isFinite(relatedYear) || !month || !Number.isFinite(day)) {
      return null;
    }
    return { year: relatedYear, month, day };
  } catch {
    return null;
  }
}

export function getLunarAgeYears(
  birthday: string | null | undefined,
  endDate?: string | null
): number | null {
  const birth = parseDate(birthday);
  if (!birth) return null;
  const end = parseDate(endDate ?? null) ?? new Date();
  const birthLunar = getLunarParts(birth);
  const endLunar = getLunarParts(end);

  if (!birthLunar || !endLunar) {
    return toSolarAgeYears(birth, end);
  }

  let age = endLunar.year - birthLunar.year;
  if (
    endLunar.month < birthLunar.month ||
    (endLunar.month === birthLunar.month && endLunar.day < birthLunar.day)
  ) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function getLunarAgeText(
  birthday: string | null | undefined,
  deathDate: string | null | undefined
): string {
  const age = getLunarAgeYears(birthday, deathDate ?? null);
  if (age === null) return "未记录";
  return deathDate ? `${age}岁（享年）` : `${age}岁`;
}
