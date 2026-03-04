"use client";

import * as React from "react";
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
import { Share2, Copy, Loader2 } from "lucide-react";
import { createShareLink } from "@/app/share/actions";

export function GraphShareButton() {
  const [open, setOpen] = React.useState(false);
  const [days, setDays] = React.useState("7");
  const [isCreating, setIsCreating] = React.useState(false);
  const [shareLink, setShareLink] = React.useState("");

  const handleCreate = async () => {
    setIsCreating(true);
    const d = Number.parseInt(days, 10);
    const result = await createShareLink(Number.isNaN(d) ? 7 : d);
    setIsCreating(false);

    if (!result || typeof window === "undefined") {
      alert("生成分享链接失败");
      return;
    }

    setShareLink(`${window.location.origin}/share/${result.token}/graph`);
  };

  const handleCopy = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    alert("分享链接已复制");
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Share2 className="mr-2 h-4 w-4" />
        分享只读链接
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分享 2D 族谱（只读）</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="graph-share-days">有效期（天，0 表示不过期）</Label>
              <Input
                id="graph-share-days"
                type="number"
                min={0}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>

            {shareLink ? (
              <div className="space-y-2">
                <Label htmlFor="graph-share-link">分享链接</Label>
                <Input id="graph-share-link" value={shareLink} readOnly />
                <div className="flex justify-center rounded-md border p-4">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareLink)}`}
                    alt="2D族谱分享二维码"
                    className="h-44 w-44"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            {shareLink ? (
              <Button type="button" variant="outline" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                复制链接
              </Button>
            ) : null}
            <Button type="button" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              生成链接
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
