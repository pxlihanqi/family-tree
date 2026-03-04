"use client";

import * as React from "react";
import type { FamilyMemberNode } from "../graph/actions";
import { findShortestPath } from "../graph-3d/tour-utils";
import { MemberSelect } from "../graph-3d/member-select";
import { describeRelationship } from "./relationship-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RelationshipClientProps {
  members: FamilyMemberNode[];
}

export function RelationshipClient({ members }: RelationshipClientProps) {
  const [fromId, setFromId] = React.useState<number | null>(null);
  const [toId, setToId] = React.useState<number | null>(null);

  const path = React.useMemo(() => {
    if (!fromId || !toId) return null;
    return findShortestPath(members, fromId, toId);
  }, [members, fromId, toId]);

  const relationship = React.useMemo(() => describeRelationship(path), [path]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>选择成员</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">成员 A</p>
            <MemberSelect members={members} value={fromId} onChange={setFromId} placeholder="选择成员 A" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">成员 B</p>
            <MemberSelect members={members} value={toId} onChange={setToId} placeholder="选择成员 B" />
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFromId(null);
                setToId(null);
              }}
            >
              重置
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (fromId && toId) {
                  setFromId(toId);
                  setToId(fromId);
                }
              }}
              disabled={!fromId || !toId}
            >
              交换
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>关系路径</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!fromId || !toId ? (
            <div className="text-sm text-muted-foreground">请选择两个成员查看关系路径。</div>
          ) : !path ? (
            <div className="text-sm text-muted-foreground">未找到可达路径。</div>
          ) : (
            <>
              <div
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-sm",
                  relationship.type === "ancestor" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
                  relationship.type === "descendant" && "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200",
                  relationship.type === "sibling" && "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
                  (relationship.type === "other" || relationship.type === "cousin") && "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
                  relationship.type === "self" && "bg-primary/10 text-primary"
                )}
              >
                关系判断：{relationship.label}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                {path.map((member, index) => (
                  <React.Fragment key={member.id}>
                    <span className="px-2 py-1 rounded-md bg-muted text-foreground">
                      {member.name}
                      {member.generation ? `（第${member.generation}世）` : ""}
                    </span>
                    {index < path.length - 1 && (
                      <span className="text-muted-foreground">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                路径长度：{path.length - 1} 级
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
