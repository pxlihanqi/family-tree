import { FamilyMemberNode } from "../graph/actions";

/**
 * Finds the shortest path between two members in the family tree using BFS.
 * Treats the graph as undirected (parent <-> child) to allow traversal across branches.
 */
export function findShortestPath(
  members: FamilyMemberNode[],
  startId: number,
  endId: number
): FamilyMemberNode[] | null {
  if (startId === endId) {
    const member = members.find((m) => m.id === startId);
    return member ? [member] : null;
  }

  // 1. Build Adjacency List (Undirected)
  const adj = new Map<number, number[]>();
  const memberMap = new Map<number, FamilyMemberNode>();

  const addUndirectedEdge = (a: number, b: number) => {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    if (!adj.get(a)?.includes(b)) adj.get(a)?.push(b);
    if (!adj.get(b)?.includes(a)) adj.get(b)?.push(a);
  };

  members.forEach((m) => {
    memberMap.set(m.id, m);
    if (!adj.has(m.id)) adj.set(m.id, []);

    // Edge to Father
    if (m.father_id) {
      addUndirectedEdge(m.id, m.father_id);
    }

    // Edge to Spouse
    if (m.spouse_id) {
      addUndirectedEdge(m.id, m.spouse_id);
    }
  });

  // 2. BFS
  const queue: number[] = [startId];
  const visited = new Set<number>([startId]);
  const parentMap = new Map<number, number>(); // To reconstruct path: child -> parent in search tree

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (currentId === endId) {
      // Found target, reconstruct path
      const path: FamilyMemberNode[] = [];
      let traceId: number | undefined = endId;
      
      while (traceId !== undefined) {
        const member = memberMap.get(traceId);
        if (member) path.unshift(member);
        traceId = parentMap.get(traceId);
      }
      return path;
    }

    const neighbors = adj.get(currentId) || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        parentMap.set(neighborId, currentId);
        queue.push(neighborId);
      }
    }
  }

  // No path found
  return null;
}
