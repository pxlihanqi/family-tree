"use server";

import { createClient } from "@/lib/supabase/server";
import { deleteFile, HOLIDAY_MEDIA_BUCKET, uploadHolidayMedia } from "@/lib/supabase/storage";

export interface HolidayMoment {
  id: number;
  title: string | null;
  description: string | null;
  holiday: string;
  family_member_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface HolidayMedia {
  id: number;
  moment_id: number;
  media_type: "image" | "video";
  url: string;
  storage_path: string;
  size: number | null;
  mime_type: string | null;
  created_at: string;
}

export async function getAliveMembersForHolidayPublisher(): Promise<
  { id: number; name: string }[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("family_members")
    .select("id, name")
    .eq("is_alive", true)
    .order("generation", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("获取在世成员失败:", error);
    return [];
  }

  return data || [];
}

export async function getHolidayMoments(): Promise<HolidayMoment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("holiday_moments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("获取节日动态失败:", error);
    return [];
  }

  return data || [];
}

export async function getHolidayMediaByMomentIds(momentIds: number[]): Promise<HolidayMedia[]> {
  if (momentIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("holiday_media")
    .select("*")
    .in("moment_id", momentIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("获取节日媒体失败:", error);
    return [];
  }

  return data || [];
}

export async function createHolidayMoment(options: {
  title: string | null;
  description: string | null;
  holiday: string;
  family_member_id: number | null;
  files: File[];
}): Promise<boolean> {
  const { title, description, holiday, family_member_id, files } = options;

  if (!holiday.trim() || files.length === 0) {
    return false;
  }

  const supabase = await createClient();

  const { data: moment, error: momentError } = await supabase
    .from("holiday_moments")
    .insert({
      title: title?.trim() || null,
      description: description?.trim() || null,
      holiday: holiday.trim(),
      family_member_id,
    })
    .select("*")
    .single();

  if (momentError || !moment) {
    console.error("创建节日动态失败:", momentError);
    return false;
  }

  const uploaded: { url: string; storagePath: string; mediaType: "image" | "video"; file: File }[] = [];

  for (const file of files) {
    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const uploadResult = await uploadHolidayMedia(file, moment.id, mediaType);

    if (!uploadResult) {
      for (const item of uploaded) {
        await deleteFile(item.url, HOLIDAY_MEDIA_BUCKET);
      }
      await supabase.from("holiday_moments").delete().eq("id", moment.id);
      return false;
    }

    uploaded.push({
      url: uploadResult.url,
      storagePath: uploadResult.storagePath,
      mediaType,
      file,
    });
  }

  const { error: mediaError } = await supabase
    .from("holiday_media")
    .insert(
      uploaded.map((item) => ({
        moment_id: moment.id,
        media_type: item.mediaType,
        url: item.url,
        storage_path: item.storagePath,
        size: item.file.size,
        mime_type: item.file.type,
      }))
    );

  if (mediaError) {
    console.error("保存节日媒体失败:", mediaError);
    for (const item of uploaded) {
      await deleteFile(item.url, HOLIDAY_MEDIA_BUCKET);
    }
    await supabase.from("holiday_moments").delete().eq("id", moment.id);
    return false;
  }

  return true;
}

export async function deleteHolidayMoment(momentId: number): Promise<boolean> {
  const supabase = await createClient();

  const { data: media, error: mediaError } = await supabase
    .from("holiday_media")
    .select("url")
    .eq("moment_id", momentId);

  if (mediaError) {
    console.error("获取节日媒体失败:", mediaError);
    return false;
  }

  const { error: deleteError } = await supabase
    .from("holiday_moments")
    .delete()
    .eq("id", momentId);

  if (deleteError) {
    console.error("删除节日动态失败:", deleteError);
    return false;
  }

  if (media) {
    for (const item of media) {
      await deleteFile(item.url, HOLIDAY_MEDIA_BUCKET);
    }
  }

  return true;
}

export async function addHolidayMedia(momentId: number, files: File[]): Promise<boolean> {
  if (!momentId || files.length === 0) {
    return false;
  }

  const supabase = await createClient();
  const uploaded: { url: string; storagePath: string; mediaType: "image" | "video"; file: File }[] = [];

  for (const file of files) {
    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    const uploadResult = await uploadHolidayMedia(file, momentId, mediaType);

    if (!uploadResult) {
      for (const item of uploaded) {
        await deleteFile(item.url, HOLIDAY_MEDIA_BUCKET);
      }
      return false;
    }

    uploaded.push({
      url: uploadResult.url,
      storagePath: uploadResult.storagePath,
      mediaType,
      file,
    });
  }

  const { error } = await supabase
    .from("holiday_media")
    .insert(
      uploaded.map((item) => ({
        moment_id: momentId,
        media_type: item.mediaType,
        url: item.url,
        storage_path: item.storagePath,
        size: item.file.size,
        mime_type: item.file.type,
      }))
    );

  if (error) {
    console.error("追加节日媒体失败:", error);
    for (const item of uploaded) {
      await deleteFile(item.url, HOLIDAY_MEDIA_BUCKET);
    }
    return false;
  }

  return true;
}

export async function deleteHolidayMedia(mediaId: number): Promise<boolean> {
  const supabase = await createClient();

  const { data: media, error: getError } = await supabase
    .from("holiday_media")
    .select("url")
    .eq("id", mediaId)
    .single();

  if (getError || !media) {
    console.error("获取节日媒体失败:", getError);
    return false;
  }

  const { error: deleteError } = await supabase
    .from("holiday_media")
    .delete()
    .eq("id", mediaId);

  if (deleteError) {
    console.error("删除节日媒体记录失败:", deleteError);
    return false;
  }

  await deleteFile(media.url, HOLIDAY_MEDIA_BUCKET);
  return true;
}
