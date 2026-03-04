"use server";

import { createClient } from "@/lib/supabase/server";

const HALL_PHOTO_BUCKET = "avatars";

export interface HallDonation {
  id: number;
  hallId: number;
  donorName: string;
  amount: number;
  remarks: string;
  donatedAt: string | null;
  createdAt: string;
}

export interface HallPhoto {
  id: number;
  hallId: number;
  photoUrl: string;
  storagePath: string | null;
  createdAt: string;
}

export interface AncestralHall {
  id: number;
  name: string;
  historyIntro: string;
  createdAt: string;
  updatedAt: string;
  photos: HallPhoto[];
  donations: HallDonation[];
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function getAncestralHallsWithDonations(): Promise<{
  success: boolean;
  data?: AncestralHall[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后查看祠堂数据" };
  }

  const { data: hallsData, error: hallsError } = await supabase
    .from("ancestral_halls")
    .select("id, name, history_intro, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (hallsError) {
    console.error("获取祠堂失败:", hallsError);
    return { success: false, error: "加载祠堂失败" };
  }

  const hallIds = (hallsData || []).map((item) => item.id);
  let donationsData: {
    id: number;
    hall_id: number;
    donor_name: string;
    amount: number;
    remarks: string | null;
    donated_at: string | null;
    created_at: string;
  }[] = [];
  let photosData: {
    id: number;
    hall_id: number;
    photo_url: string;
    storage_path: string | null;
    created_at: string;
  }[] = [];

  if (hallIds.length > 0) {
    const { data, error } = await supabase
      .from("ancestral_hall_donations")
      .select("id, hall_id, donor_name, amount, remarks, donated_at, created_at")
      .eq("user_id", user.id)
      .in("hall_id", hallIds)
      .order("donated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取祠堂捐赠失败:", error);
      return { success: false, error: "加载捐赠记录失败" };
    }
    donationsData = data || [];

    const { data: pData, error: pError } = await supabase
      .from("ancestral_hall_photos")
      .select("id, hall_id, photo_url, storage_path, created_at")
      .eq("user_id", user.id)
      .in("hall_id", hallIds)
      .order("created_at", { ascending: false });
    if (pError) {
      console.error("获取祠堂照片失败:", pError);
      return { success: false, error: "加载祠堂照片失败" };
    }
    photosData = pData || [];
  }

  const donationsMap = new Map<number, HallDonation[]>();
  for (const row of donationsData) {
    const list = donationsMap.get(row.hall_id) || [];
    list.push({
      id: row.id,
      hallId: row.hall_id,
      donorName: row.donor_name,
      amount: Number(row.amount || 0),
      remarks: row.remarks || "",
      donatedAt: row.donated_at,
      createdAt: row.created_at,
    });
    donationsMap.set(row.hall_id, list);
  }

  const result: AncestralHall[] = (hallsData || []).map((item) => ({
    id: item.id,
    name: item.name,
    historyIntro: item.history_intro || "",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    photos: photosData
      .filter((photo) => photo.hall_id === item.id)
      .map((photo) => ({
        id: photo.id,
        hallId: photo.hall_id,
        photoUrl: photo.photo_url,
        storagePath: photo.storage_path,
        createdAt: photo.created_at,
      })),
    donations: donationsMap.get(item.id) || [],
  }));

  return { success: true, data: result };
}

export async function createAncestralHall(input: {
  name: string;
  historyIntro?: string;
}): Promise<{ success: boolean; hallId?: number; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后操作" };
  }

  const name = (input.name || "").trim().slice(0, 120);
  if (!name) {
    return { success: false, error: "祠堂名称不能为空" };
  }

  const historyIntro = (input.historyIntro || "").trim().slice(0, 5000);
  const { data, error } = await supabase
    .from("ancestral_halls")
    .insert({
      user_id: user.id,
      name,
      history_intro: historyIntro || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("创建祠堂失败:", error);
    return { success: false, error: "创建祠堂失败" };
  }

  return { success: true, hallId: data.id };
}

