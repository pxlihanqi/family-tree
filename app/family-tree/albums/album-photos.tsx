"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Image as ImageIcon, X, Loader2 } from "lucide-react";
import type { Album, Photo } from "./actions";
import { uploadPhotoToAlbum, deletePhotos } from "./actions";
import { cn } from "@/lib/utils";

interface AlbumPhotosProps {
  album: Album;
  photos: Photo[];
  familyMemberId: number;
}

export function AlbumPhotos({ album, photos, familyMemberId }: AlbumPhotosProps) {
  const [selectedPhotos, setSelectedPhotos] = React.useState<Set<number>>(new Set());
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [photoName, setPhotoName] = React.useState("");
  const [photoDescription, setPhotoDescription] = React.useState("");
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);
  
  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
      
      // 生成预览
      const previews = fileArray.map(file => URL.createObjectURL(file));
      setPreviewUrls(previews);
    }
  };
  
  // 处理照片上传
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const totalFiles = selectedFiles.length;
      
      for (let i = 0; i < totalFiles; i++) {
        const file = selectedFiles[i];
        const name = photoName || file.name.replace(/\.[^/.]+$/, "");
        
        await uploadPhotoToAlbum(
          familyMemberId,
          file,
          name,
          photoDescription || null
        );
        
        // 更新进度
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
      
      // 上传完成，刷新页面
      window.location.reload();
    } catch (error) {
      console.error("上传照片失败:", error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setSelectedFiles([]);
      setPreviewUrls([]);
      setPhotoName("");
      setPhotoDescription("");
      setIsUploadDialogOpen(false);
    }
  };
  
  // 处理照片删除
  const handleDelete = async () => {
    if (selectedPhotos.size === 0) return;
    
    const confirmed = window.confirm(
      `确定要删除选中的 ${selectedPhotos.size} 张照片吗？`
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    
    const result = await deletePhotos(Array.from(selectedPhotos));
    
    if (result) {
      setSelectedPhotos(new Set());
      window.location.reload();
    } else {
      alert("删除照片失败，请稍后再试");
    }
    
    setIsDeleting(false);
  };
  
  // 处理照片选择
  const handlePhotoSelect = (photoId: number, checked: boolean) => {
    const newSet = new Set(selectedPhotos);
    if (checked) {
      newSet.add(photoId);
    } else {
      newSet.delete(photoId);
    }
    setSelectedPhotos(newSet);
  };
  
  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPhotos(new Set(photos.map(photo => photo.id)));
    } else {
      setSelectedPhotos(new Set());
    }
  };
  
  // 处理照片点击，打开预览
  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    setIsPreviewOpen(true);
  };
  
  // 所有照片都被选中
  const allSelected = photos.length > 0 && selectedPhotos.size === photos.length;
  
  return (
    <div className="space-y-6">
      {/* 相册信息和操作栏 */}
      <div className="bg-stone-50 dark:bg-stone-800/50 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">{album.name}</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {album.description || "暂无描述"}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              上传照片
            </Button>
            
            {selectedPhotos.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                删除 ({selectedPhotos.size})
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* 照片列表 */}
      <div className="border rounded-lg">
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 mb-4">
              <ImageIcon className="h-8 w-8 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-lg text-stone-500 dark:text-stone-400 mb-4">
              相册中暂无照片
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              上传第一张照片
            </Button>
          </div>
        ) : (
          <>
            {/* 选择栏 */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="全选"
                />
                <Label htmlFor="select-all" className="font-medium">
                  选择 ({selectedPhotos.size} / {photos.length})
                </Label>
              </div>
            </div>
            
            {/* 照片网格 */}
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className={cn(
                      "relative group border rounded-lg overflow-hidden transition-all",
                      selectedPhotos.has(photo.id) && "ring-2 ring-primary"
                    )}
                  >
                    {/* 选择框 */}
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedPhotos.has(photo.id)}
                        onCheckedChange={(checked) => handlePhotoSelect(photo.id, checked as boolean)}
                        aria-label={`选择照片 ${photo.name}`}
                        className="bg-white/80 dark:bg-stone-800/80"
                      />
                    </div>
                    
                    {/* 照片 */}
                    <div className="aspect-video overflow-hidden cursor-pointer" onClick={() => handlePhotoClick(photo)}>
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    
                    {/* 照片信息 */}
                    <div className="p-3 bg-stone-50 dark:bg-stone-800/50">
                      <h3 className="font-medium text-sm truncate">{photo.name}</h3>
                      {photo.description && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">
                          {photo.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* 上传照片对话框 */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>上传照片</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 文件选择 */}
            <div className="space-y-2">
              <Label htmlFor="photo-files">选择照片</Label>
              <Input
                id="photo-files"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
              />
              <p className="text-xs text-stone-500 dark:text-stone-400">
                支持上传多张照片，每张不超过 10MB
              </p>
            </div>
            
            {/* 预览 */}
            {previewUrls.length > 0 && (
              <div>
                <Label>预览</Label>
                <ScrollArea className="h-48 mt-2">
                  <div className="flex gap-2 pb-2">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`预览 ${index + 1}`}
                          className="w-24 h-24 object-cover rounded"
                        />
                        <button
                          type="button"
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                          onClick={() => {
                            const newPreviews = previewUrls.filter((_, i) => i !== index);
                            const newFiles = selectedFiles.filter((_, i) => i !== index);
                            setPreviewUrls(newPreviews);
                            setSelectedFiles(newFiles);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
            
            {/* 照片信息 */}
            <div className="space-y-2">
              <Label htmlFor="photo-name">照片名称</Label>
              <Input
                id="photo-name"
                value={photoName}
                onChange={(e) => setPhotoName(e.target.value)}
                placeholder="输入照片名称"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="photo-description">照片描述</Label>
              <Input
                id="photo-description"
                value={photoDescription}
                onChange={(e) => setPhotoDescription(e.target.value)}
                placeholder="输入照片描述"
              />
            </div>
            
            {/* 上传进度 */}
            {isUploading && (
              <div className="space-y-2">
                <Label>上传进度</Label>
                <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {uploadProgress}%
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setSelectedFiles([]);
                setPreviewUrls([]);
                setPhotoName("");
                setPhotoDescription("");
              }}
              disabled={isUploading}
            >
              取消
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  上传中...
                </>
              ) : (
                "上传"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 照片预览对话框 */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0 overflow-hidden">
          {selectedPhoto && (
            <div className="flex flex-col h-full">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>{selectedPhoto.name}</DialogTitle>
                {selectedPhoto.description && (
                  <DialogDescription>
                    {selectedPhoto.description}
                  </DialogDescription>
                )}
              </DialogHeader>
              
              <div className="flex-1 p-4 flex items-center justify-center bg-stone-900">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.name}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </div>
              
              <DialogFooter className="px-6 py-4 border-t">
                <Button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  关闭
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
