import { getOrCreateAlbum, getPhotosByAlbumId } from "./actions";
import { AlbumPhotos } from "./album-photos";

interface AlbumsLoaderProps {
  memberId: number | null;
}

export async function AlbumsLoader({ memberId }: AlbumsLoaderProps) {
  if (!memberId) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-stone-500 dark:text-stone-400">
          请选择一个家族成员查看相册
        </p>
      </div>
    );
  }
  
  // 获取或创建相册
  const album = await getOrCreateAlbum(memberId);
  
  if (!album) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-stone-500 dark:text-stone-400">
          创建相册失败，请稍后再试
        </p>
      </div>
    );
  }
  
  // 获取相册中的照片
  const photos = await getPhotosByAlbumId(album.id);
  
  return <AlbumPhotos album={album} photos={photos} familyMemberId={memberId} />;
}