export async function updateAncestralHall(input: {
  hallId: number;
  name: string;
  historyIntro?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后操作" };
  }

  const name = (input.name || "").trim().slice(0, 120);
  if (!name) {
    return { success: false, error: "祠堂名称不能为空" };
  }
  const historyIntro = (input.historyIntro || "").trim().slice(0, 5000);

  const { data: hall, error: hallError } = await supabase
    .from("ancestral_halls")
    .select("id")
    .eq("id", input.hallId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (hallError || !hall) {
    return { success: false, error: "祠堂不存在或无权限" };
  }

  const { error } = await supabase
    .from("ancestral_halls")
    .update({
      name,
      history_intro: historyIntro || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.hallId)
    .eq("user_id", user.id);

  if (error) {
    console.error("更新祠堂失败:", error);
    return { success: false, error: "更新祠堂失败" };
  }

  return { success: true };
}

export async function deleteAncestralHall(hallId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后操作" };
  }

  const { data: hall, error: getError } = await supabase
    .from("ancestral_halls")
    .select("id")
    .eq("id", hallId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (getError || !hall) {
    return { success: false, error: "祠堂不存在或无权限" };
  }

  const { error: deleteDonationError } = await supabase
    .from("ancestral_hall_donations")
    .delete()
    .eq("hall_id", hallId)
    .eq("user_id", user.id);

  if (deleteDonationError) {
    console.error("删除祠堂捐赠记录失败:", deleteDonationError);
    return { success: false, error: "删除祠堂失败" };
  }

  const { data: photos, error: photosError } = await supabase
    .from("ancestral_hall_photos")
    .select("id, storage_path")
    .eq("hall_id", hallId)
    .eq("user_id", user.id);

  if (photosError) {
    console.error("读取祠堂照片失败:", photosError);
    return { success: false, error: "删除祠堂失败" };
  }

  const { error: deletePhotosError } = await supabase
    .from("ancestral_hall_photos")
    .delete()
    .eq("hall_id", hallId)
    .eq("user_id", user.id);

  if (deletePhotosError) {
    console.error("删除祠堂照片记录失败:", deletePhotosError);
    return { success: false, error: "删除祠堂失败" };
  }

  const { error: deleteHallError } = await supabase
    .from("ancestral_halls")
    .delete()
    .eq("id", hallId)
    .eq("user_id", user.id);

  if (deleteHallError) {
    console.error("删除祠堂失败:", deleteHallError);
    return { success: false, error: "删除祠堂失败" };
  }

  const photoPaths = (photos || [])
    .map((item) => item.storage_path)
    .filter((item): item is string => !!item);
  if (photoPaths.length > 0) {
    await supabase.storage.from(HALL_PHOTO_BUCKET).remove(photoPaths);
  }

  return { success: true };
}

export async function uploadHallPhotos(input: {
  hallId: number;
  files: File[];
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后操作" };
  }

  const files = input.files || [];
  if (!files.length) {
    return { success: false, error: "请先选择图片" };
  }

  const { data: hall, error: hallError } = await supabase
    .from("ancestral_halls")
    .select("id")
    .eq("id", input.hallId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (hallError || !hall) {
    return { success: false, error: "祠堂不存在或无权限" };
  }

  const uploadedPaths: string[] = [];
  const photoRows: { user_id: string; hall_id: number; photo_url: string; storage_path: string }[] = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.name || "hall.jpg");
    const filePath = `ancestral-halls/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(HALL_PHOTO_BUCKET)
      .upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) {
      console.error("上传祠堂照片失败:", uploadError);
      if (uploadedPaths.length) {
        await supabase.storage.from(HALL_PHOTO_BUCKET).remove(uploadedPaths);
      }
      return { success: false, error: "上传祠堂照片失败" };
    }
    uploadedPaths.push(filePath);
    const { data: publicUrlData } = supabase.storage.from(HALL_PHOTO_BUCKET).getPublicUrl(filePath);
    photoRows.push({
      user_id: user.id,
      hall_id: input.hallId,
      photo_url: publicUrlData.publicUrl,
      storage_path: filePath,
    });
  }

  const { error } = await supabase.from("ancestral_hall_photos").insert(photoRows);
  if (error) {
    console.error("保存祠堂照片记录失败:", error);
    if (uploadedPaths.length) {
      await supabase.storage.from(HALL_PHOTO_BUCKET).remove(uploadedPaths);
    }
    return { success: false, error: "保存祠堂照片失败" };
  }

  return { success: true };
}

export async function deleteHallPhoto(photoId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后操作" };
  }

  const { data: photo, error: getError } = await supabase
    .from("ancestral_hall_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (getError || !photo) {
    return { success: false, error: "照片不存在或无权限" };
  }

  const { error } = await supabase
    .from("ancestral_hall_photos")
    .delete()
    .eq("id", photoId)
    .eq("user_id", user.id);
  if (error) {
    console.error("删除祠堂照片失败:", error);
    return { success: false, error: "删除祠堂照片失败" };
  }

  if (photo.storage_path) {
    await supabase.storage.from(HALL_PHOTO_BUCKET).remove([photo.storage_path]);
  }
  return { success: true };
}

export async function createHallDonation(input: {
  hallId: number;
  donorName: string;
  amount: number;
  remarks?: string;
  donatedAt?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后操作" };
  }

  const donorName = (input.donorName || "").trim().slice(0, 120);
  if (!donorName) {
    return { success: false, error: "捐赠姓名不能为空" };
  }

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { success: false, error: "捐赠金额不合法" };
  }

  const { data: hall, error: hallError } = await supabase
    .from("ancestral_halls")
    .select("id")
    .eq("id", input.hallId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (hallError || !hall) {
    return { success: false, error: "祠堂不存在或无权限" };
  }

  const { error } = await supabase.from("ancestral_hall_donations").insert({
    user_id: user.id,
    hall_id: input.hallId,
    donor_name: donorName,
    amount: amount.toFixed(2),
    remarks: (input.remarks || "").trim().slice(0, 2000) || null,
    donated_at: input.donatedAt || null,
  });

  if (error) {
    console.error("新增祠堂捐赠失败:", error);
    return { success: false, error: "新增捐赠失败" };
  }

  return { success: true };
}

export async function deleteHallDonation(donationId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后操作" };
  }

  const { error } = await supabase
    .from("ancestral_hall_donations")
    .delete()
    .eq("id", donationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("删除捐赠失败:", error);
    return { success: false, error: "删除捐赠失败" };
  }

  return { success: true };
}
