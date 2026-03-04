import { PhotoAnnotationClient } from "./photo-annotation-client";

export default function PhotoAnnotationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold">图片标注</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        可上传多张图片，支持图片名称与描述编辑、标记搜索、滚轮缩放、拖动画布与拖动标记点，所有内容自动云端同步。
      </p>
      <div className="mt-6">
        <PhotoAnnotationClient />
      </div>
    </div>
  );
}
