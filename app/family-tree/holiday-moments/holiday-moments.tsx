"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { showAlert, showConfirm } from "@/lib/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2, Image as ImageIcon, Video, X } from "lucide-react";
import type { HolidayMedia, HolidayMoment } from "./actions";
import { addHolidayMedia, createHolidayMoment, deleteHolidayMedia, deleteHolidayMoment } from "./actions";
import { cn } from "@/lib/utils";

interface HolidayMomentWithMedia extends HolidayMoment {
  media: HolidayMedia[];
}

interface HolidayMomentsProps {
  moments: HolidayMomentWithMedia[];
  members: { id: number; name: string }[];
}

const HOLIDAY_SUGGESTIONS = [
  "春节",
  "元宵",
  "清明",
  "端午",
  "七夕",
  "中秋",
  "重阳",
  "冬至",
  "除夕",
  "国庆",
  "生日",
  "其他",
];

export function HolidayMoments({ moments, members }: HolidayMomentsProps) {
  const router = useRouter();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [previewItems, setPreviewItems] = React.useState<{
    file: File;
    previewUrl: string;
    mediaType: "image" | "video";
  }[]>([]);
  const [addMediaTarget, setAddMediaTarget] = React.useState<HolidayMomentWithMedia | null>(null);
  const [addMediaFiles, setAddMediaFiles] = React.useState<File[]>([]);
  const [addMediaPreviews, setAddMediaPreviews] = React.useState<{
    file: File;
    previewUrl: string;
    mediaType: "image" | "video";
  }[]>([]);
  const [isAddingMedia, setIsAddingMedia] = React.useState(false);
  const [selectedMedia, setSelectedMedia] = React.useState<HolidayMedia | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [holiday, setHoliday] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [memberId, setMemberId] = React.useState<string>("");
  const [memberQuery, setMemberQuery] = React.useState("");
  const [activeHoliday, setActiveHoliday] = React.useState<string>("all");

  React.useEffect(() => {
    return () => {
      previewItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      addMediaPreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [previewItems, addMediaPreviews]);

  const memberMap = React.useMemo(() => {
    return new Map(members.map((member) => [member.id, member.name]));
  }, [members]);

  const availableHolidays = React.useMemo(() => {
    const holidaySet = new Set(moments.map((moment) => moment.holiday));
    return ["all", ...Array.from(holidaySet).sort()];
  }, [moments]);

  const filteredMoments = React.useMemo(() => {
    if (activeHoliday === "all") {
      return moments;
    }
    return moments.filter((moment) => moment.holiday === activeHoliday);
  }, [moments, activeHoliday]);

  const filteredMembers = React.useMemo(() => {
    const keyword = memberQuery.trim().toLowerCase();
    if (!keyword) return members;
    return members.filter((member) => member.name.toLowerCase().includes(keyword));
  }, [memberQuery, members]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    previewItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));

    const nextPreviews: {
      file: File;
      previewUrl: string;
      mediaType: "image" | "video";
    }[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType: (file.type.startsWith("video/") ? "video" : "image") as "image" | "video",
    }));

    setSelectedFiles(files);
    setPreviewItems(nextPreviews);
  };

  const handleAddMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    addMediaPreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));

    const nextPreviews: {
      file: File;
      previewUrl: string;
      mediaType: "image" | "video";
    }[] = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType: (file.type.startsWith("video/") ? "video" : "image") as "image" | "video",
    }));

    setAddMediaFiles(files);
    setAddMediaPreviews(nextPreviews);
  };

  const handleRemovePreview = (index: number) => {
    const nextPreviews = previewItems.filter((_, i) => i !== index);
    const nextFiles = selectedFiles.filter((_, i) => i !== index);

    setSelectedFiles(nextFiles);
    setPreviewItems(nextPreviews);
  };

  const handleRemoveAddPreview = (index: number) => {
    const nextPreviews = addMediaPreviews.filter((_, i) => i !== index);
    const nextFiles = addMediaFiles.filter((_, i) => i !== index);

    setAddMediaFiles(nextFiles);
    setAddMediaPreviews(nextPreviews);
  };

  const resetForm = () => {
    previewItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setSelectedFiles([]);
    setPreviewItems([]);
    setHoliday("");
    setTitle("");
    setDescription("");
    setMemberId("");
    setMemberQuery("");
  };

  const resetAddMediaForm = () => {
    addMediaPreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setAddMediaFiles([]);
    setAddMediaPreviews([]);
    setAddMediaTarget(null);
  };

  const handleCreateMoment = async () => {
    if (!holiday.trim() || selectedFiles.length === 0) {
      return;
    }

    setIsSubmitting(true);

    const result = await createHolidayMoment({
      title: title.trim() || null,
      description: description.trim() || null,
      holiday: holiday.trim(),
      family_member_id: memberId ? Number(memberId) : null,
      files: selectedFiles,
    });

    if (result) {
      resetForm();
      setIsUploadDialogOpen(false);
      router.refresh();
    } else {
      showAlert("发布节日动态失败，请稍后再试");
    }

    setIsSubmitting(false);
  };

  const handleDeleteMoment = async (momentId: number) => {
    const confirmed = await showConfirm("确定要删除这条节日动态吗？");
    if (!confirmed) return;

    setIsDeleting(momentId);

    const result = await deleteHolidayMoment(momentId);

    if (result) {
      router.refresh();
    } else {
      showAlert("删除节日动态失败，请稍后再试");
    }

    setIsDeleting(null);
  };

  const handleAddMedia = async () => {
    if (!addMediaTarget || addMediaFiles.length === 0) {
      return;
    }

    setIsAddingMedia(true);

    const result = await addHolidayMedia(addMediaTarget.id, addMediaFiles);

    if (result) {
      resetAddMediaForm();
      router.refresh();
    } else {
      showAlert("追加媒体失败，请稍后再试");
    }

    setIsAddingMedia(false);
  };

  const handleDeleteMedia = async (mediaId: number) => {
    const confirmed = await showConfirm("确定要删除这张图片/视频吗？");
    if (!confirmed) return;

    const result = await deleteHolidayMedia(mediaId);
    if (result) {
      router.refresh();
    } else {
      showAlert("删除媒体失败，请稍后再试");
    }
  };

  const handlePreview = (media: HolidayMedia) => {
    setSelectedMedia(media);
    setIsPreviewOpen(true);
  };

  const getGridColumns = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    return "grid-cols-3";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">活动记录</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            记录每逢过节的照片与视频，按时间线展示家族的温馨瞬间
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          发布节日动态
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {availableHolidays.map((item) => (
          <Button
            key={item}
            type="button"
            variant={item === activeHoliday ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveHoliday(item)}
          >
            {item === "all" ? "全部" : item}
          </Button>
        ))}
      </div>

      {filteredMoments.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 mb-4">
            <ImageIcon className="h-8 w-8 text-stone-400 dark:text-stone-500" />
          </div>
          <p className="text-lg text-stone-500 dark:text-stone-400 mb-4">
            暂无节日动态
          </p>
          <Button onClick={() => setIsUploadDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            发布第一条
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMoments.map((moment) => {
            const displayName = moment.family_member_id
              ? memberMap.get(moment.family_member_id) || "家族成员"
              : "家族成员";
            const titleText = moment.title || moment.holiday;
            const mediaCount = moment.media.length;

            return (
              <Card key={moment.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-sm font-semibold text-stone-600 dark:text-stone-200">
                        {displayName.slice(0, 1)}
                      </div>
                      <div>
                        <CardTitle className="text-base font-medium">{titleText}</CardTitle>
                        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                          {displayName} · {new Date(moment.created_at).toLocaleString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{moment.holiday}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {moment.description ? (
                    <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                      {moment.description}
                    </p>
                  ) : null}
                  {mediaCount > 0 ? (
                    <div className={cn("grid gap-2", getGridColumns(mediaCount))}>
                      {moment.media.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "relative overflow-hidden rounded-lg bg-stone-100 dark:bg-stone-900 aspect-video",
                            item.media_type === "image" && "cursor-zoom-in"
                          )}
                          onClick={item.media_type === "image" ? () => handlePreview(item) : undefined}
                          role={item.media_type === "image" ? "button" : undefined}
                          tabIndex={item.media_type === "image" ? 0 : undefined}
                        >
                          <button
                            type="button"
                            className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteMedia(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          {item.media_type === "image" ? (
                            <img
                              src={item.url}
                              alt={moment.title || moment.holiday}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={item.url}
                              className="w-full h-full object-cover"
                              controls
                              preload="metadata"
                              playsInline
                            />
                          )}
                          {item.media_type === "video" ? (
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              视频
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter className="flex items-center justify-between text-xs text-stone-400 dark:text-stone-500">
                  <span>
                    共 {mediaCount} 个媒体
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddMediaTarget(moment)}
                    >
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">追加媒体</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMoment(moment.id)}
                      disabled={isDeleting === moment.id}
                    >
                      {isDeleting === moment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span className="sr-only">删除</span>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>发布节日动态</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="holiday-name">节日名称</Label>
              <Input
                id="holiday-name"
                value={holiday}
                onChange={(event) => setHoliday(event.target.value)}
                placeholder="例如：中秋、春节"
                list="holiday-options"
              />
              <datalist id="holiday-options">
                {HOLIDAY_SUGGESTIONS.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="moment-title">标题（可选）</Label>
              <Input
                id="moment-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：团圆夜" 
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="moment-description">内容（可选）</Label>
              <Textarea
                id="moment-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="记录当天的心情或故事"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="moment-member">发布人（可选）</Label>
              <Input
                id="moment-member"
                value={memberQuery}
                onChange={(event) => setMemberQuery(event.target.value)}
                placeholder="搜索在世成员姓名"
              />
              <div className="max-h-40 overflow-auto rounded-md border">
                <button
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                    memberId === "" && "bg-primary/10 text-primary"
                  )}
                  onClick={() => {
                    setMemberId("");
                    setMemberQuery("");
                  }}
                >
                  不指定
                </button>
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60",
                      memberId === String(member.id) && "bg-primary/10 text-primary"
                    )}
                    onClick={() => {
                      setMemberId(String(member.id));
                      setMemberQuery(member.name);
                    }}
                  >
                    {member.name}
                  </button>
                ))}
                {filteredMembers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">未找到匹配成员</div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="moment-files">图片或视频</Label>
              <Input
                id="moment-files"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileChange}
              />
              <p className="text-xs text-stone-500 dark:text-stone-400">
                支持上传图片或视频，建议单个文件不超过 100MB
              </p>
            </div>

            {previewItems.length > 0 ? (
              <div className="grid gap-2">
                <Label>预览</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {previewItems.map((item, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900">
                      {item.mediaType === "image" ? (
                        <img
                          src={item.previewUrl}
                          alt={`预览 ${index + 1}`}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="relative h-24">
                          <video
                            src={item.previewUrl}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-white">
                            <Video className="h-6 w-6" />
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                        onClick={() => handleRemovePreview(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setIsUploadDialogOpen(false);
              }}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateMoment}
              disabled={isSubmitting || !holiday.trim() || selectedFiles.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  发布中...
                </>
              ) : (
                "发布"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(addMediaTarget)} onOpenChange={(open) => !open && resetAddMediaForm()}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>追加图片或视频</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="add-media-files">选择媒体</Label>
              <Input
                id="add-media-files"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleAddMediaChange}
              />
            </div>

            {addMediaPreviews.length > 0 ? (
              <div className="grid gap-2">
                <Label>预览</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {addMediaPreviews.map((item, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-900">
                      {item.mediaType === "image" ? (
                        <img
                          src={item.previewUrl}
                          alt={`预览 ${index + 1}`}
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="relative h-24">
                          <video
                            src={item.previewUrl}
                            className="w-full h-full object-cover"
                            preload="metadata"
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center text-white">
                            <Video className="h-6 w-6" />
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                        onClick={() => handleRemoveAddPreview(index)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={resetAddMediaForm}
              disabled={isAddingMedia}
            >
              取消
            </Button>
            <Button
              onClick={handleAddMedia}
              disabled={isAddingMedia || addMediaFiles.length === 0}
            >
              {isAddingMedia ? (
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

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] p-0 overflow-hidden">
          {selectedMedia ? (
            <div className="flex flex-col h-full">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>媒体预览</DialogTitle>
              </DialogHeader>
              <div className="flex-1 p-4 flex items-center justify-center bg-stone-900">
                {selectedMedia.media_type === "image" ? (
                  <img
                    src={selectedMedia.url}
                    alt="预览"
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <video
                    src={selectedMedia.url}
                    className="max-w-full max-h-[70vh] object-contain"
                    controls
                    playsInline
                  />
                )}
              </div>
              <DialogFooter className="px-6 py-4 border-t">
                <Button type="button" onClick={() => setIsPreviewOpen(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
