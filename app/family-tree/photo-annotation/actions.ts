"use server";

import { createClient } from "@/lib/supabase/server";

const PHOTO_ANNOTATIONS_BUCKET = "photo-annotations";

export interface AnnotationMarker {
  id: number;
  x: number;
  y: number;
  title: string;
  description: string;
}

export interface PhotoAnnotationImage {
  id: number;
  imageUrl: string;
  imageName: string;
  imageDescription: string;
  storagePath: string | null;
  markers: AnnotationMarker[];
  createdAt: string;
  updatedAt: string;
}

function sanitizeMarkers(markers: AnnotationMarker[]): AnnotationMarker[] {
  return markers
    .filter((item) => Number.isFinite(item.id) && Number.isFinite(item.x) && Number.isFinite(item.y))
    .map((item) => ({
      id: Number(item.id),
      x: Math.max(0, Math.min(100, Number(item.x))),
      y: Math.max(0, Math.min(100, Number(item.y))),
      title: (item.title || "").trim().slice(0, 120),
      description: (item.description || "").trim().slice(0, 2000),
    }));
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function mapRowToImage(row: {
  id: number;
  image_url: string;
  image_name: string | null;
  image_description: string | null;
  storage_path: string | null;
  markers: unknown;
  created_at: string;
  updated_at: string;
}): PhotoAnnotationImage {
  return {
    id: row.id,
    imageUrl: row.image_url,
    imageName: row.image_name || "未命名图片",
    imageDescription: row.image_description || "",
    storagePath: row.storage_path,
    markers: Array.isArray(row.markers) ? sanitizeMarkers(row.markers as AnnotationMarker[]) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPhotoAnnotationImages(): Promise<{
  success: boolean;
  data?: PhotoAnnotationImage[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后使用图片标注" };
  }

  const { data, error } = await supabase
    .from("photo_annotation_images")
    .select("id, image_url, image_name, image_description, storage_path, markers, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("获取图片标注失败:", error);
    return { success: false, error: "加载标注失败" };
  }

  return {
    success: true,
    data: (data || []).map(mapRowToImage),
  };
}

export async function uploadPhotoAnnotationImage(options: {
  file: File;
}): Promise<{ success: boolean; data?: PhotoAnnotationImage; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后上传图片" };
  }

  const { file } = options;
  const safeName = sanitizeFileName(file.name || "photo.jpg");
  const filePath = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_ANNOTATIONS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("上传标注图片失败:", uploadError);
    return { success: false, error: "上传图片失败" };
  }

  const { data: publicUrlData } = supabase.storage
    .from(PHOTO_ANNOTATIONS_BUCKET)
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from("photo_annotation_images")
    .insert({
      user_id: user.id,
      image_url: publicUrlData.publicUrl,
      image_name: file.name,
      image_description: null,
      storage_path: filePath,
      markers: [],
    })
    .select("id, image_url, image_name, image_description, storage_path, markers, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("保存图片标注记录失败:", error);
    await supabase.storage.from(PHOTO_ANNOTATIONS_BUCKET).remove([filePath]);
    return { success: false, error: "保存图片信息失败" };
  }

  return {
    success: true,
    data: mapRowToImage(data),
  };
}

export async function updatePhotoAnnotationImageData(options: {
  imageId: number;
  imageName: string;
  imageDescription: string;
  markers: AnnotationMarker[];
}): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后保存标注" };
  }

  const markers = sanitizeMarkers(options.markers || []);
  const imageName = (options.imageName || "").trim().slice(0, 120) || "未命名图片";
  const imageDescription = (options.imageDescription || "").trim().slice(0, 2000);

  const { data, error } = await supabase
    .from("photo_annotation_images")
    .update({
      image_name: imageName,
      image_description: imageDescription || null,
      markers,
      updated_at: new Date().toISOString(),
    })
    .eq("id", options.imageId)
    .eq("user_id", user.id)
    .select("updated_at")
    .single();

  if (error || !data) {
    console.error("保存图片标注失败:", error);
    return { success: false, error: "保存失败" };
  }

  return { success: true, updatedAt: data.updated_at };
}

export async function deletePhotoAnnotationImage(imageId: number): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: "请先登录后操作" };
  }

  const { data: existing, error: getError } = await supabase
    .from("photo_annotation_images")
    .select("storage_path")
    .eq("id", imageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (getError) {
    console.error("获取图片标注失败:", getError);
    return { success: false, error: "删除失败" };
  }

  const { error } = await supabase
    .from("photo_annotation_images")
    .delete()
    .eq("id", imageId)
    .eq("user_id", user.id);

  if (error) {
    console.error("删除图片标注失败:", error);
    return { success: false, error: "删除失败" };
  }

  if (existing?.storage_path) {
    await supabase.storage.from(PHOTO_ANNOTATIONS_BUCKET).remove([existing.storage_path]);
  }

  return { success: true };
}
