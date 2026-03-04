// 存储桶名称
export const AVATAR_BUCKET = 'avatars';
export const PHOTOS_BUCKET = 'photos';
export const HOLIDAY_MEDIA_BUCKET = 'holiday-media';

/**
 * 上传文件到 Supabase 存储（服务器端）
 * @param file 要上传的文件
 * @param folder 存储文件夹路径
 * @returns 上传后的文件 URL
 */
export async function uploadFile(file: File, folder: string = 'family-members'): Promise<string | null> {
  try {
    // 注意：这里不使用 createClient，因为它依赖 next/headers
    // 而是使用客户端方式创建 supabase 实例
    const { createClient } = await import('./client');
    const supabase = createClient();
    
    // 生成唯一文件名
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
    const filePath = `${folder}/${fileName}`;
    
    // 上传文件
    const { error, data } = await supabase
      .storage
      .from(AVATAR_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('文件上传失败:', error);
      return null;
    }
    
    // 获取文件 URL
    const { data: urlData } = supabase
      .storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('文件上传异常:', error);
    return null;
  }
}

/**
 * 上传照片到 Supabase 存储（服务器端）
 * @param file 要上传的照片文件
 * @param familyMemberId 家族成员 ID
 * @returns 上传后的照片信息
 */
export async function uploadPhoto(file: File, familyMemberId: number): Promise<{ url: string; storagePath: string } | null> {
  try {
    // 注意：这里不使用 createClient，因为它依赖 next/headers
    // 而是使用客户端方式创建 supabase 实例
    const { createClient } = await import('./client');
    const supabase = createClient();
    
    // 生成唯一文件名和路径
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
    const filePath = `family-members/${familyMemberId}/${fileName}`;
    
    // 上传文件
    const { error, data } = await supabase
      .storage
      .from(PHOTOS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('照片上传失败:', error);
      return null;
    }
    
    // 获取文件 URL
    const { data: urlData } = supabase
      .storage
      .from(PHOTOS_BUCKET)
      .getPublicUrl(filePath);
    
    return {
      url: urlData.publicUrl,
      storagePath: filePath
    };
  } catch (error) {
    console.error('照片上传异常:', error);
    return null;
  }
}

/**
 * 上传节日动态媒体到 Supabase 存储（服务器端）
 * @param file 要上传的媒体文件
 * @param momentId 节日动态 ID
 * @param mediaType 媒体类型
 * @returns 上传后的媒体信息
 */
export async function uploadHolidayMedia(
  file: File,
  momentId: number,
  mediaType: "image" | "video"
): Promise<{ url: string; storagePath: string } | null> {
  try {
    const { createClient } = await import('./client');
    const supabase = createClient();
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
    const filePath = `holiday-moments/${momentId}/${mediaType}/${fileName}`;
    
    const { error } = await supabase
      .storage
      .from(HOLIDAY_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('节日媒体上传失败:', error);
      return null;
    }
    
    const { data: urlData } = supabase
      .storage
      .from(HOLIDAY_MEDIA_BUCKET)
      .getPublicUrl(filePath);
    
    return {
      url: urlData.publicUrl,
      storagePath: filePath
    };
  } catch (error) {
    console.error('节日媒体上传异常:', error);
    return null;
  }
}

/**
 * 删除 Supabase 存储中的文件（服务器端）
 * @param fileUrl 文件 URL
 * @param bucket 存储桶名称
 * @returns 是否删除成功
 */
export async function deleteFile(fileUrl: string, bucket: string = AVATAR_BUCKET): Promise<boolean> {
  try {
    // 注意：这里不使用 createClient，因为它依赖 next/headers
    // 而是使用客户端方式创建 supabase 实例
    const { createClient } = await import('./client');
    const supabase = createClient();
    
    // 从 URL 中提取文件路径
    const url = new URL(fileUrl);
    const pathname = url.pathname;
    // 移除存储桶名称部分，得到实际文件路径
    const filePath = pathname.replace(`/storage/v1/object/public/${bucket}/`, '');
    
    // 删除文件
    const { error } = await supabase
      .storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      console.error('文件删除失败:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('文件删除异常:', error);
    return false;
  }
}
