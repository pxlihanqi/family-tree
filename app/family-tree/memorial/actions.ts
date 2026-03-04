"use server";

import { createClient } from "@/lib/supabase/server";

export interface MemorialMember {
  id: number;
  name: string;
  generation: number | null;
  sibling_order: number | null;
  gender: "男" | "女" | null;
  birthday: string | null;
  death_date: string | null;
  burial_place: string | null;
  residence_place: string | null;
  official_position: string | null;
  spouse: string | null;
  remarks: string | null;
  avatar: string | null;
}

export async function fetchMemorialMembers(): Promise<{
  data: MemorialMember[];
  error: string | null;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("family_members")
    .select("id, name, generation, sibling_order, gender, birthday, death_date, burial_place, residence_place, official_position, spouse, remarks, avatar")
    .eq("is_alive", false)
    .order("generation", { ascending: false })
    .order("sibling_order", { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
}
