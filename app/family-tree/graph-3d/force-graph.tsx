"use client";

import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { FamilyMemberNode } from "../graph/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  RotateCcw,
  Maximize,
  Minimize,
  X,
  Map as MapIcon,
} from "lucide-react";
import SpriteText from "three-spritetext";
import "./three-webgpu-polyfill";
import * as THREE from "three";
import { MemberDetailDialog } from "../member-detail-dialog";
import { TourDialog } from "./tour-dialog";
import { TourControls } from "./tour-controls";

// 动态导入 ForceGraph3D，禁用 SSR
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-muted/10">
      <div className="text-muted-foreground animate-pulse">加载 3D 视图中...</div>
    </div>
  ),
});

interface ForceGraphProps {
  data: FamilyMemberNode[];
}

interface GraphNode extends FamilyMemberNode {
  x?: number;
  y?: number;
  z?: number;
  group?: number;
  // Index signature to satisfy react-force-graph types
  [key: string]: any;
}

interface GraphLink {
  source: number;
  target: number;
  relation: "parent" | "spouse";
}

export function FamilyForceGraph({ data }: ForceGraphProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [instanceKey, setInstanceKey] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setInstanceKey(Math.random().toString(36).substring(7));
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMemberNode | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Tour State
  const [isTourDialogOpen, setIsTourDialogOpen] = useState(false);
  const [tourPath, setTourPath] = useState<FamilyMemberNode[]>([]);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);
  const [isTourPaused, setIsTourPaused] = useState(false);
  const tourTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 监听容器大小变化
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener("resize", updateDimensions);
    document.addEventListener("fullscreenchange", updateDimensions);
    const timer = setTimeout(updateDimensions, 120);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateDimensions);
      document.removeEventListener("fullscreenchange", updateDimensions);
      clearTimeout(timer);
    };
  }, []);

  // 转换数据为 graph 格式
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = data.map((member) => ({
      ...member,
      // 根据代数计算颜色分组，或者其他逻辑
      group: member.generation || 0,
    }));

    const parentLinks: GraphLink[] = data
      .filter((member) => member.father_id)
      .map((member) => ({
        source: member.father_id!,
        target: member.id,
        relation: "parent" as const,
      }));

    const memberIdSet = new Set(data.map((member) => member.id));
    const spouseLinkKeySet = new Set<string>();
    const spouseLinks: GraphLink[] = [];
    data.forEach((member) => {
      if (!member.spouse_id || !memberIdSet.has(member.spouse_id)) return;
      const [a, b] =
        member.id < member.spouse_id
          ? [member.id, member.spouse_id]
          : [member.spouse_id, member.id];
      const key = `${a}-${b}`;
      if (spouseLinkKeySet.has(key)) return;
      spouseLinkKeySet.add(key);
      spouseLinks.push({
        source: a,
        target: b,
        relation: "spouse",
      });
    });

    const links: GraphLink[] = [...parentLinks, ...spouseLinks];

    return { nodes, links };
  }, [data]);

  // Tour Logic
  const startTour = (path: FamilyMemberNode[]) => {
    setTourPath(path);
    setCurrentTourStep(0);
    setIsTourActive(true);
    setIsTourPaused(false);
    // Close detail dialog if open
    setIsDetailOpen(false);
  };

  const stopTour = () => {
    setIsTourActive(false);
    setIsTourPaused(false);
    setTourPath([]);
    setCurrentTourStep(0);
    setHighlightedId(null);
    if (tourTimeoutRef.current) {
      clearTimeout(tourTimeoutRef.current);
    }
  };

  const pauseTour = () => {
    setIsTourPaused(true);
    if (tourTimeoutRef.current) {
      clearTimeout(tourTimeoutRef.current);
    }
  };

  const resumeTour = () => {
    setIsTourPaused(false);
  };

  // Effect to handle tour progression
  useEffect(() => {
    if (!isTourActive || isTourPaused || !fgRef.current) return;

    if (currentTourStep >= tourPath.length) {
      stopTour();
      return;
    }

    const targetMember = tourPath[currentTourStep];
    // Find the node in the internal graph data to get current coordinates
    // Note: react-force-graph modifies the objects in graphData.nodes with x,y,z
    const node = graphData.nodes.find(n => n.id === targetMember.id);

    if (node && node.x !== undefined && node.y !== undefined && node.z !== undefined) {
      setHighlightedId(node.id);

      // Calculate distance for camera
      const distance = 80;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

      fgRef.current.cameraPosition(
        { 
          x: node.x * distRatio, 
          y: node.y * distRatio, 
          z: node.z * distRatio 
        },
        { x: node.x, y: node.y, z: node.z },
        2000 // Transition time (2s)
      );

      // Wait for transition + dwell time
      tourTimeoutRef.current = setTimeout(() => {
        setCurrentTourStep(prev => prev + 1);
      }, 3500); // 2000ms move + 1500ms dwell
    } else {
      // If node not found or coords missing, skip to next
      setCurrentTourStep(prev => prev + 1);
    }

    return () => {
      if (tourTimeoutRef.current) {
        clearTimeout(tourTimeoutRef.current);
      }
    };
  }, [isTourActive, isTourPaused, currentTourStep, tourPath, graphData.nodes]);


  // 搜索功能
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;

    const foundNode = graphData.nodes.find((node) =>
      node.name.includes(searchQuery.trim())
    );

    if (foundNode && fgRef.current) {
      setHighlightedId(foundNode.id);
      
      // 移动相机视角到该节点
      const distance = 100;
      const distRatio = 1 + distance / Math.hypot(foundNode.x || 0, foundNode.y || 0, foundNode.z || 0);

      fgRef.current.cameraPosition(
        {
          x: (foundNode.x || 0) * distRatio,
          y: (foundNode.y || 0) * distRatio,
          z: (foundNode.z || 0) * distRatio,
        }, // new position
        { x: foundNode.x, y: foundNode.y, z: foundNode.z }, // lookAt
        3000 // ms transition duration
      );
    }
  }, [graphData, searchQuery]);

  const clearSearch = () => {
    setSearchQuery("");
    setHighlightedId(null);
  };

  // 重置视图
  const handleResetView = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.cameraPosition({ x: 0, y: 0, z: 600 }, { x: 0, y: 0, z: 0 }, 1000);
      setHighlightedId(null);
    }
  }, []);

  // 全屏切换
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // 获取父亲姓名
  const getFatherName = (fatherId: number | null) => {
    if (!fatherId) return null;
    return data.find((m) => m.id === fatherId)?.name;
  };

  // 星空宇宙主题颜色配置
  const bgColor = "#0a0a1e"; // 深蓝色宇宙背景
  const nodeTextColor = "rgba(255,255,255,0.9)"; // 默认白色文字
  const parentLinkColor = "rgba(100, 149, 237, 0.6)";
  const spouseLinkColor = "rgba(239, 68, 68, 0.95)";
  const parentLineMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color(0x6495ed),
        transparent: true,
        opacity: 0.8,
        linewidth: 1,
      }),
    []
  );
  const spouseLineMaterial = useMemo(
    () =>
      new THREE.LineDashedMaterial({
        color: new THREE.Color(0xef4444),
        transparent: true,
        opacity: 0.95,
        linewidth: 1.2,
        dashSize: 2.2,
        gapSize: 1.4,
      }),
    []
  );
  const getNodeColorByGender = (gender: GraphNode["gender"], highlighted: boolean) => {
    if (highlighted) return 0xfbbf24;
    if (gender === "男") return 0x60a5fa;
    if (gender === "女") return 0xf472b6;
    return 0x94a3b8;
  };
  const getTextColorByGender = (gender: GraphNode["gender"], highlighted: boolean) => {
    if (highlighted) return "#fbbf24";
    if (gender === "男") return "#93c5fd";
    if (gender === "女") return "#f9a8d4";
    return nodeTextColor;
  };
  
  // 复用纹理加载器与缓存，避免节点重绘时重复请求图片
  const textureLoader = useMemo(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = "anonymous";
    return loader;
  }, []);
  const textureCacheRef = useRef<Map<string, THREE.Texture>>(new Map());
  const stars = useMemo(
    () =>
      Array.from({ length: 140 }, (_, index) => ({
        id: index,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2.2 + 0.6,
        duration: Math.random() * 2.6 + 1.8,
        delay: Math.random() * 3.2,
        opacity: Math.random() * 0.55 + 0.25,
      })),
    []
  );
  const circleMaskTexture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
    const mask = new THREE.CanvasTexture(canvas);
    mask.needsUpdate = true;
    return mask;
  }, []);

  if (!mounted) return null;

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full border rounded-lg overflow-hidden bg-background ${
        isFullscreen ? "h-screen border-0 rounded-none" : "h-[calc(100vh-180px)] min-h-[420px] md:h-[calc(100vh-140px)] md:min-h-[600px]"
      }`}
    >
      {/* 顶部工具栏 */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 max-w-[80%]">
        <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm border rounded-md p-1 shadow-sm">
          <Input
            placeholder="搜索姓名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-8 w-40 md:w-56 border-0 focus-visible:ring-0 bg-transparent"
          />
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
          {searchQuery && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clearSearch}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button size="icon" variant="secondary" onClick={handleResetView} title="重置视图">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="secondary" onClick={toggleFullscreen} title={isFullscreen ? "退出全屏" : "全屏"}>
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
        <Button 
          size="icon" 
          variant={isTourActive ? "default" : "secondary"} 
          onClick={() => setIsTourDialogOpen(true)} 
          title="自动巡游"
          className={isTourActive ? "animate-pulse" : ""}
        >
          <MapIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* 星空闪烁背景层，不影响图谱交互 */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        {stars.map((star) => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white star-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* 3D 图表 */}
      {dimensions.width > 0 && instanceKey && (
        <ForceGraph3D
          key={instanceKey}
          ref={fgRef}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor={bgColor}
        nodeLabel="name"
        nodeRelSize={6}
        linkOpacity={0.6}
        linkColor={(link: any) => (link.relation === "spouse" ? spouseLinkColor : parentLinkColor)}
        linkWidth={(link: any) => (link.relation === "spouse" ? 0 : 0.5)}
        linkDirectionalParticles={(link: any) => (link.relation === "spouse" ? 0 : 4)}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.02}
        linkCurvature={(link: any) => (link.relation === "spouse" ? 0 : 0.1)}
        linkMaterial={parentLineMaterial}
        linkThreeObjectExtend
        linkThreeObject={(link: any) => {
          if (link.relation !== "spouse") return new THREE.Object3D();
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)
          );
          const line = new THREE.Line(geometry, spouseLineMaterial);
          line.computeLineDistances();
          return line;
        }}
        linkPositionUpdate={(obj: any, { start, end }: any, link: any) => {
          if (link.relation !== "spouse" || !(obj instanceof THREE.Line)) return false;
          const line = obj as THREE.Line;
          const position = line.geometry.getAttribute("position") as THREE.BufferAttribute;
          position.setXYZ(0, start.x, start.y, start.z);
          position.setXYZ(1, end.x, end.y, end.z);
          position.needsUpdate = true;
          line.computeLineDistances();
          return true;
        }}
        
        // 节点渲染 - 星空宇宙风格
        nodeThreeObjectExtend={false}
        nodeThreeObject={(node: any) => {
          const group = new THREE.Group();
          const nodeColor = getNodeColorByGender(node.gender, node.id === highlightedId);

          if (node.avatar) {
            let texture = textureCacheRef.current.get(node.avatar);
            if (!texture) {
              texture = textureLoader.load(node.avatar, (loaded) => {
                const image = loaded.image as HTMLImageElement | undefined;
                if (!image?.width || !image?.height) return;

                // 居中裁剪为正方形区域，避免非 1:1 头像被拉伸
                if (image.width > image.height) {
                  loaded.repeat.set(image.height / image.width, 1);
                  loaded.offset.set((1 - loaded.repeat.x) / 2, 0);
                } else if (image.height > image.width) {
                  loaded.repeat.set(1, image.width / image.height);
                  loaded.offset.set(0, (1 - loaded.repeat.y) / 2);
                } else {
                  loaded.repeat.set(1, 1);
                  loaded.offset.set(0, 0);
                }
                loaded.needsUpdate = true;
              });
              texture.colorSpace = THREE.SRGBColorSpace;
              textureCacheRef.current.set(node.avatar, texture);
            }

            // 使用 Sprite + alphaMap 将头像裁切为圆形
            const avatarMaterial = new THREE.SpriteMaterial({
              map: texture,
              alphaMap: circleMaskTexture,
              transparent: true,
            });
            const avatarSprite = new THREE.Sprite(avatarMaterial);
            const baseSize = 14;
            avatarSprite.scale.set(baseSize, baseSize, 1);

            // 头像外环按性别区分颜色
            const ringGeometry = new THREE.RingGeometry(7.2, 8.4, 40);
            const ringMaterial = new THREE.MeshBasicMaterial({
              color: nodeColor,
              transparent: true,
              opacity: 0.95,
              side: THREE.DoubleSide,
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.z = -0.1;
            group.add(ring);
            group.add(avatarSprite);
          } else {
            // 无头像时显示默认节点
            const geometry = new THREE.SphereGeometry(5, 24, 24);
            const material = new THREE.MeshPhongMaterial({
              color: nodeColor,
              shininess: 60,
              specular: 0xffffff,
            });
            const sphere = new THREE.Mesh(geometry, material);
            group.add(sphere);
          }
          
          // 创建文字标签
          const sprite = new SpriteText(node.name);
          sprite.color = getTextColorByGender(node.gender, node.id === highlightedId);
          sprite.textHeight = 4.2;
          sprite.padding = 1.2;
          sprite.backgroundColor = "rgba(10, 10, 30, 0.7)";
          sprite.borderRadius = 4;
          sprite.center = new THREE.Vector2(0.5, 0); // 底部居中锚点
          sprite.position.y = 8; // 头像上方留出间距
          group.add(sprite);
          
          return group;
        }}
        
        // 点击事件
        onNodeClick={(node: any) => {
          if (isTourActive) return; // Disable manual click during tour
          setSelectedMember(node);
          setIsDetailOpen(true);
          
          // 聚焦点击的节点
          const distance = 80;
          const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
          fgRef.current?.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            { x: node.x, y: node.y, z: node.z },
            1500
          );
        }}
      />
      )}

      {/* Tour UI Components */}
      <TourDialog
        isOpen={isTourDialogOpen}
        onOpenChange={setIsTourDialogOpen}
        members={data}
        onStartTour={startTour}
      />

      {isTourActive && (
        <TourControls
          currentStep={currentTourStep}
          totalSteps={tourPath.length}
          currentMember={tourPath[currentTourStep]}
          nextMember={tourPath[currentTourStep + 1] || null}
          isPaused={isTourPaused}
          onPause={pauseTour}
          onResume={resumeTour}
          onStop={stopTour}
        />
      )}

      <MemberDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        member={selectedMember}
        fatherName={getFatherName(selectedMember?.father_id || null)}
        members={data}
        onSelectMember={(member) => {
          setSelectedMember(member);
          setIsDetailOpen(true);
        }}
      />

      <style jsx>{`
        .star-twinkle {
          animation-name: twinkle;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          will-change: opacity, transform;
          filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.55));
        }

        @keyframes twinkle {
          0% {
            opacity: 0.15;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.35);
          }
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
