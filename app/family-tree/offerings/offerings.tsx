"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { Offering } from "./actions";
import { createOffering, deleteOffering } from "./actions";

interface OfferingsProps {
  familyMemberId: number;
  offerings: Offering[];
  quickPresets?: { label: string; icon: React.ReactNode }[];
}

export function Offerings({ familyMemberId, offerings, quickPresets = [] }: OfferingsProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [offeredBy, setOfferedBy] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<number | null>(null);

  const handleCreate = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);

    const result = await createOffering({
      family_member_id: familyMemberId,
      content,
      offered_by: offeredBy || null,
    });

    if (result) {
      setContent("");
      setOfferedBy("");
      setIsDialogOpen(false);
      window.location.reload();
    } else {
      alert("新增祭拜记录失败，请稍后再试");
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (offeringId: number) => {
    const confirmed = window.confirm("确定要删除这条祭拜记录吗？");
    if (!confirmed) return;

    setIsDeleting(offeringId);
    const result = await deleteOffering(offeringId);
    if (result) {
      window.location.reload();
    } else {
      alert("删除祭拜记录失败，请稍后再试");
    }
    setIsDeleting(null);
  };

  const handleQuickOffering = async (value: string) => {
    if (!value.trim()) return;
    setIsSubmitting(true);
    const result = await createOffering({
      family_member_id: familyMemberId,
      content: value,
      offered_by: null,
    });
    if (result) {
      window.location.reload();
    } else {
      alert("新增祭拜记录失败，请稍后再试");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-lg font-semibold">上香祭拜</h3>
          <p className="text-sm text-muted-foreground">仅对已故成员开放</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增祭拜
        </Button>
      </div>

      {quickPresets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {quickPresets.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleQuickOffering(preset.label)}
              disabled={isSubmitting}
            >
              <span className="mr-2">{preset.icon}</span>
              {preset.label}
            </Button>
          ))}
        </div>
      ) : null}

      {offerings.length === 0 ? (
        <div className="text-sm text-muted-foreground border rounded-lg p-4">
          暂无祭拜记录
        </div>
      ) : (
        <div className="space-y-3">
          {offerings.map((offering) => (
            <div key={offering.id} className="border rounded-lg p-4 bg-background">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-stone-700 dark:text-stone-200">
                    {offering.content}
                  </p>
                  <div className="text-xs text-muted-foreground mt-2">
                    {offering.offered_by ? `祭拜人：${offering.offered_by} · ` : ""}
                    {new Date(offering.offered_at).toLocaleString("zh-CN")}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(offering.id)}
                  disabled={isDeleting === offering.id}
                >
                  {isDeleting === offering.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">删除</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>新增祭拜记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="offering-content">祭拜内容</Label>
              <Input
                id="offering-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="如：上香一炷，祈愿安宁"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="offering-by">祭拜人（可选）</Label>
              <Input
                id="offering-by"
                value={offeredBy}
                onChange={(e) => setOfferedBy(e.target.value)}
                placeholder="如：张三"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !content.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
