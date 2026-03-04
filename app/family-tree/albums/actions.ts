"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadPhoto, deleteFile, PHOTOS_BUCKET } from "@/lib/supabase/storage";

// 相册接口
export interface Album {
  id: number;
  family_member_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// 照片接口
export interface Photo {
  id: number;
  album_id: number;
  family_member_id: number;
  name: string;
  description: string | null;
  url: string;
  storage_path: string;
  size: number | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

// 创建或获取相册
export async function getOrCreateAlbum(familyMemberId: number): Promise<Album | null> {
  const supabase = await createClient();
  
  // 先尝试获取相册
  const { data: existingAlbum } = await supabase
    .from("albums")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .single();
  
  if (existingAlbum) {
    return existingAlbum;
  }
  
  // 如果相册不存在，创建新相册
  const { data: newAlbum, error } = await supabase
    .from("albums")
    .insert({
      family_member_id: familyMemberId,
      name: `家族相册`,
      description: `家族成员的照片集合`
    })
    .select("*")
    .single();
  
  if (error) {
    console.error("创建相册失败:", error);
    return null;
  }
  
  return newAlbum;
}

// 获取相册详情
export async function getAlbumById(albumId: number): Promise<Album | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("id", albumId)
    .single();
  
  if (error) {
    console.error("获取相册失败:", error);
    return null;
  }
  
  return data;
}

// 获取家族成员的相册
export async function getAlbumByFamilyMemberId(familyMemberId: number): Promise<Album | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("albums")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .single();
  
  if (error) {
    console.error("获取相册失败:", error);
    return null;
  }
  
  return data;
}

// 更新相册信息
export async function updateAlbum(albumId: number, updates: Partial<Album>): Promise<Album | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("albums")
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq("id", albumId)
    .select("*")
    .single();
  
  if (error) {
    console.error("更新相册失败:", error);
    return null;
  }
  
  return data;
}

// 获取相册中的照片列表
export async function getPhotosByAlbumId(albumId: number): Promise<Photo[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("album_id", albumId)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("获取照片失败:", error);
    return [];
  }
  
  return data || [];
}

// 获取家族成员的照片列表
export async function getPhotosByFamilyMemberId(familyMemberId: number): Promise<Photo[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("photos")
    .select("*")
    .eq("family_member_id", familyMemberId)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("获取照片失败:", error);
    return [];
  }
  
  return data || [];
}

// 上传照片
export async function uploadPhotoToAlbum(
  familyMemberId: number,
  file: File,
  name: string,
  description: string | null = null
): Promise<Photo | null> {
  try {
    // 获取或创建相册
    const album = await getOrCreateAlbum(familyMemberId);
    if (!album) {
      return null;
    }
    
    // 上传文件到存储
    const uploadResult = await uploadPhoto(file, familyMemberId);
    if (!uploadResult) {
      return null;
    }
    
    const supabase = await createClient();
    
    // 保存照片信息到数据库
    const { data: newPhoto, error } = await supabase
      .from("photos")
      .insert({
        album_id: album.id,
        family_member_id: familyMemberId,
        name: name,
        description: description,
        url: uploadResult.url,
        storage_path: uploadResult.storagePath,
        size: file.size,
        mime_type: file.type
      })
      .select("*")
      .single();
    
    if (error) {
      console.error("保存照片信息失败:", error);
      // 如果保存失败，删除已上传的文件
      await deleteFile(uploadResult.url, PHOTOS_BUCKET);
      return null;
    }
    
    return newPhoto;
  } catch (error) {
    console.error("上传照片失败:", error);
    return null;
  }
}

// 删除照片
export async function deletePhoto(photoId: number): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // 先获取照片信息，以便删除存储中的文件
    const { data: photo, error: getError } = await supabase
      .from("photos")
      .select("url")
      .eq("id", photoId)
      .single();
    
    if (getError) {
      console.error("获取照片信息失败:", getError);
      return false;
    }
    
    // 删除数据库中的记录
    const { error: deleteError } = await supabase
      .from("photos")
      .delete()
      .eq("id", photoId);
    
    if (deleteError) {
      console.error("删除照片记录失败:", deleteError);
      return false;
    }
    
    // 删除存储中的文件
    await deleteFile(photo.url, PHOTOS_BUCKET);
    
    return true;
  } catch (error) {
    console.error("删除照片失败:", error);
    return false;
  }
}

// 批量删除照片
export async function deletePhotos(photoIds: number[]): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // 先获取所有照片信息，以便删除存储中的文件
    const { data: photos, error: getError } = await supabase
      .from("photos")
      .select("url")
      .in("id", photoIds);
    
    if (getError) {
      console.error("获取照片信息失败:", getError);
      return false;
    }
    
    // 删除数据库中的记录
    const { error: deleteError } = await supabase
      .from("photos")
      .delete()
      .in("id", photoIds);
    
    if (deleteError) {
      console.error("删除照片记录失败:", deleteError);
      return false;
    }
    
    // 删除存储中的文件
    if (photos) {
      for (const photo of photos) {
        await deleteFile(photo.url, PHOTOS_BUCKET);
      }
    }
    
    return true;
  } catch (error) {
    console.error("批量删除照片失败:", error);
    return false;
  }
}
