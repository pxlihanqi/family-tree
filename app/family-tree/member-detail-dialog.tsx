"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, ScrollText, ArrowRight, ArrowLeft, X, Share2, Copy, Loader2 } from "lucide-react";
import type { FamilyMemberNode } from "./graph/actions";
import { RichTextViewer } from "@/components/rich-text/viewer";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlbumPhotos } from "./albums/album-photos";
import { getOrCreateAlbum, getPhotosByAlbumId } from "./albums/actions";
import type { Album, Photo } from "./albums/actions";
import { getLifeEventsByFamilyMemberId } from "./life-events/actions";
import { getOfferingsByMemberId } from "./offerings/actions";
import type { LifeEvent } from "./life-events/actions";
import { TimelineView } from "./life-events/timeline-view";
import { Offerings } from "./offerings/offerings";
import { createShareLink } from "@/app/share/actions";
import { getLunarAgeText } from "@/lib/lunar-age";

interface MemberDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  member: FamilyMemberNode | null;
  fatherName?: string | null;
  members?: FamilyMemberNode[];
  onSelectMember?: (member: FamilyMemberNode) => void;
}

export function MemberDetailDialog({
  isOpen,
  onOpenChange,
  member,
  fatherName,
  members = [],
  onSelectMember,
}: MemberDetailDialogProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [isLoadingLifeEvents, setIsLoadingLifeEvents] = useState(false);
  const [offerings, setOfferings] = useState<Awaited<ReturnType<typeof getOfferingsByMemberId>>>([]);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareDays, setShareDays] = useState("7");
  const [shareLink, setShareLink] = useState("");
  const [isCreatingShare, setIsCreatingShare] = useState(false);

  const siblings = useMemo(() => {
    if (!member?.father_id) return [];
    return members.filter((m) => m.father_id === member.father_id && m.id !== member.id);
  }, [member, members]);

  const children = useMemo(() => {
    if (!member) return [];
    const ownChildren = members.filter((m) => m.father_id === member.id);
    if (member.gender !== "女" || !member.spouse_id) {
      return ownChildren;
    }

    const spouseChildren = members.filter((m) => m.father_id === member.spouse_id);
    if (spouseChildren.length === 0) {
      return ownChildren;
    }

    const merged = new Map<number, FamilyMemberNode>();
    ownChildren.forEach((child) => merged.set(child.id, child));
    spouseChildren.forEach((child) => merged.set(child.id, child));
    return Array.from(merged.values());
  }, [member, members]);

  const ageText = useMemo(() => {
    if (!member) return "未记录";
    return getLunarAgeText(member.birthday, member.death_date);
  }, [member]);

  const zodiacText = useMemo(() => {
    if (!member?.birthday) return "未记录";
    const year = new Date(member.birthday).getFullYear();
    if (Number.isNaN(year)) return "未记录";
    const zodiac = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
    const index = ((year - 4) % 12 + 12) % 12;
    return zodiac[index] ?? "未记录";
  }, [member]);

  // Reset flip state when dialog opens/closes or member changes
  useEffect(() => {
    if (isOpen) {
      setIsFlipped(false);
    }
  }, [isOpen, member]);

  // Fetch album, photos, and life events when member changes
  useEffect(() => {
    if (isOpen && member) {
      const fetchData = async () => {
        // Fetch album and photos
        setIsLoadingAlbum(true);
        try {
          // Get or create album
          const albumData = await getOrCreateAlbum(member.id);
          setAlbum(albumData);
          
          // Get photos if album exists
          if (albumData) {
            const photosData = await getPhotosByAlbumId(albumData.id);
            setPhotos(photosData);
          }
        } catch (error) {
          console.error("获取相册数据失败:", error);
        } finally {
          setIsLoadingAlbum(false);
        }
        
        // Fetch life events
        setIsLoadingLifeEvents(true);
        try {
          const events = await getLifeEventsByFamilyMemberId(member.id);
          setLifeEvents(events);
        } catch (error) {
          console.error("获取生平事迹数据失败:", error);
        } finally {
          setIsLoadingLifeEvents(false);
        }

        // Fetch offerings (only for deceased members)
        if (!member.is_alive) {
          setIsLoadingOfferings(true);
          try {
            const data = await getOfferingsByMemberId(member.id);
            setOfferings(data);
          } catch (error) {
            console.error("获取祭拜记录失败:", error);
          } finally {
            setIsLoadingOfferings(false);
          }
        } else {
          setOfferings([]);
        }
      };
      
      fetchData();
    }
  }, [isOpen, member]);

  if (!member) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const [y, m, d] = dateStr.split("-");
    return `${y}年${m}月${d}日`;
  };

  const handleCreateShareLink = async () => {
    if (!member) return;
    setIsCreatingShare(true);
    const days = Number.parseInt(shareDays, 10);
    const result = await createShareLink(Number.isNaN(days) ? 7 : days);
    setIsCreatingShare(false);

    if (!result || typeof window === "undefined") {
      alert("生成分享链接失败");
      return;
    }
    setShareLink(`${window.location.origin}/share/${result.token}/member/${member.id}`);
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    alert("分享链接已复制");
  };

  return (
    <>
      <Dialog modal={true} open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent 
          className="max-w-none w-auto p-0 overflow-visible bg-transparent border-none shadow-none duration-1000 flex items-center justify-center pointer-events-none"
          aria-describedby={undefined}
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{member.name} 详情</DialogTitle>
        
        {/* Scene Container - Responsive: Full width/height on mobile, Fixed aspect on PC */}
        <div className="relative w-[92vw] h-[70vh] sm:w-auto sm:h-[85vh] sm:aspect-[3/4] [perspective:1500px] group pointer-events-auto">
          
          {/* Close Button */}
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute -top-12 right-0 sm:-top-12 sm:-right-8 p-2 text-white/80 hover:text-white transition-colors z-50 focus:outline-none bg-black/20 hover:bg-black/40 rounded-full backdrop-blur-sm"
            aria-label="关闭"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Book Container (The flipper) */}
          <div 
            className={cn(
              "relative w-full h-full transition-transform duration-1000 ease-in-out [transform-style:preserve-3d]",
              isFlipped ? "[transform:rotateY(-180deg)]" : ""
            )}
          >
            {/* ================= FRONT PAGE (Basic Info) ================= */}
            <div 
              className={cn(
                "absolute inset-0 w-full h-full [backface-visibility:hidden] transition-all duration-0 delay-500",
                !isFlipped ? "z-20 pointer-events-auto opacity-100" : "z-0 pointer-events-none opacity-0"
              )}
            >
              <div className="w-full h-full bg-[#fdfbf7] dark:bg-stone-900 rounded-lg shadow-2xl overflow-hidden border-2 sm:border-4 border-double border-stone-200 dark:border-stone-700 flex flex-col relative">
                
                {/* Decorative Corner */}
                <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-bl from-amber-100/50 dark:from-amber-900/20 to-transparent pointer-events-none" />

                {/* Header Section */}
                <div className="bg-stone-100/50 dark:bg-stone-800/50 p-4 sm:p-6 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    {member.avatar ? (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-stone-300 dark:border-stone-600">
                        <img 
                          src={member.avatar} 
                          alt={`${member.name} 的头像`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // 如果头像加载失败，显示默认图标
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-full h-full flex items-center justify-center bg-stone-200 dark:bg-stone-700">
                          <User className="h-6 w-6 sm:h-7 sm:w-7 text-stone-600 dark:text-stone-300" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center">
                        <User className="h-6 w-6 sm:h-7 sm:w-7 text-stone-600 dark:text-stone-300" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 dark:text-stone-100">{member.name}</h2>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-serif mt-1">
                        {member.generation ? `第 ${member.generation} 世` : "世代未知"} 
                        {member.sibling_order ? ` • 行 ${member.sibling_order}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 sm:gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setIsShareDialogOpen(true)}
                    >
                      <Share2 className="mr-1 h-3.5 w-3.5" />
                      分享详情
                    </Button>
                     {member.gender && (
                      <Badge variant="outline" className={cn(
                        "font-serif text-[10px] sm:text-xs px-1.5 sm:px-2.5",
                        member.gender === "男" 
                          ? "border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-900/30" 
                          : "border-pink-200 text-pink-700 bg-pink-50 dark:border-pink-800 dark:text-pink-300 dark:bg-pink-900/30"
                      )}>
                        {member.gender}
                      </Badge>
                    )}
                    {member.is_alive ? (
                      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-900/30 font-serif text-[10px] sm:text-xs px-1.5 sm:px-2.5">在世</Badge>
                    ) : (
                      <Badge variant="outline" className="border-stone-300 text-stone-500 bg-stone-100 dark:border-stone-600 dark:text-stone-400 dark:bg-stone-800 font-serif text-[10px] sm:text-xs px-1.5 sm:px-2.5">已故</Badge>
                    )}
                  </div>
                </div>

                {/* Content Body - Native Scroll */}
                <div className="flex-1 w-full overflow-y-auto font-serif scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-700 p-5 sm:p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    <div className="space-y-5 sm:space-y-6">
                      {/* Key Relations */}
                      <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1">
                          <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">父亲</span>
                          <div className="p-2 sm:p-3 bg-stone-50 dark:bg-stone-800/50 rounded border border-stone-100 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium text-sm sm:text-base">
                            {fatherName || "未记录"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">配偶</span>
                          <div className="p-2 sm:p-3 bg-stone-50 dark:bg-stone-800/50 rounded border border-stone-100 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-medium text-sm sm:text-base">
                            {member.spouse || "未记录"}
                          </div>
                        </div>
                      </div>

                      <div className="w-full h-px bg-stone-200 dark:bg-stone-700 my-2 sm:my-4" />

                      {/* Timeline Data */}
                      <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1">
                          <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">生辰</span>
                          <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300">{formatDate(member.birthday)}</p>
                        </div>
                        {!member.is_alive && (
                          <div className="space-y-1">
                            <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">卒年</span>
                            <p className="text-base sm:text-lg text-stone-700 dark:text-stone-300">{formatDate(member.death_date)}</p>
                          </div>
                        )}
                      </div>
                      {!member.is_alive && (
                        <div className="space-y-1">
                          <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">埋葬地点</span>
                          <p className="text-stone-700 dark:text-stone-300 text-sm sm:text-base">
                            {member.burial_place || "未记录"}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1">
                          <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">年龄</span>
                          <p className="text-stone-700 dark:text-stone-300 flex items-center gap-2 text-sm sm:text-base">
                            {ageText}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">生肖</span>
                          <p className="text-stone-700 dark:text-stone-300 flex items-center gap-2 text-sm sm:text-base">
                            {zodiacText}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">居住地</span>
                        <p className="text-stone-700 dark:text-stone-300 flex items-center gap-2 text-sm sm:text-base">
                          {member.residence_place || "未记录"}
                        </p>
                      </div>

                      {member.is_alive && (
                        <div className="space-y-1">
                          <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">联系方式</span>
                          <p className="text-stone-700 dark:text-stone-300 flex items-center gap-2 text-sm sm:text-base">
                            {member.contact || "未记录"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-5 sm:space-y-6">
                      <div className="space-y-2">
                      <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">兄弟姐妹</span>
                      {siblings.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">未记录</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {siblings.map((sibling) => (
                            <button
                              key={sibling.id}
                              type="button"
                              onClick={() => onSelectMember?.(sibling)}
                              className="px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                            >
                              {sibling.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">子女</span>
                      {children.length === 0 ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">未记录</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {children.map((child) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => onSelectMember?.(child)}
                              className="px-2 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                            >
                              {child.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {!member.is_alive ? (
                      <div className="space-y-2">
                        {isLoadingOfferings ? (
                          <div className="text-sm text-muted-foreground">加载祭拜记录中...</div>
                        ) : (
                          <Offerings familyMemberId={member.id} offerings={offerings} />
                        )}
                      </div>
                    ) : null}
                    </div>

                    <div className="lg:col-span-2 space-y-2">
                      <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">家族相册</span>
                      <div className="border rounded-lg overflow-hidden">
                        {isLoadingAlbum ? (
                          <div className="text-center py-8">
                            <p className="text-sm text-stone-500 dark:text-stone-400">加载相册中...</p>
                          </div>
                        ) : album ? (
                          <div className="p-2">
                            {photos.length === 0 ? (
                              <div className="text-center py-6">
                                <p className="text-sm text-stone-500 dark:text-stone-400">暂无照片</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {photos.slice(0, 6).map((photo) => (
                                  <div key={photo.id} className="relative rounded-md overflow-hidden aspect-square cursor-pointer group">
                                    <img
                                      src={photo.url}
                                      alt={photo.name}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                  </div>
                                ))}
                                {photos.length > 6 && (
                                  <div className="relative rounded-md overflow-hidden aspect-square bg-stone-100 dark:bg-stone-800 flex items-center justify-center cursor-pointer group">
                                    <span className="text-sm font-medium text-stone-600 dark:text-stone-300">+{photos.length - 6}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-sm text-stone-500 dark:text-stone-400">创建相册失败</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer / Navigation */}
                <div className="p-3 sm:p-4 bg-stone-50 dark:bg-stone-800/80 border-t border-stone-200 dark:border-stone-700 flex justify-end shrink-0">
                  <Button 
                    variant="ghost" 
                    className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 gap-2 font-serif text-sm sm:text-base"
                    onClick={() => setIsFlipped(true)}
                  >
                    简介与生平 <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>

              </div>
            </div>

            {/* ================= BACK PAGE (Life Info) ================= */}
            <div 
              className={cn(
                "absolute inset-0 w-full h-full [backface-visibility:hidden] [transform:rotateY(180deg)] transition-all duration-0 delay-500",
                isFlipped ? "z-20 pointer-events-auto opacity-100" : "z-0 pointer-events-none opacity-0"
              )}
            >
              <div className="w-full h-full bg-[#fdfbf7] dark:bg-stone-900 rounded-lg shadow-2xl overflow-hidden border-2 sm:border-4 border-double border-stone-200 dark:border-stone-700 flex flex-col relative">
                
                {/* Decorative Corner */}
                <div className="absolute top-0 left-0 w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-100/50 dark:from-amber-900/20 to-transparent pointer-events-none" />

                {/* Header Section */}
                <div className="bg-stone-100/50 dark:bg-stone-800/50 p-4 sm:p-6 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                      <ScrollText className="h-5 w-5 sm:h-6 sm:w-6 text-amber-700 dark:text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-xl font-serif font-bold text-stone-800 dark:text-stone-100">简介与生平</h2>
                      <p className="text-xs text-stone-500 dark:text-stone-400 font-serif mt-1">
                        {member.name} 的个人资料
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 p-5 sm:p-8 overflow-hidden flex flex-col font-serif">
                  
                  {member.official_position && (
                    <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-stone-200 dark:border-stone-700 border-dashed shrink-0">
                      <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block mb-2">官职 / 头衔</span>
                      <p className="text-base sm:text-lg font-medium text-stone-800 dark:text-stone-200 bg-stone-100/50 dark:bg-stone-800/50 p-2 sm:p-3 rounded border border-stone-100 dark:border-stone-700 inline-block">
                        {member.official_position}
                      </p>
                    </div>
                  )}

                  <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-stone-200 dark:border-stone-700 border-dashed shrink-0">
                    <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block mb-2">简介</span>
                    <div className="rounded-md border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-3 sm:p-4">
                      {member.remarks ? (
                        <RichTextViewer value={member.remarks} />
                      ) : (
                        <p className="text-sm text-stone-500 dark:text-stone-400">未记录</p>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col">
                     <span className="text-[10px] sm:text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block mb-2 shrink-0">生平时间轴</span>
                     <div className="flex-1 w-full overflow-y-auto min-h-0 rounded-md border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 p-3 sm:p-4 scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-700">
                      
                        
                        <div className="mt-6">
                          {isLoadingLifeEvents ? (
                            <div className="text-center py-4">
                              <p className="text-sm text-stone-500 dark:text-stone-400">加载生平事迹中...</p>
                            </div>
                          ) : (
                            <TimelineView lifeEvents={lifeEvents} />
                          )}
                        </div>
                     </div>
                  </div>
                </div>

                {/* Footer / Navigation */}
                <div className="p-3 sm:p-4 bg-stone-50 dark:bg-stone-800/80 border-t border-stone-200 dark:border-stone-700 flex justify-start shrink-0">
                   <Button 
                    variant="ghost" 
                    className="text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 gap-2 font-serif text-sm sm:text-base"
                    onClick={() => setIsFlipped(false)}
                  >
                    <ArrowLeft className="w-4 h-4" /> 基本信息
                  </Button>
                </div>

              </div>
            </div>

          </div>
        </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分享个人详情</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-share-days">有效期（天，0 表示不过期）</Label>
              <Input
                id="member-share-days"
                type="number"
                min={0}
                value={shareDays}
                onChange={(e) => setShareDays(e.target.value)}
              />
            </div>
            {shareLink ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="member-share-link">分享链接</Label>
                  <Input id="member-share-link" value={shareLink} readOnly />
                </div>
                <div className="flex justify-center rounded-md border p-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareLink)}`}
                    alt="分享二维码"
                    className="h-44 w-44"
                  />
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            {shareLink ? (
              <Button type="button" variant="outline" onClick={handleCopyShareLink}>
                <Copy className="mr-2 h-4 w-4" />
                复制链接
              </Button>
            ) : null}
            <Button type="button" onClick={handleCreateShareLink} disabled={isCreatingShare}>
              {isCreatingShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              生成链接与二维码
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
