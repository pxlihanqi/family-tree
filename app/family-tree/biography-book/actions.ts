"use server";

import { createClient } from "@/lib/supabase/server";
import type { LifeEvent } from "../life-events/actions";

export interface BiographyMember {
    id: number;
    name: string;
    generation: number | null;
    sibling_order: number | null;
    gender: "男" | "女" | null;
    birthday: string | null;
    death_date: string | null;
    is_alive: boolean;
    spouse: string | null;
    official_position: string | null;
    residence_place: string | null;
    remarks: string;
    father_name: string | null;
    lifeEvents: LifeEvent[];
    avatar: string | null;
}

export interface RelationMember {
    id: number;
    name: string;
    father_id: number | null;
    birthday: string | null;
    death_date: string | null;
}

/**
 * 获取所有有生平事迹的成员，用于生平册展示
 */
export async function fetchMembersWithBiography(): Promise<{
    data: BiographyMember[];
    allMembers: RelationMember[];
    error: string | null;
}> {
    const supabase = await createClient();

    // 先获取有生平事迹的成员 ID
    const { data: lifeEventIds, error: lifeEventError } = await supabase
        .from("life_events")
        .select("family_member_id")
        .order("event_date", { ascending: true });

    if (lifeEventError) {
        return { data: [], allMembers: [], error: lifeEventError.message };
    }

    const memberIds = Array.from(new Set((lifeEventIds || [])
        .map((item) => item.family_member_id)
        .filter((id): id is number => id !== null)));

    if (memberIds.length === 0) {
        return { data: [], allMembers: [], error: null };
    }

    // 查询有生平事迹的成员
    const { data, error } = await supabase
        .from("family_members")
        .select("id, name, generation, sibling_order, father_id, gender, birthday, death_date, is_alive, spouse, official_position, residence_place, remarks, avatar")
        .in("id", memberIds)
        .order("generation", { ascending: true })
        .order("sibling_order", { ascending: true });

    if (error) {
        return { data: [], allMembers: [], error: error.message };
    }

    const validData = data || [];

    const { data: allMembers, error: allMembersError } = await supabase
        .from("family_members")
        .select("id, name, father_id, birthday, death_date")
        .order("generation", { ascending: true })
        .order("sibling_order", { ascending: true });

    if (allMembersError) {
        return { data: [], allMembers: [], error: allMembersError.message };
    }

    // 获取所有父亲 ID
    const fatherIds = validData
        .map((item) => item.father_id)
        .filter((id): id is number => id !== null);

    // 批量查询父亲姓名
    let fatherMap: Record<number, string> = {};
    if (fatherIds.length > 0) {
        const { data: fathers } = await supabase
            .from("family_members")
            .select("id, name")
            .in("id", fatherIds);

        if (fathers) {
            fatherMap = Object.fromEntries(fathers.map((f) => [f.id, f.name]));
        }
    }

    // 批量获取生平事迹，避免每个成员一次请求（N+1）
    const { data: lifeEventsData } = await supabase
        .from("life_events")
        .select("*")
        .in("family_member_id", memberIds)
        .order("event_date", { ascending: true })
        .order("created_at", { ascending: true });

    const lifeEventsMap = (lifeEventsData || []).reduce((acc, event) => {
        const list = acc.get(event.family_member_id) || [];
        list.push(event as LifeEvent);
        acc.set(event.family_member_id, list);
        return acc;
    }, new Map<number, LifeEvent[]>());

    // 转换数据格式
    const transformedData: BiographyMember[] = validData.map((item) => ({
        id: item.id,
        name: item.name,
        generation: item.generation,
        sibling_order: item.sibling_order,
        gender: item.gender,
        birthday: item.birthday,
        death_date: item.death_date,
        is_alive: item.is_alive,
        spouse: item.spouse,
        official_position: item.official_position,
        residence_place: item.residence_place,
        remarks: item.remarks,
        father_name: item.father_id ? fatherMap[item.father_id] || null : null,
        lifeEvents: lifeEventsMap.get(item.id) || [],
        avatar: item.avatar,
    }));

    return { data: transformedData, allMembers: allMembers || [], error: null };
}
