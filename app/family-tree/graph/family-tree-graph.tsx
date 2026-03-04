"use client";

import { useCallback, useMemo, useState, useRef, useEffect, memo, type MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  type Node,
  type Edge,
  BackgroundVariant,
  type NodeTypes,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RotateCcw,
  Maximize,
  Minimize,
  Search,
  X,
  Download,
  ChevronsDown,
  Lock,
  Unlock,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toPng } from "html-to-image";
import { FamilyMemberNodeType, type FamilyNodeData } from "./family-node";
import { GenerationNodeType } from "./generation-node";
import { toChineseNum } from "./utils/chinese-num";
import { getBranchBaseColor, generateBranchColor, type HSLColor } from "./utils/colors";
import { FlowingEdge } from "./flowing-edge";
import { createGraphChildMember, createGraphSpouseMember, deleteGraphMember, reorderGraphSiblings, type FamilyMemberNode } from "./actions";
import dagre from "@dagrejs/dagre";

import { MemberDetailDialog } from "../member-detail-dialog";
import { findShortestPath } from "../graph-3d/tour-utils";
import { MemberSelect } from "../graph-3d/member-select";
import { describeRelationship } from "../relationship/relationship-utils";

const nodeTypes: NodeTypes = {
  familyMember: FamilyMemberNodeType,
  generationLabel: GenerationNodeType,
};

const edgeTypes = {
  flowing: FlowingEdge,
};

interface FamilyTreeGraphProps {
  initialData: FamilyMemberNode[];
  readonly?: boolean;
}

interface FamilyTreeGraphInnerProps {
  initialData: FamilyMemberNode[];
  onMemberClick?: (member: FamilyMemberNode) => void;
  readonly?: boolean;
}

// 布局常量
const NODE_WIDTH = 160;
const NODE_HEIGHT = 120; // 增加高度以容纳配偶信息
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 120;

