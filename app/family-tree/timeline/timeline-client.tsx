"use client";

import * as React from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeTypes,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Search, RotateCcw, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TimelineNode, type TimelineNodeData } from "./timeline-node";
import { YearNode, type YearNodeData } from "./year-node";

interface TimelineMember {
  id: number;
  name: string;
  birthday: string | null;
  death_date: string | null;
  generation: number | null;
}

interface TimelineClientProps {
  initialData: TimelineMember[];
}

const nodeTypes = {
  timelineMember: TimelineNode,
  yearMarker: YearNode,
} as unknown as NodeTypes;

const PIXELS_PER_YEAR = 18;
const ROW_HEIGHT = 50;
const TRACK_GAP = 2;
const HEADER_HEIGHT = 40;
const YEAR_INTERVAL = 10;

interface TimelineLayout {
  nodes: Node[];
  memberNodes: Node[];
  minYear: number;
  maxYear: number;
  trackCount: number;
}

function buildTimelineLayout(initialData: TimelineMember[]): TimelineLayout {
  const currentYear = new Date().getFullYear();
  const members = initialData
    .filter((m) => m.birthday)
    .map((m) => {
      const startYear = new Date(m.birthday!).getFullYear();
      if (!Number.isFinite(startYear)) return null;

      let endYear = currentYear;
      const isAlive = !m.death_date && currentYear - startYear < 100;

      if (m.death_date) {
        const deathYear = new Date(m.death_date).getFullYear();
        endYear = Number.isFinite(deathYear) ? deathYear : currentYear;
      } else if (!isAlive) {
        endYear = startYear + 80;
      }

      if (endYear < startYear) endYear = startYear + 1;

      return {
        ...m,
        startYear,
        endYear,
        isAlive,
      };
    })
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .sort((a, b) => a.startYear - b.startYear);

  if (members.length === 0) {
    return {
      nodes: [],
      memberNodes: [],
      minYear: currentYear,
      maxYear: currentYear,
      trackCount: 0,
    };
  }

  const minYear = Math.min(...members.map((m) => m.startYear)) - 10;
  const maxYear = Math.max(...members.map((m) => m.endYear)) + 10;

  const tracks: number[] = [];
  const memberNodes: Node[] = members.map((member) => {
    let trackIndex = -1;

    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i] + TRACK_GAP <= member.startYear) {
        trackIndex = i;
        tracks[i] = member.endYear;
        break;
      }
    }

    if (trackIndex === -1) {
      trackIndex = tracks.length;
      tracks.push(member.endYear);
    }

    const width = (member.endYear - member.startYear) * PIXELS_PER_YEAR;
    const x = (member.startYear - minYear) * PIXELS_PER_YEAR;
    const y = trackIndex * ROW_HEIGHT + HEADER_HEIGHT;

    return {
      id: member.id.toString(),
      type: "timelineMember",
      position: { x, y },
      data: {
        name: member.name,
        startYear: member.startYear,
        endYear: member.endYear,
        isAlive: member.isAlive,
        width: Math.max(width, PIXELS_PER_YEAR / 2),
      } as TimelineNodeData,
    };
  });

  const contentHeight = Math.max(tracks.length * ROW_HEIGHT + HEADER_HEIGHT + 80, 400);
  const yearNodes: Node[] = [];

  for (
    let year = Math.floor(minYear / YEAR_INTERVAL) * YEAR_INTERVAL;
    year <= maxYear;
    year += YEAR_INTERVAL
  ) {
    yearNodes.push({
      id: `year-${year}`,
      type: "yearMarker",
      position: {
        x: (year - minYear) * PIXELS_PER_YEAR,
        y: -20,
      },
      data: { year, lineHeight: contentHeight } as YearNodeData,
      selectable: false,
      draggable: false,
      zIndex: -1,
    });
  }

  return {
    nodes: [...yearNodes, ...memberNodes],
    memberNodes,
    minYear,
    maxYear,
    trackCount: tracks.length,
  };
}

