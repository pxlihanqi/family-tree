"use client";

import { useState, useCallback, useEffect, useMemo, useRef, memo } from "react";
import {
    ChevronLeft,
    ChevronRight,
    BookOpen,
    User,
    ScrollText,
    Maximize,
    Minimize,
    Search,
    X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, FAMILY_NAME } from "@/lib/utils";
import { getLunarAgeText } from "@/lib/lunar-age";
import type { BiographyMember, RelationMember } from "./actions";
import { RichTextViewer } from "@/components/rich-text/viewer";
import { TimelineView } from "../life-events/timeline-view";

interface BiographyBookProps {
    members: BiographyMember[];
    allMembers: RelationMember[];
}

type RelationLike = {
    id: number;
    father_id?: number | null;
    birthday?: string | null;
    death_date?: string | null;
};

// 单独的页面组件（使用 memo 避免不必要的重渲染）
type PageSide = "left" | "right";

const MemberPage = memo(function MemberPage({
    member,
    siblings,
    children,
    ageText,
    zodiacText,
    pageIndex,
    totalPages,
    formatDate,
    side,
}: {
    member: BiographyMember;
    siblings: RelationMember[];
    children: RelationMember[];
    ageText: string;
    zodiacText: string;
    pageIndex: number;
    totalPages: number;
    formatDate: (dateStr: string | null) => string;
    side: PageSide;
}) {
    return (
        <div
            className={cn(
                "w-full h-full bg-gradient-to-b from-slate-50 to-cyan-50/60 shadow-2xl flex flex-col relative overflow-hidden",
                side === "right"
                    ? "rounded-r-lg border-l-4 border-amber-300/70"
                    : "rounded-l-lg border-r-4 border-amber-300/70"
            )}
        >
            {/* 页面装饰角 */}
            <div
                className={cn(
                    "absolute top-0 w-20 h-20 bg-gradient-to-bl from-cyan-200/30 to-transparent pointer-events-none",
                    side === "right" ? "right-0" : "left-0"
                )}
            />
            <div
                className={cn(
                    "absolute bottom-0 w-20 h-20 bg-gradient-to-tr from-amber-200/25 to-transparent pointer-events-none",
                    side === "right" ? "left-0" : "right-0"
                )}
            />

            {/* 页头 */}
            <div className="shrink-0 bg-slate-100/70 p-4 sm:p-6 border-b border-cyan-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border-2 border-amber-300/70 shadow-sm bg-amber-100 flex items-center justify-center">
                            {member.avatar ? (
                                <img 
                                    src={member.avatar} 
                                    alt={member.name} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-amber-100 flex items-center justify-center">
                                    <User className="h-6 w-6 sm:h-7 sm:w-7 text-amber-700" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-800">
                                {member.name}
                            </h2>
                            <p className="text-xs text-slate-500 font-serif mt-0.5">
                                {member.generation ? `第 ${member.generation} 世` : "世代未知"}
                                {member.sibling_order ? ` · 行 ${member.sibling_order}` : ""}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-1.5">
                        {member.gender && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    "font-serif text-[10px] px-1.5",
                                    member.gender === "男"
                                        ? "border-blue-200 text-blue-700 bg-blue-50"
                                        : "border-pink-200 text-pink-700 bg-pink-50"
                                )}
                            >
                                {member.gender}
                            </Badge>
                        )}
                        {member.is_alive ? (
                            <Badge
                                variant="outline"
                                className="border-green-200 text-green-700 bg-green-50 font-serif text-[10px] px-1.5"
                            >
                                在世
                            </Badge>
                        ) : (
                            <Badge
                                variant="outline"
                                className="border-slate-300 text-slate-500 bg-slate-100 font-serif text-[10px] px-1.5"
                            >
                                已故
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* 页面内容 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 font-serif">
                {/* 基本信息网格 */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            父亲
                        </span>
                        <p className="text-sm text-slate-700">
                            {member.father_name || "未记录"}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            配偶
                        </span>
                        <p className="text-sm text-slate-700">
                            {member.spouse || "未记录"}
                        </p>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            生辰
                        </span>
                        <p className="text-sm text-slate-700">
                            {formatDate(member.birthday)}
                        </p>
                    </div>
                    {!member.is_alive && (
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                卒年
                            </span>
                            <p className="text-sm text-slate-700">
                                {formatDate(member.death_date)}
                            </p>
                        </div>
                    )}
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            年龄
                        </span>
                        <p className="text-sm text-slate-700">{ageText}</p>
                    </div>
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            生肖
                        </span>
                        <p className="text-sm text-slate-700">{zodiacText}</p>
                    </div>
                    {member.residence_place && (
                        <div className="space-y-0.5 col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                居住地
                            </span>
                            <p className="text-sm text-slate-700">{member.residence_place}</p>
                        </div>
                    )}
                    {member.official_position && (
                        <div className="space-y-0.5 col-span-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                官职/头衔
                            </span>
                            <p className="text-sm font-medium text-slate-800">
                                {member.official_position}
                            </p>
                        </div>
                    )}
                    <div className="space-y-0.5 col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            兄弟姐妹
                        </span>
                        {siblings.length === 0 ? (
                            <p className="text-sm text-slate-500">未记录</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {siblings.map((sibling) => (
                                    <span key={sibling.id} className="px-2 py-1 rounded-md bg-slate-100 text-xs text-slate-700">
                                        {sibling.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-0.5 col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            子女
                        </span>
                        {children.length === 0 ? (
                            <p className="text-sm text-slate-500">未记录</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {children.map((child) => (
                                    <span key={child.id} className="px-2 py-1 rounded-md bg-slate-100 text-xs text-slate-700">
                                        {child.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 分隔线 */}
                <div className="h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent my-4" />

                {/* 生平事迹 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <ScrollText className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            生平事迹
                        </span>
                    </div>
                    <div className="bg-white/70 rounded-md p-3 sm:p-4 border border-cyan-100">
                        {member.lifeEvents.length > 0 ? (
                            <TimelineView lifeEvents={member.lifeEvents} />
                        ) : (
                            <div className="[&_*]:!text-slate-700">
                                <RichTextViewer
                                    key={member.id}
                                    value={member.remarks}
                                    animate={false}
                                    className="!prose-slate [&_*]:!text-slate-700"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 页脚 */}
            <div className="shrink-0 bg-slate-100/60 px-4 py-2 border-t border-cyan-100 flex items-center justify-center">
                <span className="text-xs text-slate-400 font-serif">
                    第 {pageIndex + 1} 页 / 共 {totalPages} 页
                </span>
            </div>
        </div>
    );
});

export function BiographyBook({ members, allMembers }: BiographyBookProps) {
    // 页面状态: 0 = 空白左页, 1 = 封面, 2-n = 成员页
    const [currentLeftPage, setCurrentLeftPage] = useState(0);
    const [isFlipping, setIsFlipping] = useState(false);
    const [flipProgress, setFlipProgress] = useState(0);
    const [flipDirection, setFlipDirection] = useState<"next" | "prev">("next");

    // 全屏状态
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 搜索状态
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [isMobileView, setIsMobileView] = useState(false);

    const totalPages = members.length;
    const totalDisplayPages = totalPages + 2; // 空白页 + 封面 + 成员页
    const totalIndicatorPages = totalPages + 1; // 封面 + 成员页

    const canGoPrev = currentLeftPage > 0;
    const canGoNext = currentLeftPage < totalDisplayPages - 2;

    const childrenMap = useMemo(() => {
        const map = new Map<number, RelationMember[]>();
        allMembers.forEach((item) => {
            if (item.father_id) {
                const list = map.get(item.father_id) || [];
                list.push(item);
                map.set(item.father_id, list);
            }
        });
        return map;
    }, [allMembers]);

    const siblingsFor = useCallback((member: RelationLike) => {
        const fatherId = member.father_id ?? null;
        if (!fatherId) return [];
        const list = childrenMap.get(fatherId) || [];
        return list.filter((item) => item.id !== member.id);
    }, [childrenMap]);

    const childrenFor = useCallback((member: RelationLike) => {
        return childrenMap.get(member.id) || [];
    }, [childrenMap]);

    const ageTextFor = useCallback((member: RelationLike) => {
        return getLunarAgeText(member.birthday ?? null, member.death_date ?? null);
    }, []);

    const zodiacTextFor = useCallback((member: RelationLike) => {
        if (!member.birthday) return "未记录";
        const year = new Date(member.birthday).getFullYear();
        if (Number.isNaN(year)) return "未记录";
        const zodiac = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
        const index = ((year - 4) % 12 + 12) % 12;
        return zodiac[index] ?? "未记录";
    }, []);
    const formatDate = useCallback((dateStr: string | null) => {
        if (!dateStr) return "-";
        const [y, m, d] = dateStr.split("-");
        return `${y}年${m}月${d}日`;
    }, []);

    // 搜索结果
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const query = searchQuery.trim().toLowerCase();
        return members
            .map((member, index) => ({ member, index }))
            .filter(({ member }) => member.name.toLowerCase().includes(query));
    }, [searchQuery, members]);

    // 跳转到指定页面
    const jumpToDisplayPage = useCallback(
        (displayIndex: number) => {
            if (isFlipping) return;
            const maxLeft = Math.max(0, totalDisplayPages - 2);
            const nextLeft = Math.min(Math.max(displayIndex - 1, 0), maxLeft);
            setCurrentLeftPage(nextLeft);
            setIsSearchOpen(false);
            setSearchQuery("");
        },
        [totalDisplayPages, isFlipping]
    );

    // 翻页动画
    const flipToPage = useCallback(
        (direction: "next" | "prev") => {
            if (isFlipping) return;

            const maxLeft = Math.max(0, totalDisplayPages - 2);
            const targetLeft =
                direction === "next" ? currentLeftPage + 1 : currentLeftPage - 1;
            if (targetLeft < 0 || targetLeft > maxLeft) return;

            if (isMobileView) {
                setCurrentLeftPage(targetLeft);
                return;
            }

            setFlipDirection(direction);
            setIsFlipping(true);
            setFlipProgress(0);

            const duration = 800;
            const startTime = performance.now();

            const animate = (time: number) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easeOut = 1 - Math.pow(1 - progress, 3);
                setFlipProgress(easeOut * 180);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setCurrentLeftPage(targetLeft);
                    setIsFlipping(false);
                    setFlipProgress(0);
                }
            };

            requestAnimationFrame(animate);
        },
        [currentLeftPage, totalDisplayPages, isFlipping, isMobileView]
    );

    // 键盘事件
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (isSearchOpen) {
                if (e.key === "Escape") {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                }
                return;
            }

            if (e.key === "ArrowRight" || e.key === " ") {
                e.preventDefault();
                flipToPage("next");
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                flipToPage("prev");
            } else if ((e.ctrlKey || e.metaKey) && e.key === "f") {
                // Ctrl+F 或 Cmd+F 打开搜索（必须在单独 F 键之前检查）
                e.preventDefault();
                setIsSearchOpen(true);
            } else if (e.key === "f" || e.key === "F") {
                // 单独按 F 键切换全屏
                e.preventDefault();
                toggleFullscreen();
            }
        },
        [flipToPage, isSearchOpen]
    );

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleKeyDown]);

    // 搜索框聚焦
    useEffect(() => {
        if (isSearchOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchOpen]);

    useEffect(() => {
        const media = window.matchMedia("(max-width: 767px)");
        const onChange = () => setIsMobileView(media.matches);
        onChange();
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, []);

    // 全屏切换
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    // 监听全屏变化
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () =>
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // 当前页面内容
    const currentRightPage = currentLeftPage + 1;

    const displayPageContent = useCallback(
        (displayIndex: number) => {
            if (displayIndex === 0) return { type: "blank" as const };
            if (displayIndex === 1) return { type: "cover" as const };
            const memberIndex = displayIndex - 2;
            if (memberIndex < 0 || memberIndex >= totalPages) return null;
            return {
                type: "member" as const,
                member: members[memberIndex],
                memberIndex,
            };
        },
        [members, totalPages]
    );

    const currentRightContent = useMemo(
        () => displayPageContent(currentRightPage),
        [currentRightPage, displayPageContent]
    );

    const currentRightMember = useMemo(() => {
        if (!currentRightContent || currentRightContent.type !== "member") return null;
        return currentRightContent.member;
    }, [currentRightContent]);

    // 页码指示窗口化，避免成员过多时渲染过多圆点
    const indicatorItems = useMemo(() => {
        const activeIndicatorPage = Math.max(0, currentRightPage - 1);
        if (totalIndicatorPages <= 11) {
            return Array.from({ length: totalIndicatorPages }, (_, i) => i);
        }

        const radius = 3;
        const items: Array<number | "left-gap" | "right-gap"> = [0];
        let start = Math.max(1, activeIndicatorPage - radius);
        let end = Math.min(totalIndicatorPages - 2, activeIndicatorPage + radius);

        if (start <= 2) {
            start = 1;
            end = Math.min(totalIndicatorPages - 2, 1 + radius * 2);
        }
        if (end >= totalIndicatorPages - 3) {
            end = totalIndicatorPages - 2;
            start = Math.max(1, end - radius * 2);
        }

        if (start > 1) items.push("left-gap");
        for (let page = start; page <= end; page += 1) items.push(page);
        if (end < totalIndicatorPages - 2) items.push("right-gap");
        items.push(totalIndicatorPages - 1);

        return items;
    }, [currentRightPage, totalIndicatorPages]);

    const readingProgress = useMemo(() => {
        const activeIndicatorPage = Math.max(0, currentRightPage - 1);
        if (totalIndicatorPages <= 1) return 0;
        return (activeIndicatorPage / (totalIndicatorPages - 1)) * 100;
    }, [currentRightPage, totalIndicatorPages]);
    const isCoverSpread = currentLeftPage === 0 && !isFlipping;

    return (
        <div
            ref={containerRef}
            className="relative w-full min-h-[100dvh] bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-950 overflow-hidden"
        >
            {/* 背景装饰 */}
            <div className="absolute inset-0 opacity-5">
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* 顶部工具栏 */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-30">
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-cyan-100/10 hover:bg-cyan-100/20 text-cyan-100/80 hover:text-amber-200 backdrop-blur-sm border border-cyan-100/20"
                    onClick={() => setIsSearchOpen(true)}
                    title="搜索人物 (Ctrl+F)"
                >
                    <Search className="w-5 h-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-cyan-100/10 hover:bg-cyan-100/20 text-cyan-100/80 hover:text-amber-200 backdrop-blur-sm border border-cyan-100/20"
                    onClick={toggleFullscreen}
                    title="全屏 (F)"
                >
                    {isFullscreen ? (
                        <Minimize className="w-5 h-5" />
                    ) : (
                        <Maximize className="w-5 h-5" />
                    )}
                </Button>
            </div>

            {/* 阅读状态 */}
            <div className="absolute top-4 left-4 z-30">
                <div className="rounded-full bg-cyan-100/10 text-cyan-50 backdrop-blur-sm px-3 py-1.5 text-xs border border-cyan-100/20">
                    {currentRightMember
                        ? `第 ${currentRightPage - 1} 页 · ${currentRightMember.name}`
                        : "封面"}
                </div>
            </div>

            {/* 搜索弹窗 */}
            {isSearchOpen && (
                <div className="absolute inset-0 z-40 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
                    <div className="bg-slate-900/95 rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-cyan-200/20">
                        <div className="p-4 border-b border-cyan-200/20 flex items-center gap-3">
                            <Search className="w-5 h-5 text-cyan-200/70" />
                            <Input
                                ref={searchInputRef}
                                type="text"
                                placeholder="输入人物姓名..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent border-none text-cyan-50 placeholder:text-cyan-100/35 focus-visible:ring-0"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-8 h-8 text-cyan-200/70 hover:text-amber-200"
                                onClick={() => {
                                    setIsSearchOpen(false);
                                    setSearchQuery("");
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {searchQuery.trim() && searchResults.length === 0 ? (
                                <div className="p-4 text-center text-cyan-100/55">
                                    未找到匹配的人物
                                </div>
                            ) : (
                                searchResults.map(({ member, index }) => (
                                    <button
                                        key={member.id}
                                        className="w-full px-4 py-3 text-left hover:bg-cyan-900/40 transition-colors flex items-center gap-3"
                                        onClick={() => jumpToDisplayPage(index + 2)}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-amber-900/50 flex items-center justify-center">
                                            <User className="w-4 h-4 text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium">{member.name}</p>
                                            <p className="text-xs text-cyan-100/55">
                                                {member.generation
                                                    ? `第 ${member.generation} 世`
                                                    : "世代未知"}
                                                {" · "}第 {index + 1} 页
                                            </p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 书籍容器 */}
            <div className="relative flex items-center justify-center h-full p-3 sm:p-8 pt-20 sm:pt-8">
                <div
                    className={cn(
                        "relative w-full",
                        isMobileView ? "max-w-[min(92vw,440px)]" : "max-w-[60vw]"
                    )}
                    style={{ perspective: isMobileView ? "none" : "2400px" }}
                >
                    {isMobileView ? (
                        <div className="relative aspect-[3/4] w-full">
                            <div className="absolute inset-0 w-full h-full">
                                {renderDisplayPage(
                                    displayPageContent(currentRightPage),
                                    "right",
                                    formatDate,
                                    siblingsFor,
                                    childrenFor,
                                    ageTextFor,
                                    zodiacTextFor,
                                    totalPages
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 书籍阴影/书脊 */}
                            <div
                                className={cn(
                                    "absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-4 bg-gradient-to-r from-slate-950 via-cyan-950 to-slate-900 shadow-lg z-10 transition-opacity",
                                    isCoverSpread && "opacity-0"
                                )}
                            />

                            {/* 书籍主体 */}
                            <div
                                className="relative aspect-[3/2] w-full"
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                {/* 底层：翻页后显示的目标页 */}
                                {isFlipping && flipDirection === "next" && (
                                    <div className="absolute inset-y-0 right-0 w-1/2 h-full" style={{ transform: "translateZ(-1px)" }}>
                                        {renderDisplayPage(
                                            displayPageContent(currentLeftPage + 2),
                                            "right",
                                            formatDate,
                                            siblingsFor,
                                            childrenFor,
                                            ageTextFor,
                                            zodiacTextFor,
                                            totalPages
                                        )}
                                    </div>
                                )}
                                {isFlipping && flipDirection === "prev" && (
                                    <div className="absolute inset-y-0 left-0 w-1/2 h-full" style={{ transform: "translateZ(-1px)" }}>
                                        {renderDisplayPage(
                                            displayPageContent(currentLeftPage - 1),
                                            "left",
                                            formatDate,
                                            siblingsFor,
                                            childrenFor,
                                            ageTextFor,
                                            zodiacTextFor,
                                            totalPages
                                        )}
                                    </div>
                                )}

                                {/* 静态页 */}
                                {!isFlipping || flipDirection === "next" ? (
                                    currentLeftPage > 0 && (
                                        <div className="absolute inset-y-0 left-0 w-1/2 h-full">
                                            {renderDisplayPage(
                                                displayPageContent(currentLeftPage),
                                                "left",
                                                formatDate,
                                                siblingsFor,
                                                childrenFor,
                                                ageTextFor,
                                                zodiacTextFor,
                                                totalPages
                                            )}
                                        </div>
                                    )
                                ) : null}
                                {!isFlipping || flipDirection === "prev" ? (
                                    <div
                                        className={cn(
                                            "absolute inset-y-0 h-full",
                                            isCoverSpread ? "left-1/2 -translate-x-1/2 w-full" : "right-0 w-1/2"
                                        )}
                                    >
                                        {renderDisplayPage(
                                            displayPageContent(currentRightPage),
                                            "right",
                                            formatDate,
                                            siblingsFor,
                                            childrenFor,
                                            ageTextFor,
                                            zodiacTextFor,
                                            totalPages
                                        )}
                                    </div>
                                ) : null}

                                {/* 翻动的页面 */}
                                {isFlipping && (
                                    <div
                                        className={cn(
                                            "absolute inset-y-0 w-1/2 h-full",
                                            flipDirection === "next" ? "right-0 origin-left" : "left-0 origin-right"
                                        )}
                                        style={{
                                            transformStyle: "preserve-3d",
                                            transform:
                                                flipDirection === "next"
                                                    ? `rotateY(-${flipProgress}deg)`
                                                    : `rotateY(${flipProgress}deg)`,
                                        }}
                                    >
                                        {/* 正面 */}
                                        <div
                                            className="absolute inset-0 w-full h-full"
                                            style={{ backfaceVisibility: "hidden" }}
                                        >
                                            {renderDisplayPage(
                                                displayPageContent(
                                                    flipDirection === "next" ? currentRightPage : currentLeftPage
                                                ),
                                                flipDirection === "next" ? "right" : "left",
                                                formatDate,
                                                siblingsFor,
                                                childrenFor,
                                                ageTextFor,
                                                zodiacTextFor,
                                                totalPages
                                            )}
                                        </div>

                                        {/* 背面 */}
                                        <div
                                            className={cn(
                                                "absolute inset-0 w-full h-full bg-gradient-to-l from-slate-200 via-slate-100 to-slate-50",
                                                flipDirection === "next" ? "rounded-r-lg" : "rounded-l-lg"
                                            )}
                                            style={{
                                                backfaceVisibility: "hidden",
                                                transform: "rotateY(180deg)",
                                            }}
                                        >
                                            <div
                                                className="absolute inset-0 opacity-30"
                                                style={{
                                                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)`,
                                                }}
                                            />
                                        </div>

                                        {/* 翻页阴影 */}
                                        <div
                                            className={cn(
                                                "absolute inset-y-0 w-16 pointer-events-none",
                                                flipDirection === "next" ? "right-0" : "left-0"
                                            )}
                                            style={{
                                                background:
                                                    flipDirection === "next"
                                                        ? `linear-gradient(to left, rgba(0,0,0,${0.15 * Math.sin((flipProgress * Math.PI) / 180)
                                                            }), transparent)`
                                                        : `linear-gradient(to right, rgba(0,0,0,${0.15 * Math.sin((flipProgress * Math.PI) / 180)
                                                            }), transparent)`,
                                            }}
                                        />
                                    </div>
                                )}

                                {/* 翻页时的动态阴影 */}
                                {isFlipping && (
                                    <div
                                        className={cn(
                                            "absolute inset-y-0 w-1/2 pointer-events-none",
                                            flipDirection === "next" ? "right-0" : "left-0"
                                        )}
                                        style={{
                                            boxShadow:
                                                flipDirection === "next"
                                                    ? `inset ${-20 + flipProgress / 9}px 0 30px rgba(0,0,0,${0.2 * Math.sin((flipProgress * Math.PI) / 180)
                                                        })`
                                                    : `inset ${20 - flipProgress / 9}px 0 30px rgba(0,0,0,${0.2 * Math.sin((flipProgress * Math.PI) / 180)
                                                        })`,
                                        }}
                                    />
                                )}
                            </div>
                        </>
                    )}

                    {/* 翻页按钮 - 桌面端侧边 */}
                    {!isMobileView && canGoPrev && (
                        <div className="absolute inset-y-0 -left-20 hidden sm:flex items-center z-20">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "w-16 h-16 rounded-full bg-cyan-100/10 hover:bg-cyan-100/20 text-cyan-100/80 hover:text-amber-200 transition-all shadow-lg backdrop-blur-sm border border-cyan-100/20",
                                    isFlipping && "opacity-30 cursor-not-allowed"
                                )}
                                onClick={() => flipToPage("prev")}
                                disabled={isFlipping}
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </Button>
                        </div>
                    )}
                    {!isMobileView && canGoNext && (
                        <div className="absolute inset-y-0 -right-20 hidden sm:flex items-center z-20">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "w-16 h-16 rounded-full bg-cyan-100/10 hover:bg-cyan-100/20 text-cyan-100/80 hover:text-amber-200 transition-all shadow-lg backdrop-blur-sm border border-cyan-100/20",
                                    isFlipping && "opacity-30 cursor-not-allowed"
                                )}
                                onClick={() => flipToPage("next")}
                                disabled={isFlipping}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </Button>
                        </div>
                    )}

                    {/* 翻页按钮 - 移动端底部 */}
                    {isMobileView && (
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "flex-1 bg-cyan-100/10 text-cyan-100 hover:text-amber-200 border-cyan-100/25",
                                    isFlipping && "opacity-30 cursor-not-allowed"
                                )}
                                onClick={() => flipToPage("prev")}
                                disabled={isFlipping || !canGoPrev}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                上一页
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "flex-1 bg-cyan-100/10 text-cyan-100 hover:text-amber-200 border-cyan-100/25",
                                    isFlipping && "opacity-30 cursor-not-allowed"
                                )}
                                onClick={() => flipToPage("next")}
                                disabled={isFlipping || !canGoNext}
                            >
                                下一页
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* 页码指示 */}
            <div className={cn("absolute left-1/2 -translate-x-1/2 flex items-center gap-4 z-20", isMobileView ? "bottom-14" : "bottom-6")}>
                <div className="flex gap-1.5">
                    {indicatorItems.map((item, idx) =>
                        typeof item === "number" ? (
                            <button
                                key={item}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all duration-300",
                                    item === Math.max(0, currentRightPage - 1)
                                        ? "bg-amber-400 scale-125"
                                        : "bg-cyan-100/35 hover:bg-cyan-100/55"
                                )}
                                onClick={() => jumpToDisplayPage(item + 1)}
                                title={item === 0 ? "封面" : `第 ${item} 页`}
                            />
                        ) : (
                            <span key={`${item}-${idx}`} className="text-cyan-100/45 text-xs px-0.5">
                                …
                            </span>
                        )
                    )}
                </div>
            </div>

            {/* 阅读进度条 */}
            <div className="absolute bottom-0 inset-x-0 z-20">
                <div className="h-1 bg-cyan-100/15">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(readingProgress, 100))}%` }}
                    />
                </div>
            </div>

            {/* 键盘操作提示 */}
            {currentLeftPage > 0 && currentLeftPage < totalDisplayPages - 2 && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-cyan-100/45 text-xs hidden sm:block z-20">
                    ← → 翻页 · F 全屏 · Ctrl+F 搜索
                </div>
            )}
        </div>
    );
}

// 封面组件（使用 memo 避免不必要的重渲染）
const CoverPage = memo(function CoverPage({
    totalPages,
    side,
}: {
    totalPages: number;
    side: PageSide;
}) {
    return (
        <div
            className={cn(
                "w-full h-full shadow-2xl flex flex-col items-center justify-center p-8 relative overflow-hidden bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-950",
                side === "right" ? "rounded-r-lg" : "rounded-l-lg"
            )}
        >
            <div
                className={cn(
                    "absolute inset-2 border border-amber-200/30 pointer-events-none",
                    side === "right" ? "rounded-r-md" : "rounded-l-md"
                )}
            />
            <div
                className={cn(
                    "absolute inset-4 border border-amber-300/15 pointer-events-none",
                    side === "right" ? "rounded-r-md" : "rounded-l-md"
                )}
            />

            <div
                className="absolute inset-0 opacity-20"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 20% 20%, rgba(251,191,36,0.25), transparent 40%), radial-gradient(circle at 80% 30%, rgba(56,189,248,0.22), transparent 45%), radial-gradient(circle at 50% 80%, rgba(245,158,11,0.18), transparent 35%)",
                }}
            />

            <div
                className={cn(
                    "absolute inset-y-0 w-7 bg-gradient-to-r from-black/45 to-transparent",
                    side === "right" ? "left-0" : "right-0 rotate-180"
                )}
            />

            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-48 border border-amber-300/20 rounded-full pointer-events-none" />
            <div className="absolute top-14 left-1/2 -translate-x-1/2 w-40 h-40 border border-amber-200/15 rounded-full pointer-events-none" />

            {/* 封面标题 */}
            <div className="relative z-10 text-center">
                <div className="mb-8">
                    <BookOpen className="w-16 h-16 sm:w-24 sm:h-24 mx-auto text-amber-200/85" />
                </div>
                <h1 className="text-4xl sm:text-6xl font-serif font-bold text-amber-100 tracking-widest mb-6 drop-shadow-lg">
                    {FAMILY_NAME}生平
                </h1>
                <div className="h-px w-40 mx-auto bg-gradient-to-r from-transparent via-amber-300/70 to-transparent mb-6" />
                <p className="text-amber-100/75 text-lg sm:text-xl font-serif tracking-wide">
                    传承家族记忆 · 铭记先人功德
                </p>
                <p className="text-cyan-100/60 text-sm mt-8 font-serif tracking-wide">
                    共收录 {totalPages} 位族人生平
                </p>
            </div>

            {/* 翻页提示 */}
            <div className="absolute bottom-8 inset-x-0 text-center">
                <p className="text-amber-100/60 text-sm animate-pulse">
                    点击右侧按钮开始阅读 →
                </p>
            </div>
        </div>
    );
});

const BlankPage = memo(function BlankPage({ side }: { side: PageSide }) {
    return (
        <div
            className={cn(
                "w-full h-full shadow-2xl bg-gradient-to-br from-slate-100 via-amber-50 to-slate-50 relative overflow-hidden",
                side === "right" ? "rounded-r-lg" : "rounded-l-lg"
            )}
        >
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(0,0,0,0.03) 28px, rgba(0,0,0,0.03) 29px)",
                }}
            />
        </div>
    );
});

function renderDisplayPage(
    page:
        | { type: "blank" }
        | { type: "cover" }
        | { type: "member"; member: BiographyMember; memberIndex: number }
        | null,
    side: PageSide,
    formatDate: (dateStr: string | null) => string,
    siblingsFor: (member: RelationLike) => RelationMember[],
    childrenFor: (member: RelationLike) => RelationMember[],
    ageTextFor: (member: RelationLike) => string,
    zodiacTextFor: (member: RelationLike) => string,
    totalPages: number
) {
    if (!page) return null;
    if (page.type === "blank") return <BlankPage side={side} />;
    if (page.type === "cover") return <CoverPage totalPages={totalPages} side={side} />;
    return (
        <MemberPage
            member={page.member}
            siblings={siblingsFor(page.member)}
            children={childrenFor(page.member)}
            ageText={ageTextFor(page.member)}
            zodiacText={zodiacTextFor(page.member)}
            pageIndex={page.memberIndex}
            totalPages={totalPages}
            formatDate={formatDate}
            side={side}
        />
    );
}