// 使用 dagre 进行自动布局，避免连线交叉
function getLayoutedElements(
  members: FamilyMemberNode[],
  childrenMap: Map<number, number[]>,
  collapsedIds: Set<number>,
  expandedSpouseIds: Set<number>,
  highlightedId: number | null,
  highlightedPathIds: Set<string>,
  onToggleCollapse?: (id: number) => void,
  onToggleSpouse?: (id: number) => void,
  onAddChild?: (member: FamilyMemberNode) => void,
  onAddSpouse?: (member: FamilyMemberNode) => void,
  onDeleteMember?: (member: FamilyMemberNode) => void,
  hideNodeActions?: boolean
): { nodes: Node[]; edges: Edge[] } {
  if (!members.length) {
    return { nodes: [], edges: [] };
  }

  // 1. 确定可见节点
  const visibleMembers: FamilyMemberNode[] = [];
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const hasHighlight = highlightedId !== null;

  const spousePartnerMap = new Map<number, number>();
  members.forEach((m) => {
    if (m.spouse_id && memberMap.has(m.spouse_id)) {
      spousePartnerMap.set(m.id, m.spouse_id);
    }
  });

  const spouseLinkedNodeIds = new Set<number>();
  members.forEach((m) => {
    const isSpouseLinked = !!m.spouse_id && !m.father_id && memberMap.has(m.spouse_id);
    if (isSpouseLinked) {
      spouseLinkedNodeIds.add(m.id);
    }
  });

  const isSpouseVisible = (id: number) => {
    if (!spouseLinkedNodeIds.has(id)) return true;
    const partnerId = spousePartnerMap.get(id);
    return expandedSpouseIds.has(id) || (partnerId ? expandedSpouseIds.has(partnerId) : false);
  };

  // 找到根节点（没有父亲，或父亲不在当前列表中）
  const roots = members.filter(
    (m) => (!m.father_id || !memberMap.has(m.father_id)) && !spouseLinkedNodeIds.has(m.id)
  );

  // 获取根节点的代数，用于计算相对代数偏移量
  const rootGeneration = roots.length > 0 ? (roots[0].generation || 1) : 1;

  // 2. 计算支系颜色
  // 逻辑：找到根节点的直接子节点（各大房头），分配颜色，并传递给后代
  // 存储的是 HSL 对象，方便后续计算梯度
  const memberBaseColorMap = new Map<number, HSLColor>();

  // 辅助函数：递归设置颜色
  const setDescendantColors = (memberId: number, color: HSLColor) => {
    memberBaseColorMap.set(memberId, color);
    const children = childrenMap.get(memberId) || [];
    children.forEach(childId => {
      if (!memberBaseColorMap.has(childId)) {
        setDescendantColors(childId, color);
      }
    });
  };

  // 遍历所有根节点
  roots.forEach(root => {
    const children = childrenMap.get(root.id) || [];
    children.forEach((childId, index) => {
      const baseColor = getBranchBaseColor(index);
      setDescendantColors(childId, baseColor);
    });
  });

  // BFS 遍历生成可见列表
  const queue = [...roots];
  const visited = new Set<number>();

  while (queue.length > 0) {
    const member = queue.shift()!;
    if (visited.has(member.id)) continue;

    visited.add(member.id);
    visibleMembers.push(member);

    // 如果未折叠，则添加子节点
    if (!collapsedIds.has(member.id)) {
      const childIds = childrenMap.get(member.id) || [];
      childIds.forEach((childId) => {
        const child = memberMap.get(childId);
        if (child) {
          queue.push(child);
        }
      });
    }
  }

  // 将“已展开可见的配偶节点”作为额外起点继续遍历，确保其子女也能显示
  const spouseQueue = members.filter(
    (member) => spouseLinkedNodeIds.has(member.id) && isSpouseVisible(member.id)
  );

  while (spouseQueue.length > 0) {
    const member = spouseQueue.shift()!;
    if (visited.has(member.id)) continue;

    visited.add(member.id);
    visibleMembers.push(member);

    if (!collapsedIds.has(member.id)) {
      const childIds = childrenMap.get(member.id) || [];
      childIds.forEach((childId) => {
        const child = memberMap.get(childId);
        if (child) {
          spouseQueue.push(child);
        }
      });
    }
  }

  // 3. 创建 dagre 图
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: "TB", // 从上到下布局
    nodesep: HORIZONTAL_GAP, // 同层节点间距
    ranksep: VERTICAL_GAP, // 层间距
    // align: "UL", // Removed this to enable center balancing
  });

  // 添加可见节点到 dagre 图
  visibleMembers.forEach((member) => {
    dagreGraph.setNode(String(member.id), {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // 添加可见边到 dagre 图
  const edges: Edge[] = [];
  visibleMembers.forEach((member) => {
    if (member.father_id) {
      // 确保父节点也在可见列表中
      const fatherExists = visibleMembers.some((m) => m.id === member.father_id);
      if (fatherExists) {
        dagreGraph.setEdge(String(member.father_id), String(member.id));

        // 获取连线颜色：使用支系的【基准色】（最深色），作为树干颜色
        const baseColor = memberBaseColorMap.get(member.id);
        const edgeColor = baseColor
          ? generateBranchColor(baseColor, 0) // 始终使用第0级（最深）颜色
          : "hsl(var(--muted-foreground))";

        edges.push({
          id: `e${member.father_id}-${member.id}`,
          source: String(member.father_id),
          target: String(member.id),
          type: "flowing",
          animated: false,
          style: {
            stroke: edgeColor,
            strokeWidth: 2,
            opacity: 0.6 // 稍微降低透明度，让文字更突出
          },
        });
      }
    }
  });

  // 婚姻线：优先 spouse_id，其次兼容 spouse 姓名匹配
  const spouseEdgeKeys = new Set<string>();
  const visibleMemberMap = new Map(visibleMembers.map((m) => [m.id, m]));
  const nameToMembersMap = new Map<string, FamilyMemberNode[]>();
  visibleMembers.forEach((m) => {
    const list = nameToMembersMap.get(m.name) || [];
    list.push(m);
    nameToMembersMap.set(m.name, list);
  });

  visibleMembers.forEach((member) => {
    let spouseMember: FamilyMemberNode | undefined;

    if (member.spouse_id) {
      spouseMember = visibleMemberMap.get(member.spouse_id);
    } else if (member.spouse) {
      const candidates = nameToMembersMap.get(member.spouse) || [];
      spouseMember = candidates[0];
    }

    if (!spouseMember || spouseMember.id === member.id) return;

    const [a, b] =
      member.id < spouseMember.id
        ? [member.id, spouseMember.id]
        : [spouseMember.id, member.id];
    const edgeKey = `${a}-${b}`;
    if (spouseEdgeKeys.has(edgeKey)) return;
    spouseEdgeKeys.add(edgeKey);

    edges.push({
      id: `sp-${edgeKey}`,
      source: String(a),
      target: String(b),
      type: "straight",
      style: {
        stroke: "#ec4899",
        strokeWidth: 2,
        opacity: 0.7,
      },
      zIndex: 0,
      selectable: false,
    });
  });

  // 计算布局
  dagre.layout(dagreGraph);

  // 4. 转换为 React Flow 节点
  let minX = Infinity;
  const generationYMap = new Map<number, { totalY: number; count: number }>();
  const positionedMap = new Map<number, { x: number; y: number; centerY: number }>();
  const SPOUSE_OFFSET_X = NODE_WIDTH + 44;
  const MIN_GAP_X = NODE_WIDTH + 36;

  visibleMembers.forEach((member) => {
    const nodeWithPosition = dagreGraph.node(String(member.id));
    if (!nodeWithPosition) return;
    const x = nodeWithPosition.x - NODE_WIDTH / 2;
    const y = nodeWithPosition.y - NODE_HEIGHT / 2;
    positionedMap.set(member.id, { x, y, centerY: nodeWithPosition.y });
  });

  // 配偶节点与主节点同级（先贴主节点右侧）
  visibleMembers.forEach((member) => {
    if (!spouseLinkedNodeIds.has(member.id)) return;
    const partnerId = spousePartnerMap.get(member.id);
    if (!partnerId) return;
    const partnerPos = positionedMap.get(partnerId);
    const spousePos = positionedMap.get(member.id);
    if (!partnerPos || !spousePos) return;
    const deltaY = partnerPos.y - spousePos.y;
    positionedMap.set(member.id, {
      ...spousePos,
      x: partnerPos.x + SPOUSE_OFFSET_X,
      y: partnerPos.y,
      centerY: partnerPos.centerY,
    });

    // 配偶节点改到同级后，其子树要同步平移，否则子女会停留在原始高位（看起来跑到第一行）
    if (Math.abs(deltaY) > 0.1) {
      const descendantQueue = [...(childrenMap.get(member.id) || [])];
      const seenDescendants = new Set<number>();
      while (descendantQueue.length > 0) {
        const childId = descendantQueue.shift()!;
        if (seenDescendants.has(childId)) continue;
        seenDescendants.add(childId);

        const childPos = positionedMap.get(childId);
        if (childPos) {
          positionedMap.set(childId, {
            ...childPos,
            y: childPos.y + deltaY,
            centerY: childPos.centerY + deltaY,
          });
        }

        const grandChildren = childrenMap.get(childId) || [];
        grandChildren.forEach((id) => descendantQueue.push(id));
      }
    }
  });

  // 方案2：局部重排。按“同一视觉行(Y)”处理，不依赖世代字段（世代可为空）。
  const ROW_THRESHOLD = NODE_HEIGHT * 0.65;
  const expandedSpouseNodes = visibleMembers.filter(
    (m) => spouseLinkedNodeIds.has(m.id) && expandedSpouseIds.has(m.id)
  );

  expandedSpouseNodes.forEach((spouseMember) => {
    const partnerId = spousePartnerMap.get(spouseMember.id);
    if (!partnerId) return;
    const partnerPos = positionedMap.get(partnerId);
    const spousePos = positionedMap.get(spouseMember.id);
    if (!partnerPos || !spousePos) return;

    // 先固定配偶在主节点右侧同级
    positionedMap.set(spouseMember.id, {
      ...spousePos,
      x: partnerPos.x + SPOUSE_OFFSET_X,
      y: partnerPos.y,
      centerY: partnerPos.centerY,
    });

    // 找到同一视觉行的节点（含配偶、主节点、该行其他节点）
    const rowIds = visibleMembers
      .map((m) => m.id)
      .filter((id) => {
        const p = positionedMap.get(id);
        return p ? Math.abs(p.centerY - partnerPos.centerY) <= ROW_THRESHOLD : false;
      });

    const ordered = [...rowIds].sort((a, b) => {
      const ax = positionedMap.get(a)?.x ?? 0;
      const bx = positionedMap.get(b)?.x ?? 0;
      return ax - bx;
    });

    const spouseIndex = ordered.indexOf(spouseMember.id);
    const latestPartnerIndex = ordered.lastIndexOf(partnerId);
    if (spouseIndex >= 0 && latestPartnerIndex >= 0 && spouseIndex !== latestPartnerIndex + 1) {
      ordered.splice(spouseIndex, 1);
      ordered.splice(latestPartnerIndex + 1, 0, spouseMember.id);
    }

    // 从左到右强制最小间距，主节点右侧自动顺延
    for (let i = 1; i < ordered.length; i += 1) {
      const prevId = ordered[i - 1];
      const currId = ordered[i];
      const prevPos = positionedMap.get(prevId);
      const currPos = positionedMap.get(currId);
      if (!prevPos || !currPos) continue;
      const minAllowedX = prevPos.x + MIN_GAP_X;
      if (currPos.x < minAllowedX) {
        positionedMap.set(currId, {
          ...currPos,
          x: minAllowedX,
        });
      }
    }
  });

  const memberNodes: Node[] = visibleMembers.map((member) => {
    const nodeWithPosition = dagreGraph.node(String(member.id));
    const hasChildren = (childrenMap.get(member.id)?.length || 0) > 0;

    const placed = positionedMap.get(member.id);
    const x = placed?.x ?? ((nodeWithPosition?.x ?? 0) - NODE_WIDTH / 2);
    const y = placed?.y ?? ((nodeWithPosition?.y ?? 0) - NODE_HEIGHT / 2);

    // 更新全局 minX
    if (x < minX) minX = x;

    // 收集世代 Y 坐标信息
    if (member.generation) {
      const current = generationYMap.get(member.generation) || { totalY: 0, count: 0 };
      generationYMap.set(member.generation, {
        totalY: current.totalY + (placed?.centerY ?? nodeWithPosition.y),
        count: current.count + 1
      });
    }

    // 计算特定节点的渐变颜色
    const baseColor = memberBaseColorMap.get(member.id);
    // 代数偏移量：当前代数 - (根节点代数 + 1)。这样根节点的儿子(房头)偏移为0，也就是最深色。
    // 如果 member.generation 为 null，默认给 0
    const genOffset = (member.generation || rootGeneration) - (rootGeneration + 1);
    const nodeColor = baseColor
      ? generateBranchColor(baseColor, Math.max(0, genOffset))
      : undefined;

    const nodeData: FamilyNodeData = {
      ...member,
      isHighlighted: member.id === highlightedId,
      isPathHighlighted: highlightedPathIds.has(String(member.id)),
      isDimmed: hasHighlight && !highlightedPathIds.has(String(member.id)),
      hasChildren,
      collapsed: collapsedIds.has(member.id),
      spouseExpanded: expandedSpouseIds.has(member.id),
      hasSpouseRelation: !!member.spouse_id && memberMap.has(member.spouse_id),
      onToggleCollapse,
      onToggleSpouse,
      onAddChild,
      onAddSpouse,
      onDeleteMember,
      hideActionButtons: hideNodeActions,
      branchColor: nodeColor, // 传递计算后的具体颜色
    };

    return {
      id: String(member.id),
      type: "familyMember",
      position: { x, y },
      data: nodeData,
    };
  });

  // 5. 生成世代标尺节点
  const generationNodes: Node[] = [];
  // 标尺 X 坐标：在最左侧节点的基础上再向左偏移
  const labelX = minX - 140;

  generationYMap.forEach(({ totalY, count }, generation) => {
    const avgY = totalY / count;
    // 调整 Y 坐标使其垂直居中
    const labelY = avgY - 40;

    generationNodes.push({
      id: `gen-label-${generation}`,
      type: "generationLabel",
      position: { x: labelX, y: labelY },
      data: {
        generation,
        label: `第${toChineseNum(generation)}世`
      },
      draggable: false,
      selectable: false,
      style: {
        opacity: hasHighlight ? 0.2 : 1,
        transition: "opacity 0.3s ease",
      },
      zIndex: -1, // 放在底层
    });
  });

  const highlightedEdges = edges.map((edge) => {
    const isPathEdge = highlightedPathIds.has(edge.id);

    if (!hasHighlight) {
      return edge;
    }

    if (isPathEdge) {
      return {
        ...edge,
        animated: true,
        zIndex: 10,
        style: {
          ...edge.style,
          stroke: "#f59e0b",
          strokeWidth: 3,
          opacity: 1,
        },
      };
    }

    return {
      ...edge,
      animated: false,
      style: {
        ...edge.style,
        opacity: 0.1,
      },
    };
  });

  return { nodes: [...memberNodes, ...generationNodes], edges: highlightedEdges };
}

const FamilyTreeGraphInner = memo(function FamilyTreeGraphInner({ initialData, onMemberClick, readonly = false }: FamilyTreeGraphInnerProps) {
  const router = useRouter();
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUser();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggable, setIsDraggable] = useState(false);
  const [isAddChildOpen, setIsAddChildOpen] = useState(false);
  const [addChildParent, setAddChildParent] = useState<FamilyMemberNode | null>(null);
  const [addChildName, setAddChildName] = useState("");
  const [addChildGender, setAddChildGender] = useState<"男" | "女" | "">("");
  const [addChildIsAlive, setAddChildIsAlive] = useState(true);
  const [isCreatingChild, setIsCreatingChild] = useState(false);
  const [isAddSpouseOpen, setIsAddSpouseOpen] = useState(false);
  const [addSpouseTarget, setAddSpouseTarget] = useState<FamilyMemberNode | null>(null);
  const [addSpouseName, setAddSpouseName] = useState("");
  const [addSpouseGender, setAddSpouseGender] = useState<"男" | "女" | "">("");
  const [addSpouseIsAlive, setAddSpouseIsAlive] = useState(true);
  const [isCreatingSpouse, setIsCreatingSpouse] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FamilyMemberNode | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [isExportingAsset, setIsExportingAsset] = useState(false);
  const [relationFromId, setRelationFromId] = useState<number | null>(null);
  const [relationToId, setRelationToId] = useState<number | null>(null);
  const [isRelationshipPicking, setIsRelationshipPicking] = useState(false);

  // 折叠状态管理
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [expandedSpouseIds, setExpandedSpouseIds] = useState<Set<number>>(new Set());

  // 构建 childrenMap
  const childrenMap = useMemo(() => {
    const map = new Map<number, number[]>();
    initialData.forEach(m => {
      if (m.father_id) {
        const children = map.get(m.father_id) || [];
        children.push(m.id);
        map.set(m.father_id, children);
      }
    });
    return map;
  }, [initialData]);

  const memberMap = useMemo(
    () => new Map(initialData.map((m) => [m.id, m])),
    [initialData]
  );

  // 单点高亮路径（溯源 + 繁衍）
  const singleHighlightPathIds = useMemo(() => {
    if (!highlightedId) {
      return new Set<string>();
    }

    const pathSet = new Set<string>();

    // 1. 向上溯源 (Ancestors)
    let currentId = highlightedId;
    pathSet.add(String(currentId));

    while (true) {
      const member = memberMap.get(currentId);
      if (!member || !member.father_id) break;

      pathSet.add(String(member.father_id));
      pathSet.add(`e${member.father_id}-${currentId}`);
      currentId = member.father_id;
    }

    // 2. 向下繁衍 (Descendants)
    const queue = [highlightedId];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = childrenMap.get(parentId) || [];

      children.forEach((childId) => {
        pathSet.add(String(childId));
        pathSet.add(`e${parentId}-${childId}`);
        queue.push(childId);
      });
    }

    return pathSet;
  }, [highlightedId, childrenMap, memberMap]);

  const relationshipPath = useMemo(() => {
    if (!relationFromId || !relationToId) return null;
    return findShortestPath(initialData, relationFromId, relationToId);
  }, [initialData, relationFromId, relationToId]);

  const relationshipInfo = useMemo(() => describeRelationship(relationshipPath), [relationshipPath]);

  const relationshipPathIds = useMemo(() => {
    const set = new Set<string>();
    if (!relationshipPath || relationshipPath.length === 0) {
      return set;
    }

    relationshipPath.forEach((member) => set.add(String(member.id)));
    for (let i = 0; i < relationshipPath.length - 1; i += 1) {
      const current = relationshipPath[i];
      const next = relationshipPath[i + 1];
      if (next.father_id === current.id) {
        set.add(`e${current.id}-${next.id}`);
      } else if (current.father_id === next.id) {
        set.add(`e${next.id}-${current.id}`);
      } else if (current.spouse_id === next.id || next.spouse_id === current.id) {
        const [a, b] = current.id < next.id ? [current.id, next.id] : [next.id, current.id];
        set.add(`sp-${a}-${b}`);
      }
    }
    return set;
  }, [relationshipPath]);

  const effectiveHighlightedId = relationshipPath ? relationFromId : highlightedId;
  const effectiveHighlightedPathIds = relationshipPath ? relationshipPathIds : singleHighlightPathIds;

  // 处理折叠切换
  const onToggleCollapse = useCallback((id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const onToggleSpouse = useCallback((id: number) => {
    const member = memberMap.get(id);
    if (!member?.spouse_id) return;
    const spouseId = member.spouse_id;
    setExpandedSpouseIds((prev) => {
      const next = new Set(prev);
      const isExpanded = next.has(id) || next.has(spouseId);
      if (isExpanded) {
        next.delete(id);
        next.delete(spouseId);
      } else {
        next.add(id);
        next.add(spouseId);
      }
      return next;
    });
  }, [memberMap]);

  // 展开所有
  const onExpandAll = useCallback(() => {
    setCollapsedIds(new Set());
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 100);
  }, [reactFlowInstance]);

  const onAddChild = useCallback((member: FamilyMemberNode) => {
    if (readonly) return;
    setAddChildParent(member);
    setAddChildName("");
    setAddChildGender("");
    setAddChildIsAlive(true);
    setIsAddChildOpen(true);
  }, [readonly]);

  const onDeleteMember = useCallback((member: FamilyMemberNode) => {
    if (readonly) return;
    setDeleteTarget(member);
    setIsDeleteOpen(true);
  }, [readonly]);

  const onAddSpouse = useCallback((member: FamilyMemberNode) => {
    if (readonly) return;
    setAddSpouseTarget(member);
    setAddSpouseName("");
    setAddSpouseGender(member.gender === "男" ? "女" : member.gender === "女" ? "男" : "");
    setAddSpouseIsAlive(true);
    setIsAddSpouseOpen(true);
  }, [readonly]);

  // 转换数据为节点和边（使用 dagre 自动布局）
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () =>
      getLayoutedElements(
        initialData,
        childrenMap,
        collapsedIds,
        expandedSpouseIds,
        effectiveHighlightedId,
        effectiveHighlightedPathIds,
        onToggleCollapse,
        onToggleSpouse,
        readonly ? undefined : onAddChild,
        readonly ? undefined : onAddSpouse,
        readonly ? undefined : onDeleteMember,
        isExportingAsset || readonly
      ),
    [initialData, childrenMap, collapsedIds, expandedSpouseIds, effectiveHighlightedId, effectiveHighlightedPathIds, onToggleCollapse, onToggleSpouse, onAddChild, onAddSpouse, onDeleteMember, isExportingAsset, readonly]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 当 initialNodes 变化（例如折叠状态改变），同步更新 nodes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // 当 initialEdges 变化，同步更新 edges
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // 重置视图
  const onResetView = useCallback(() => {
    // 重置节点位置 (重新计算布局，保持折叠状态)
    setNodes(initialNodes);
    setEdges(initialEdges);
    // 重置视图位置，加一点延迟确保节点渲染完成
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 10);
  }, [reactFlowInstance, setNodes, setEdges, initialNodes, initialEdges]);

  // 搜索功能
  const onSearch = useCallback(() => {
    if (!searchQuery.trim()) {
      setHighlightedId(null);
      return;
    }

    const keyword = searchQuery.trim().toLowerCase();
    const exactMatch = initialData.find(
      (member) => member.name.toLowerCase() === keyword
    );
    const partialMatch = initialData.find((member) =>
      member.name.toLowerCase().includes(keyword)
    );
    const found = exactMatch || partialMatch;

    if (found) {
      let current = found;
      const idsToExpand = new Set<number>();
      while (current.father_id) {
        if (collapsedIds.has(current.father_id)) {
          idsToExpand.add(current.father_id);
        }
        const father = memberMap.get(current.father_id);
        if (!father) break;
        current = father;
      }

      if (idsToExpand.size > 0) {
        setCollapsedIds(prev => {
          const next = new Set(prev);
          idsToExpand.forEach(id => next.delete(id));
          return next;
        });
        setTimeout(() => {
          setHighlightedId(found.id);
        }, 100);
      } else {
        setHighlightedId(found.id);
      }
    } else {
      setHighlightedId(null);
    }
  }, [searchQuery, initialData, collapsedIds, memberMap]);

  // 监听 highlight 变化后聚焦
  useEffect(() => {
    if (highlightedId) {
      const targetId = String(highlightedId);
      let attempts = 0;
      const maxAttempts = 6;

      const focusNode = () => {
        const node = reactFlowInstance.getNode(targetId);
        if (node) {
          reactFlowInstance.setCenter(
            node.position.x + NODE_WIDTH / 2,
            node.position.y + NODE_HEIGHT / 2,
            {
              zoom: 1.5,
              duration: 500,
            }
          );
          return;
        }

        if (attempts < maxAttempts) {
          attempts += 1;
          requestAnimationFrame(focusNode);
        }
      };

      focusNode();
    }
  }, [highlightedId, reactFlowInstance, nodes]);

  // 清除搜索
  const onClearSearch = useCallback(() => {
    setSearchQuery("");
    setHighlightedId(null);
  }, []);

  const onClearRelationship = useCallback(() => {
    setRelationFromId(null);
    setRelationToId(null);
    setIsRelationshipPicking(false);
  }, []);

  // 节点点击事件
  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      if (isRelationshipPicking) {
        const id = Number(node.id);
        if (!relationFromId || (relationFromId && relationToId)) {
          setRelationFromId(id);
          setRelationToId(null);
        } else if (id !== relationFromId) {
          setRelationToId(id);
          setIsRelationshipPicking(false);
        }
        return;
      }

      const memberFromMap = memberMap.get(Number(node.id));
      if (memberFromMap && onMemberClick) {
        onMemberClick(memberFromMap);
      }
    },
    [isRelationshipPicking, memberMap, onMemberClick, relationFromId, relationToId]
  );

  useEffect(() => {
    if (!relationshipPath || relationshipPath.length === 0) return;
    const pathIds = new Set(relationshipPath.map((item) => item.id));
    const hasCollapsedInPath = Array.from(pathIds).some((id) => collapsedIds.has(id));
    if (!hasCollapsedInPath) return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      pathIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [relationshipPath, collapsedIds]);

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

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);



  const createExportImage = useCallback(async () => {
    const viewportElem = document.querySelector(
      ".react-flow__viewport"
    ) as HTMLElement;

    if (!viewportElem) return null;

    const bounds = getNodesBounds(nodes);
    const imageWidth = bounds.width + 300;
    const imageHeight = bounds.height + 300;

    const transform = getViewportForBounds(
      bounds,
      imageWidth,
      imageHeight,
      0.1,
      2,
      0.15
    );

    let bgDataUrl = "";
    try {
      const response = await fetch("/images/login-bg.jpg");
      if (response.ok) {
        const blob = await response.blob();
        bgDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.warn("Failed to load background image:", error);
    }

    const canvas = document.createElement("canvas");
    canvas.width = imageWidth * 2.0;
    canvas.height = imageHeight * 2.0;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.scale(2.0, 2.0);

    if (bgDataUrl) {
      const bgImg = new Image();
      bgImg.src = bgDataUrl;
      await new Promise((resolve) => {
        bgImg.onload = resolve;
      });

      const bgRatio = bgImg.width / bgImg.height;
      const canvasRatio = imageWidth / imageHeight;
      let drawW = imageWidth;
      let drawH = imageHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (bgRatio > canvasRatio) {
        drawH = imageHeight;
        drawW = imageHeight * bgRatio;
        offsetX = (imageWidth - drawW) / 2;
      } else {
        drawW = imageWidth;
        drawH = imageWidth / bgRatio;
        offsetY = (imageHeight - drawH) / 2;
      }

      ctx.drawImage(bgImg, offsetX, offsetY, drawW, drawH);
    } else {
      ctx.fillStyle = "#f9f5f0";
      ctx.fillRect(0, 0, imageWidth, imageHeight);
    }

    const watermarkText = userEmail || "Liu Family";
    ctx.save();
    ctx.rotate(-30 * Math.PI / 180);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
    ctx.textAlign = "center";

    const stepX = 200;
    const stepY = 100;
    for (let x = -imageWidth; x < imageWidth * 2; x += stepX) {
      for (let y = -imageHeight; y < imageHeight * 2; y += stepY) {
        ctx.fillText(watermarkText, x, y);
      }
    }
    ctx.restore();

      const treeDataUrl = await toPng(viewportElem, {
        width: imageWidth,
        height: imageHeight,
        backgroundColor: null as any,
        filter: (domNode) => {
          if (!(domNode instanceof HTMLElement)) {
            return true;
          }
          return !domNode.closest('[data-export-hidden="true"]');
        },
        style: {
          width: imageWidth.toString(),
          height: imageHeight.toString(),
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
        fontFamily: "system-ui, -apple-system, sans-serif",
        backgroundColor: "transparent",
      },
      pixelRatio: 2.0,
      cacheBust: true,
    });

    const treeImg = new Image();
    treeImg.src = treeDataUrl;
    await new Promise((resolve) => {
      treeImg.onload = resolve;
    });

    ctx.drawImage(treeImg, 0, 0, imageWidth, imageHeight);

    const finalDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return { dataUrl: finalDataUrl, width: imageWidth, height: imageHeight };
  }, [nodes, userEmail]);

  const onDownload = useCallback(async () => {
    const result = await createExportImage();
    if (!result) return;
    const a = document.createElement("a");
    a.setAttribute("download", `family-tree-${new Date().toISOString().split("T")[0]}.jpg`);
    a.setAttribute("href", result.dataUrl);
    a.click();
  }, [createExportImage]);

  const onDownloadPdf = useCallback(async () => {
    const result = await createExportImage();
    if (!result) return;

    const { jsPDF } = await import("jspdf");
    const orientation = result.width >= result.height ? "l" : "p";
    const pdf = new jsPDF({
      orientation,
      unit: "pt",
      format: [result.width, result.height],
      compress: true,
    });

    pdf.addImage(result.dataUrl, "JPEG", 0, 0, result.width, result.height);
    pdf.save(`family-tree-${new Date().toISOString().split("T")[0]}.pdf`);
  }, [createExportImage]);

  const toggleDraggable = useCallback(() => {
    setIsDraggable((prev) => !prev);
  }, []);

  // 修复：路由切换回来时，强制重新适应视图
  // onInit 中的 fitView 可能因为容器尺寸未就绪而失效
  useEffect(() => {
    const timer = setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
    }, 100);
    return () => clearTimeout(timer);
  }, [reactFlowInstance]);

  const handleCreateChild = useCallback(async () => {
    if (!addChildParent || !addChildName.trim()) {
      return;
    }

    setIsCreatingChild(true);
    const result = await createGraphChildMember({
      fatherId: addChildParent.id,
      name: addChildName.trim(),
      gender: addChildGender || null,
      isAlive: addChildIsAlive,
    });
    setIsCreatingChild(false);

    if (!result.success) {
      alert(result.error || "新增子级失败");
      return;
    }

    setIsAddChildOpen(false);
    router.refresh();
  }, [addChildGender, addChildIsAlive, addChildName, addChildParent, router]);

  const handleDeleteMember = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeletingMember(true);
    const result = await deleteGraphMember(deleteTarget.id);
    setIsDeletingMember(false);

    if (!result.success) {
      alert(result.error || "删除失败");
      return;
    }

    setIsDeleteOpen(false);
    setDeleteTarget(null);
    router.refresh();
  }, [deleteTarget, router]);

  const handleCreateSpouse = useCallback(async () => {
    if (!addSpouseTarget || !addSpouseName.trim()) {
      return;
    }

    setIsCreatingSpouse(true);
    const result = await createGraphSpouseMember({
      memberId: addSpouseTarget.id,
      name: addSpouseName.trim(),
      gender: addSpouseGender || null,
      isAlive: addSpouseIsAlive,
    });
    setIsCreatingSpouse(false);

    if (!result.success) {
      alert(result.error || "新增配偶失败");
      return;
    }

    setIsAddSpouseOpen(false);
    setAddSpouseTarget(null);
    router.refresh();
  }, [addSpouseGender, addSpouseIsAlive, addSpouseName, addSpouseTarget, router]);

  const onNodeDragStop = useCallback(
    async (_: MouseEvent, node: Node) => {
      if (readonly || !isDraggable || isReordering) {
        return;
      }

      const dragged = memberMap.get(Number(node.id));
      if (!dragged) {
        return;
      }

      const siblings = initialData.filter((m) => m.father_id === dragged.father_id);
      if (siblings.length <= 1) {
        return;
      }

      const currentNodes = reactFlowInstance.getNodes();
      const xMap = new Map<string, number>(
        currentNodes.map((n) => [n.id, n.position.x])
      );

      const reordered = [...siblings].sort((a, b) => {
        const ax = xMap.get(String(a.id)) ?? 0;
        const bx = xMap.get(String(b.id)) ?? 0;
        return ax - bx;
      });

      const reorderedIds = reordered.map((item) => item.id);
      const currentIds = [...siblings]
        .sort((a, b) => (a.sibling_order ?? 9999) - (b.sibling_order ?? 9999))
        .map((item) => item.id);

      const changed =
        reorderedIds.length === currentIds.length &&
        reorderedIds.some((id, index) => id !== currentIds[index]);

      if (!changed) {
        return;
      }

      setIsReordering(true);
      const result = await reorderGraphSiblings({
        fatherId: dragged.father_id,
        orderedIds: reorderedIds,
      });
      setIsReordering(false);

      if (!result.success) {
        alert(result.error || "更新排行失败");
        return;
      }

      router.refresh();
    },
    [initialData, isDraggable, isReordering, memberMap, reactFlowInstance, router, readonly]
  );

  return (
    <div
      ref={containerRef}
      className={`w-full border bg-background relative ${
        readonly
          ? "h-screen min-h-0 rounded-none"
          : "h-[calc(100vh-200px)] min-h-[500px] rounded-lg"
      }`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={(instance) => {
          // 只在初始化时执行一次 fitView
          instance.fitView({ padding: 0.2 });
        }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!readonly && isDraggable}
        nodesConnectable={false} // 禁止从节点拖出连线
        edgesFocusable={false}   // 禁止选中连线
      >
        <Controls
          showInteractive={false}
          className="!bg-background !border !border-border !shadow-md [&>button]:!bg-background [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-muted [&>button>svg]:!fill-current"
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

        {/* 顶部统一工具栏：左侧搜索，右侧按钮 */}
        <Panel
          position="top-left"
          className="!absolute !top-0 !left-0 !w-full !m-0 p-2 sm:p-4 flex justify-between items-start pointer-events-none z-10"
        >
          {/* 左侧：搜索框 */}
          <div className="pointer-events-auto flex flex-col gap-2">
            <div className="flex items-center gap-1 bg-background/95 backdrop-blur-sm border rounded-md p-1 shadow-sm">
              <Input
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                className="h-8 w-28 sm:w-40 md:w-56 border-0 focus-visible:ring-0 placeholder:text-muted-foreground/70"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onSearch} title="搜索成员">
                <Search className="h-4 w-4" />
              </Button>
              {searchQuery && (
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClearSearch} title="清除搜索内容">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="bg-background/95 backdrop-blur-sm border rounded-md p-2 shadow-sm space-y-2 max-w-[92vw] sm:max-w-none">
              <div className="text-xs text-muted-foreground">关系路径</div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[190px_190px_auto] md:items-center">
                <MemberSelect
                  members={initialData}
                  value={relationFromId}
                  onChange={(value) => setRelationFromId(value)}
                  placeholder="选择成员 A"
                />
                <MemberSelect
                  members={initialData}
                  value={relationToId}
                  onChange={(value) => setRelationToId(value)}
                  placeholder="选择成员 B"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={isRelationshipPicking ? "default" : "outline"}
                    onClick={() => setIsRelationshipPicking((prev) => !prev)}
                    title="开启后可直接点击图上节点，依次选择两位成员"
                  >
                    {isRelationshipPicking ? "取消选点" : "图上选点"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onClearRelationship}>
                    清空关系
                  </Button>
                </div>
              </div>
              {relationFromId && relationToId ? (
                <div className="text-xs text-muted-foreground">
                  {relationshipPath
                    ? `关系：${relationshipInfo.label} · 路径长度 ${relationshipPath.length - 1} 级`
                    : "未找到可达路径"}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">可下拉选择两位成员，或点击“图上选点”后依次点击两个节点。</div>
              )}
            </div>
          </div>

          {/* 右侧：操作按钮组 */}
          {!readonly ? (
          <div className="pointer-events-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onResetView}
              title="将视图重置到中心位置并恢复缩放"
              className="bg-background/95 backdrop-blur-sm shadow-sm h-9 w-9 px-0 sm:w-auto sm:px-4"
            >
              <RotateCcw className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">重置</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={toggleFullscreen}
              title={isFullscreen ? "退出全屏模式" : "进入全屏模式"}
              className="bg-background/95 backdrop-blur-sm shadow-sm h-9 w-9 px-0 sm:w-auto sm:px-4"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">退出全屏</span>
                </>
              ) : (
                <>
                  <Maximize className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">全屏</span>
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-background/95 backdrop-blur-sm shadow-sm h-9 w-9 px-0"
                  title="更多操作"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onExpandAll}>
                  <ChevronsDown className="h-4 w-4 mr-2" />
                  全部展开
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleDraggable}>
                  {isDraggable ? (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      解锁位置
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      锁定位置
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  保存图片
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  导出PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          ) : null}
        </Panel>
        {/* 统计信息 */}
        <Panel position="bottom-left" className="bg-background/95 backdrop-blur-sm border rounded-md px-3 py-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400" />
              <span>男</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-pink-400" />
              <span>女</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
              <span>已故</span>
            </div>
          </div>
        </Panel>

        {/* 统计信息 */}
        <Panel position="bottom-right" className="bg-background/95 backdrop-blur-sm border rounded-md px-3 py-2">
          <span className="text-sm text-muted-foreground">
            共 {initialData.length} 位成员
          </span>
        </Panel>
      </ReactFlow>

      <Dialog open={!readonly && isAddChildOpen} onOpenChange={setIsAddChildOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增子级成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              父节点：{addChildParent?.name ?? "-"}
            </div>
            <div className="space-y-2">
              <Label htmlFor="graph-add-child-name">姓名</Label>
              <Input
                id="graph-add-child-name"
                value={addChildName}
                onChange={(e) => setAddChildName(e.target.value)}
                placeholder="请输入子级姓名"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="graph-add-child-gender">性别（可选）</Label>
              <select
                id="graph-add-child-gender"
                value={addChildGender}
                onChange={(e) => setAddChildGender(e.target.value as "男" | "女" | "")}
                className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">未填写</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="graph-add-child-is-alive"
                type="checkbox"
                checked={addChildIsAlive}
                onChange={(e) => setAddChildIsAlive(e.target.checked)}
              />
              <Label htmlFor="graph-add-child-is-alive">是否在世</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddChildOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateChild}
              disabled={isCreatingChild || !addChildName.trim()}
            >
              {isCreatingChild ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!readonly && isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除成员</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            确认删除成员「{deleteTarget?.name ?? "-"}」吗？
            <br />
            若该成员存在子级，将无法删除。
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false);
                setDeleteTarget(null);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMember}
              disabled={isDeletingMember}
            >
              {isDeletingMember ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!readonly && isAddSpouseOpen} onOpenChange={setIsAddSpouseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增配偶成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              当前成员：{addSpouseTarget?.name ?? "-"}
            </div>
            <div className="space-y-2">
              <Label htmlFor="graph-add-spouse-name">姓名</Label>
              <Input
                id="graph-add-spouse-name"
                value={addSpouseName}
                onChange={(e) => setAddSpouseName(e.target.value)}
                placeholder="请输入配偶姓名"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                性别将按当前成员自动设置为异性
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="graph-add-spouse-is-alive"
                type="checkbox"
                checked={addSpouseIsAlive}
                onChange={(e) => setAddSpouseIsAlive(e.target.checked)}
              />
              <Label htmlFor="graph-add-spouse-is-alive">是否在世</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddSpouseOpen(false);
                setAddSpouseTarget(null);
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleCreateSpouse}
              disabled={isCreatingSpouse || !addSpouseName.trim()}
            >
              {isCreatingSpouse ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export function FamilyTreeGraph({ initialData, readonly = false }: FamilyTreeGraphProps) {
  const [selectedMember, setSelectedMember] = useState<FamilyMemberNode | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 获取父亲姓名
  const getFatherName = useCallback(
    (fatherId: number | null) => {
      if (!fatherId) return null;
      const father = initialData.find((m) => m.id === fatherId);
      return father?.name || null;
    },
    [initialData]
  );

  // 处理成员点击
  const handleMemberClick = useCallback((member: FamilyMemberNode) => {
    setSelectedMember(member);
    setIsDetailOpen(true);
  }, []);

  return (
    <>
      <ReactFlowProvider>
        <FamilyTreeGraphInner
          initialData={initialData}
          onMemberClick={handleMemberClick}
          readonly={readonly}
        />
      </ReactFlowProvider>

      {/* 成员详情弹窗 */}
      <MemberDetailDialog
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        member={selectedMember}
        fatherName={getFatherName(selectedMember?.father_id || null)}
        members={initialData}
        onSelectMember={(member) => {
          setSelectedMember(member);
          setIsDetailOpen(true);
        }}
      />
    </>
  );
}
