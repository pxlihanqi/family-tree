"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showConfirm } from "@/lib/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Maximize2, Minimize2, Pencil, Trash2 } from "lucide-react";
import {
  deletePhotoAnnotationImage,
  getPhotoAnnotationImages,
  type PhotoAnnotationImage,
  updatePhotoAnnotationImageData,
  uploadPhotoAnnotationImage,
} from "./actions";

type Marker = PhotoAnnotationImage["markers"][number];

type SaveStatus = "idle" | "saving" | "saved" | "error";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const BASE_MARKER_SIZE = 16;
const MIN_MARKER_SIZE = 8;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function clampScale(value: number) {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

function nextMarkerId(markers: Marker[]) {
  return markers.reduce((maxId, marker) => Math.max(maxId, marker.id), 0) + 1;
}

export function PhotoAnnotationClient() {
  const [images, setImages] = React.useState<PhotoAnnotationImage[]>([]);
  const [selectedImageId, setSelectedImageId] = React.useState<number | null>(null);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [hoveredId, setHoveredId] = React.useState<number | null>(null);
  const [markerSearch, setMarkerSearch] = React.useState("");
  const [scale, setScale] = React.useState(1);
  const [isReady, setIsReady] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [dirtyTick, setDirtyTick] = React.useState(0);
  const [isImageEditDialogOpen, setIsImageEditDialogOpen] = React.useState(false);
  const [isMarkerEditDialogOpen, setIsMarkerEditDialogOpen] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [imageNameDraft, setImageNameDraft] = React.useState("");
  const [imageDescriptionDraft, setImageDescriptionDraft] = React.useState("");
  const [markerTitleDraft, setMarkerTitleDraft] = React.useState("");
  const [markerDescriptionDraft, setMarkerDescriptionDraft] = React.useState("");
  const [editingMarkerId, setEditingMarkerId] = React.useState<number | null>(null);

  const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLDivElement | null>(null);
  const fullscreenHostRef = React.useRef<HTMLDivElement | null>(null);
  const isPanningRef = React.useRef(false);
  const panStartRef = React.useRef({
    clientX: 0,
    clientY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const draggingMarkerIdRef = React.useRef<number | null>(null);

  const selectedImage = React.useMemo(
    () => images.find((item) => item.id === selectedImageId) ?? null,
    [images, selectedImageId]
  );

  const selectedMarker = React.useMemo(
    () => selectedImage?.markers.find((marker) => marker.id === selectedId) ?? null,
    [selectedImage, selectedId]
  );

  const hoveredMarker = React.useMemo(
    () => selectedImage?.markers.find((marker) => marker.id === hoveredId) ?? null,
    [selectedImage, hoveredId]
  );

  const markerSize = React.useMemo(
    () => Math.max(MIN_MARKER_SIZE, Math.round(BASE_MARKER_SIZE * scale)),
    [scale]
  );

  const filteredMarkers = React.useMemo(() => {
    if (!selectedImage) {
      return [];
    }

    const keyword = markerSearch.trim().toLowerCase();
    if (!keyword) {
      return selectedImage.markers;
    }

    return selectedImage.markers.filter((marker) => {
      const haystack = `${marker.title} ${marker.description}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [markerSearch, selectedImage]);

  const updateSelectedImage = React.useCallback(
    (updater: (item: PhotoAnnotationImage) => PhotoAnnotationImage) => {
      if (!selectedImageId) return;

      setImages((prev) =>
        prev.map((item) => (item.id === selectedImageId ? updater(item) : item))
      );
    },
    [selectedImageId]
  );

  const markDirty = React.useCallback(() => {
    setDirtyTick((prev) => prev + 1);
  }, []);

  React.useEffect(() => {
    let mounted = true;

    async function load() {
      const result = await getPhotoAnnotationImages();
      if (!mounted) return;

      if (!result.success || !result.data) {
        setErrorMessage(result.error || "加载标注失败");
        setIsReady(true);
        return;
      }

      setImages(result.data);
      setSelectedImageId(result.data[0]?.id ?? null);
      setSelectedId(null);
      setHoveredId(null);
      setMarkerSearch("");
      setErrorMessage(null);
      setIsReady(true);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (selectedId && !selectedImage?.markers.some((marker) => marker.id === selectedId)) {
      setSelectedId(null);
    }
  }, [selectedId, selectedImage]);

  React.useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(document.fullscreenElement === fullscreenHostRef.current);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
    };
  }, []);

  React.useEffect(() => {
    const handleWindowMouseMove = (event: MouseEvent) => {
      if (draggingMarkerIdRef.current !== null) {
        const canvas = canvasRef.current;
        if (!canvas || !selectedImageId) return;

        const rect = canvas.getBoundingClientRect();
        const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
        const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);

        updateSelectedImage((item) => ({
          ...item,
          markers: item.markers.map((marker) =>
            marker.id === draggingMarkerIdRef.current
              ? {
                  ...marker,
                  x,
                  y,
                }
              : marker
          ),
        }));
        markDirty();
        return;
      }

      if (!isPanningRef.current || !scrollContainerRef.current) {
        return;
      }

      const dx = event.clientX - panStartRef.current.clientX;
      const dy = event.clientY - panStartRef.current.clientY;

      scrollContainerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
      scrollContainerRef.current.scrollTop = panStartRef.current.scrollTop - dy;
    };

    const stopDragging = () => {
      draggingMarkerIdRef.current = null;
      isPanningRef.current = false;
      setIsPanning(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", stopDragging);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [markDirty, selectedImageId, updateSelectedImage]);

  React.useEffect(() => {
    if (!isReady || isUploading || dirtyTick === 0 || !selectedImage) {
      return;
    }

    setSaveStatus("saving");
    setErrorMessage(null);

    const timer = window.setTimeout(async () => {
      const result = await updatePhotoAnnotationImageData({
        imageId: selectedImage.id,
        imageName: selectedImage.imageName,
        imageDescription: selectedImage.imageDescription,
        markers: selectedImage.markers,
      });

      if (result.success) {
        setSaveStatus("saved");
        if (result.updatedAt) {
          setImages((prev) =>
            prev.map((item) =>
              item.id === selectedImage.id
                ? {
                    ...item,
                    updatedAt: result.updatedAt || item.updatedAt,
                  }
                : item
            )
          );
        }
      } else {
        setSaveStatus("error");
        setErrorMessage(result.error || "保存失败");
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [dirtyTick, isReady, isUploading, selectedImage]);

  React.useEffect(() => {
    if (saveStatus !== "saved") {
      return;
    }

    const timer = window.setTimeout(() => {
      setSaveStatus("idle");
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const result = await uploadPhotoAnnotationImage({ file });

    setIsUploading(false);
    event.target.value = "";

    if (!result.success || !result.data) {
      setErrorMessage(result.error || "上传图片失败");
      return;
    }

    setImages((prev) => [result.data!, ...prev]);
    setSelectedImageId(result.data.id);
    setSelectedId(null);
    setHoveredId(null);
    setMarkerSearch("");
    setScale(1);
    setSaveStatus("saved");
  };

  const handleDeleteImage = async (imageId: number) => {
    const image = images.find((item) => item.id === imageId);
    if (!image) return;

    if (!(await showConfirm(`确认删除图片「${image.imageName}」及其全部标记吗？`))) {
      return;
    }

    setErrorMessage(null);
    const result = await deletePhotoAnnotationImage(imageId);

    if (!result.success) {
      setErrorMessage(result.error || "删除失败");
      return;
    }

    setImages((prev) => {
      const next = prev.filter((item) => item.id !== imageId);
      if (selectedImageId === imageId) {
        setSelectedImageId(next[0]?.id ?? null);
        setSelectedId(null);
        setHoveredId(null);
        setMarkerSearch("");
        setScale(1);
      }
      return next;
    });
  };

  const handleImageDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedImage || event.button !== 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);

    const id = nextMarkerId(selectedImage.markers);
    const nextMarker: Marker = {
      id,
      x,
      y,
      title: `标记 ${id}`,
      description: "",
    };

    updateSelectedImage((item) => ({
      ...item,
      markers: [...item.markers, nextMarker],
    }));
    setSelectedId(nextMarker.id);
    markDirty();
  };

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.1 : -0.1;
    setScale((prev) => clampScale(prev + delta));
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  };

  const handleMarkerMouseDown = (event: React.MouseEvent<HTMLButtonElement>, markerId: number) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    draggingMarkerIdRef.current = markerId;
    setSelectedId(markerId);
  };

  const toggleFullscreen = async () => {
    const host = fullscreenHostRef.current;
    if (!host) return;
    try {
      if (document.fullscreenElement === host) {
        await document.exitFullscreen();
      } else {
        await host.requestFullscreen();
      }
    } catch (error) {
      console.error("切换全屏失败:", error);
    }
  };

  const updateMarkerById = (
    markerId: number,
    patch: Partial<Pick<Marker, "title" | "description">>
  ) => {
    updateSelectedImage((item) => ({
      ...item,
      markers: item.markers.map((marker) =>
        marker.id === markerId
          ? {
              ...marker,
              ...patch,
            }
          : marker
      ),
    }));
    markDirty();
  };

  const updateSelectedImageMeta = (patch: Partial<Pick<PhotoAnnotationImage, "imageName" | "imageDescription">>) => {
    if (!selectedImage) return;

    updateSelectedImage((item) => ({
      ...item,
      ...patch,
    }));
    markDirty();
  };

  const openImageEditDialog = (image: PhotoAnnotationImage) => {
    setSelectedImageId(image.id);
    setImageNameDraft(image.imageName);
    setImageDescriptionDraft(image.imageDescription);
    setIsImageEditDialogOpen(true);
  };

  const saveImageEditDialog = () => {
    if (!selectedImage) return;
    updateSelectedImageMeta({
      imageName: imageNameDraft,
      imageDescription: imageDescriptionDraft,
    });
    setIsImageEditDialogOpen(false);
  };

  const openMarkerEditDialog = (marker: Marker) => {
    setSelectedId(marker.id);
    setEditingMarkerId(marker.id);
    setMarkerTitleDraft(marker.title);
    setMarkerDescriptionDraft(marker.description);
    setIsMarkerEditDialogOpen(true);
  };

  const saveMarkerEditDialog = () => {
    if (!editingMarkerId) return;
    updateMarkerById(editingMarkerId, {
      title: markerTitleDraft,
      description: markerDescriptionDraft,
    });
    setIsMarkerEditDialogOpen(false);
    setEditingMarkerId(null);
  };

  const removeMarker = (markerId: number) => {
    updateSelectedImage((item) => ({
      ...item,
      markers: item.markers.filter((marker) => marker.id !== markerId),
    }));
    setHoveredId((prev) => (prev === markerId ? null : prev));
    setSelectedId((prev) => (prev === markerId ? null : prev));
    markDirty();
  };

  const saveHint =
    saveStatus === "saving"
      ? "云端保存中..."
      : saveStatus === "saved"
        ? "已保存到云端"
        : saveStatus === "error"
          ? "云端保存失败"
          : "";

  if (!isReady) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">正在加载云端标注数据...</div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader>
          <CardTitle>标注画布</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photo-upload">上传照片（可多张，自动云同步）</Label>
            <Input id="photo-upload" type="file" accept="image/*" onChange={handleUpload} disabled={isUploading} />
            {selectedImage ? (
              <p className="text-xs text-muted-foreground">当前图片：{selectedImage.imageName}</p>
            ) : null}
            {isUploading ? <p className="text-xs text-muted-foreground">图片上传中...</p> : null}
            {saveHint ? <p className="text-xs text-muted-foreground">{saveHint}</p> : null}
            {errorMessage ? <p className="text-xs text-red-500">{errorMessage}</p> : null}
          </div>

          {selectedImage ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setScale(1)}>
                  重置 100%
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={toggleFullscreen}>
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="mr-1 h-4 w-4" />
                      退出全屏
                    </>
                  ) : (
                    <>
                      <Maximize2 className="mr-1 h-4 w-4" />
                      全屏查看
                    </>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">当前缩放：{Math.round(scale * 100)}%</span>
                <span className="text-xs text-muted-foreground">
                  滚轮缩放，左键拖动画布，左键双击添加标记，拖动标记可更新坐标
                </span>
              </div>

              <div
                ref={fullscreenHostRef}
                className={`rounded-lg border bg-muted/20 p-2 ${isFullscreen ? "h-screen w-screen rounded-none border-0 p-4" : ""}`}
              >
                <div
                  ref={scrollContainerRef}
                  className={`overflow-auto rounded-md border bg-background select-none ${
                    isPanning ? "cursor-grabbing" : "cursor-grab"
                  } ${isFullscreen ? "h-[calc(100vh-2rem)]" : "h-[55vh] min-h-[360px] md:h-[62vh] md:min-h-[460px]"}`}
                  onWheel={handleCanvasWheel}
                  onMouseDown={handleCanvasMouseDown}
                >
                  <div
                    ref={canvasRef}
                    className="relative"
                    style={{ width: `${Math.round(scale * 100)}%` }}
                    onDoubleClick={handleImageDoubleClick}
                  >
                    <img
                      src={selectedImage.imageUrl}
                      alt="上传后可标注的图片"
                      className="block h-auto w-full select-none"
                      draggable={false}
                    />

                    {selectedImage.markers.map((marker) => (
                      <button
                        key={marker.id}
                        type="button"
                        className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-transform ${
                          marker.id === selectedId ? "bg-amber-500" : "bg-red-500"
                        } cursor-move`}
                        style={{
                          left: `${marker.x}%`,
                          top: `${marker.y}%`,
                          width: `${marker.id === selectedId ? markerSize + 2 : markerSize}px`,
                          height: `${marker.id === selectedId ? markerSize + 2 : markerSize}px`,
                        }}
                        onMouseDown={(event) => handleMarkerMouseDown(event, marker.id)}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onMouseEnter={() => setHoveredId(marker.id)}
                        onMouseLeave={() => setHoveredId((prev) => (prev === marker.id ? null : prev))}
                        onFocus={() => setHoveredId(marker.id)}
                        onBlur={() => setHoveredId((prev) => (prev === marker.id ? null : prev))}
                        aria-label={marker.title || `标记 ${marker.id}`}
                      />
                    ))}

                    {hoveredMarker ? (
                      <div
                        className="pointer-events-none absolute z-10 max-w-60 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-md border bg-background px-3 py-2 text-xs shadow-lg"
                        style={{ left: `${hoveredMarker.x}%`, top: `${hoveredMarker.y}%` }}
                      >
                        <div className="font-medium">{hoveredMarker.title || "未命名标记"}</div>
                        <div className="mt-1 text-muted-foreground">
                          {hoveredMarker.description || "暂无说明"}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              请先上传一张照片。
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>图片与标记</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            已上传 <span className="font-medium text-foreground">{images.length}</span> 张图片。
          </p>

          {images.length > 0 ? (
            <div className="space-y-2 border-b pb-4">
              <p className="text-sm font-medium">图片列表</p>
              <div className="max-h-44 space-y-2 overflow-auto pr-1">
                {images.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors ${
                      item.id === selectedImageId
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        setSelectedImageId(item.id);
                        setSelectedId(null);
                        setHoveredId(null);
                        setMarkerSearch("");
                        setScale(1);
                      }}
                    >
                      <div className="font-medium truncate">{item.imageName}</div>
                      <div className="text-xs text-muted-foreground">标记点：{item.markers.length}</div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openImageEditDialog(item)}
                      aria-label={`编辑图片 ${item.imageName || item.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteImage(item.id)}
                      aria-label={`删除图片 ${item.imageName || item.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {selectedImage ? (
            <div className="space-y-3 border-b pb-4">
              <p className="text-sm font-medium">图片信息</p>
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{selectedImage.imageName || "未命名图片"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedImage.imageDescription || "暂无描述"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="marker-search">搜索标记</Label>
            <Input
              id="marker-search"
              value={markerSearch}
              onChange={(event) => setMarkerSearch(event.target.value)}
              placeholder="按标记标题或内容搜索"
              disabled={!selectedImage}
            />
          </div>

          {selectedImage && selectedMarker ? (
            <div className="space-y-3">
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{selectedMarker.title || "未命名标记"}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedMarker.description || "暂无说明"}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              先从左侧选择图片并点击标记点，可编辑其内容。
            </div>
          )}

          {selectedImage ? (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">
                当前图片标记列表（{filteredMarkers.length}/{selectedImage.markers.length}）
              </p>
              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {filteredMarkers.map((marker) => (
                  <div
                    key={marker.id}
                    className={`flex items-center gap-2 rounded-md border px-2 py-2 text-sm transition-colors ${
                      marker.id === selectedId
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setSelectedId(marker.id)}
                    >
                      <div className="font-medium">{marker.title || `标记 ${marker.id}`}</div>
                      <div className="text-xs text-muted-foreground">
                        X: {marker.x.toFixed(1)}%, Y: {marker.y.toFixed(1)}%
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openMarkerEditDialog(marker)}
                      aria-label={`编辑标记 ${marker.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => removeMarker(marker.id)}
                      aria-label={`删除标记 ${marker.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {filteredMarkers.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    没有匹配的标记。
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={isImageEditDialogOpen} onOpenChange={setIsImageEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑图片信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dialog-image-name">名称</Label>
              <Input
                id="dialog-image-name"
                value={imageNameDraft}
                onChange={(event) => setImageNameDraft(event.target.value)}
                placeholder="输入图片名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-image-description">描述</Label>
              <Textarea
                id="dialog-image-description"
                value={imageDescriptionDraft}
                onChange={(event) => setImageDescriptionDraft(event.target.value)}
                placeholder="输入图片描述"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsImageEditDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={saveImageEditDialog}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isMarkerEditDialogOpen}
        onOpenChange={(open) => {
          setIsMarkerEditDialogOpen(open);
          if (!open) {
            setEditingMarkerId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑标记</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="dialog-marker-title">标题</Label>
              <Input
                id="dialog-marker-title"
                value={markerTitleDraft}
                onChange={(event) => setMarkerTitleDraft(event.target.value)}
                placeholder="输入标记标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialog-marker-description">内容</Label>
              <Textarea
                id="dialog-marker-description"
                value={markerDescriptionDraft}
                onChange={(event) => setMarkerDescriptionDraft(event.target.value)}
                placeholder="输入详细说明"
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsMarkerEditDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={saveMarkerEditDialog}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
