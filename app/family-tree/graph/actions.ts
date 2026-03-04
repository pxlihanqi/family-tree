"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface FamilyMemberNode {
  id: number;
  name: string;
  generation: number | null;
  sibling_order: number | null;
  father_id: number | null;
  gender: "男" | "女" | null;
  official_position: string | null;
  is_alive: boolean;
  spouse: string | null;
  spouse_id: number | null;
  remarks: string | null;
  birthday: string | null;
  death_date: string | null;
  burial_place: string | null;
  residence_place: string | null;
  contact: string | null;
  avatar: string | null;
}

export interface FetchGraphResult {
  data: FamilyMemberNode[];
  error: string | null;
}

export async function fetchAllFamilyMembers(): Promise<FetchGraphResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("family_members")
    .select("id, name, generation, sibling_order, father_id, gender, official_position, is_alive, spouse, spouse_id, remarks, birthday, death_date, burial_place, residence_place, contact, avatar")
    .order("generation", { ascending: true })
    .order("sibling_order", { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}

export interface CreateGraphChildInput {
  fatherId: number;
  name: string;
  gender?: "男" | "女" | null;
  isAlive?: boolean;
  siblingOrder?: number | null;
}

export interface CreateGraphSpouseInput {
  memberId: number;
  name: string;
  gender?: "男" | "女" | null;
  isAlive?: boolean;
}

export async function createGraphChildMember(
  input: CreateGraphChildInput
): Promise<{ success: boolean; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "姓名不能为空" };
  }

  const supabase = await createClient();

  const { data: father, error: fatherError } = await supabase
    .from("family_members")
    .select("id, generation")
    .eq("id", input.fatherId)
    .single();

  if (fatherError || !father) {
    return { success: false, error: "父节点不存在" };
  }

  const { data: siblings, error: siblingsError } = await supabase
    .from("family_members")
    .select("sibling_order")
    .eq("father_id", input.fatherId)
    .order("sibling_order", { ascending: false })
    .limit(1);

  if (siblingsError) {
    return { success: false, error: siblingsError.message };
  }

  const maxSiblingOrder = siblings?.[0]?.sibling_order ?? 0;
  const siblingOrder = input.siblingOrder ?? maxSiblingOrder + 1;
  const generation =
    father.generation === null ? null : Number(father.generation) + 1;

  const { error } = await supabase.from("family_members").insert({
    name,
    father_id: input.fatherId,
    generation,
    sibling_order: siblingOrder,
    gender: input.gender ?? null,
    is_alive: input.isAlive ?? true,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/family-tree/graph");
  revalidatePath("/family-tree", "layout");
  return { success: true, error: null };
}

export async function createGraphSpouseMember(
  input: CreateGraphSpouseInput
): Promise<{ success: boolean; error: string | null }> {
  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "姓名不能为空" };
  }

  const supabase = await createClient();

  const { data: member, error: memberError } = await supabase
    .from("family_members")
    .select("id, name, generation, spouse_id, gender")
    .eq("id", input.memberId)
    .single();

  if (memberError || !member) {
    return { success: false, error: "成员不存在" };
  }

  if (member.spouse_id) {
    return { success: false, error: "该成员已存在配偶关联" };
  }

  const preferredGender =
    input.gender ??
    (member.gender === "男" ? "女" : member.gender === "女" ? "男" : null);

  const { data: spouse, error: spouseError } = await supabase
    .from("family_members")
    .insert({
      name,
      generation: null,
      gender: preferredGender,
      is_alive: input.isAlive ?? true,
      spouse: member.name,
      spouse_id: member.id,
    })
    .select("id")
    .single();

  if (spouseError || !spouse) {
    return { success: false, error: spouseError?.message || "创建配偶失败" };
  }

  const { error: updateError } = await supabase
    .from("family_members")
    .update({
      spouse: name,
      spouse_id: spouse.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  revalidatePath("/family-tree/graph");
  revalidatePath("/family-tree", "layout");
  return { success: true, error: null };
}

export async function deleteGraphMember(
  id: number
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("family_members")
    .select("id", { count: "exact", head: true })
    .eq("father_id", id);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if ((count || 0) > 0) {
    return { success: false, error: "该成员存在子级，请先处理子级后再删除" };
  }

  const { error } = await supabase.from("family_members").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/family-tree/graph");
  revalidatePath("/family-tree", "layout");
  return { success: true, error: null };
}

export async function reorderGraphSiblings(input: {
  fatherId: number | null;
  orderedIds: number[];
}): Promise<{ success: boolean; error: string | null }> {
  if (!input.orderedIds.length) {
    return { success: false, error: "没有可排序的成员" };
  }

  const supabase = await createClient();

  const { data: siblings, error: siblingsError } = await supabase
    .from("family_members")
    .select("id, father_id")
    .in("id", input.orderedIds);

  if (siblingsError || !siblings) {
    return { success: false, error: siblingsError?.message || "读取成员失败" };
  }

  const allSameFather = siblings.every((item) => item.father_id === input.fatherId);
  if (!allSameFather || siblings.length !== input.orderedIds.length) {
    return { success: false, error: "排序成员校验失败" };
  }

  for (let index = 0; index < input.orderedIds.length; index += 1) {
    const id = input.orderedIds[index];
    const { error } = await supabase
      .from("family_members")
      .update({
        sibling_order: index + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/family-tree/graph");
  revalidatePath("/family-tree", "layout");
  return { success: true, error: null };
}