function TimelineFlow({ initialData }: TimelineClientProps) {
  const reactFlowInstance = useReactFlow();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeMatchIndex, setActiveMatchIndex] = React.useState(0);

  const layout = React.useMemo(() => buildTimelineLayout(initialData), [initialData]);
  const emptyEdges = React.useMemo<Edge[]>(() => [], []);

  const memberNodeMap = React.useMemo(() => {
    const map = new Map<string, Node>();
    for (const node of layout.memberNodes) {
      map.set(node.id, node);
    }
    return map;
  }, [layout.memberNodes]);

  const matchedIds = React.useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return [] as string[];

    return layout.memberNodes
      .filter((n) => (n.data as TimelineNodeData).name.toLowerCase().includes(keyword))
      .map((n) => n.id);
  }, [layout.memberNodes, searchQuery]);

  React.useEffect(() => {
    if (activeMatchIndex >= matchedIds.length) {
      setActiveMatchIndex(0);
    }
  }, [activeMatchIndex, matchedIds.length]);

  const activeMatchId = matchedIds.length > 0 ? matchedIds[activeMatchIndex] : null;

  const displayNodes = React.useMemo(() => {
    if (!searchQuery.trim()) return layout.nodes;

    const matchedSet = new Set(matchedIds);
    return layout.nodes.map((node) => {
      if (node.type !== "timelineMember") return node;
      const data = node.data as TimelineNodeData;
      return {
        ...node,
        data: {
          ...data,
          isMatched: matchedSet.has(node.id),
          isActiveMatch: activeMatchId === node.id,
        } as TimelineNodeData,
      };
    });
  }, [layout.nodes, matchedIds, activeMatchId, searchQuery]);

  const focusNodeById = React.useCallback(
    (nodeId: string) => {
      const node = memberNodeMap.get(nodeId);
      if (!node) return;

      const nodeData = node.data as TimelineNodeData;
      reactFlowInstance.setCenter(
        node.position.x + nodeData.width / 2,
        node.position.y,
        { zoom: 1, duration: 700 }
      );
    },
    [memberNodeMap, reactFlowInstance]
  );

  React.useEffect(() => {
    if (layout.nodes.length === 0) return;
    const raf = requestAnimationFrame(() => {
      reactFlowInstance.fitView({ padding: 0.12, duration: 650 });
    });
    return () => cancelAnimationFrame(raf);
  }, [layout.nodes.length, reactFlowInstance]);

  const onSearch = React.useCallback(() => {
    if (matchedIds.length === 0) return;
    focusNodeById(matchedIds[activeMatchIndex] || matchedIds[0]);
  }, [matchedIds, activeMatchIndex, focusNodeById]);

  const goToNextMatch = React.useCallback(() => {
    if (matchedIds.length === 0) return;
    const next = (activeMatchIndex + 1) % matchedIds.length;
    setActiveMatchIndex(next);
    focusNodeById(matchedIds[next]);
  }, [matchedIds, activeMatchIndex, focusNodeById]);

  const goToPrevMatch = React.useCallback(() => {
    if (matchedIds.length === 0) return;
    const prev = (activeMatchIndex - 1 + matchedIds.length) % matchedIds.length;
    setActiveMatchIndex(prev);
    focusNodeById(matchedIds[prev]);
  }, [matchedIds, activeMatchIndex, focusNodeById]);

  const onReset = React.useCallback(() => {
    reactFlowInstance.fitView({ duration: 500, padding: 0.12 });
  }, [reactFlowInstance]);

  const clearSearch = React.useCallback(() => {
    setSearchQuery("");
    setActiveMatchIndex(0);
  }, []);

  return (
    <div className="w-full h-[calc(100vh-140px)] bg-background border rounded-lg overflow-hidden">
      <ReactFlow
        nodes={displayNodes}
        edges={emptyEdges}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={PIXELS_PER_YEAR * YEAR_INTERVAL}
          size={1}
          className="opacity-20"
        />
        <Controls
          showInteractive={false}
          className="!bg-background !border !border-border !shadow-md [&>button]:!bg-background [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted [&>button>svg]:!fill-current"
        />
        <Panel position="top-left" className="flex gap-2">
          <div className="flex flex-wrap gap-2 bg-background/90 p-2 rounded-md border shadow-sm items-center">
            <Input
              placeholder="搜索成员..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              className="w-48 h-8"
            />
            <Button size="sm" variant="ghost" onClick={onSearch} className="h-8 w-8 p-0" disabled={matchedIds.length === 0}>
              <Search className="h-4 w-4" />
            </Button>
            {searchQuery && (
              <Button size="sm" variant="ghost" onClick={clearSearch} className="h-8 w-8 p-0" title="清空搜索">
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={goToPrevMatch} className="h-8 w-8 p-0" disabled={matchedIds.length === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={goToNextMatch} className="h-8 w-8 p-0" disabled={matchedIds.length === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="text-xs text-muted-foreground min-w-24 text-center">
              {searchQuery.trim() ? `${matchedIds.length} 个匹配` : `${layout.trackCount} 条时间轨道`}
            </div>
            <Button size="sm" variant="outline" onClick={onReset} className="h-8 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" /> 重置
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function TimelineClient(props: TimelineClientProps) {
  return (
    <ReactFlowProvider>
      <TimelineFlow {...props} />
    </ReactFlowProvider>
  );
}
