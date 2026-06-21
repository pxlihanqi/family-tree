"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { showAlert, showConfirm } from "@/lib/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, MapPin, Users, Plus, Trash2, Loader2, Edit, Share2, Copy } from "lucide-react";
import type { AnnouncementSignup, AnnouncementWithStats } from "./actions";
import { createAnnouncement, deleteAnnouncement, getSignupsByAnnouncementId, signupAnnouncement, updateAnnouncement } from "./actions";

interface AnnouncementsProps {
  announcements: AnnouncementWithStats[];
}

export function Announcements({ announcements }: AnnouncementsProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isSignupOpen, setIsSignupOpen] = React.useState(false);
  const [isSignupsOpen, setIsSignupsOpen] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AnnouncementWithStats | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<number | null>(null);
  const [isLoadingSignups, setIsLoadingSignups] = React.useState(false);
  const [signups, setSignups] = React.useState<AnnouncementSignup[]>([]);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [eventDate, setEventDate] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [capacity, setCapacity] = React.useState("");

  const [signupName, setSignupName] = React.useState("");
  const [signupContact, setSignupContact] = React.useState("");
  const [signupNotes, setSignupNotes] = React.useState("");
  const [shareLink, setShareLink] = React.useState("");

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setEventDate("");
    setLocation("");
    setCapacity("");
  };

  const loadSignups = async (announcementId: number) => {
    setIsLoadingSignups(true);
    const data = await getSignupsByAnnouncementId(announcementId);
    setSignups(data);
    setIsLoadingSignups(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);

    const result = await createAnnouncement({
      title,
      description: description || null,
      event_date: eventDate || null,
      location: location || null,
      capacity: capacity ? Number(capacity) : null,
    });

    setIsSubmitting(false);
    if (result) {
      resetCreateForm();
      setIsCreateOpen(false);
      router.refresh();
    } else {
      showAlert("发布失败，请稍后再试");
    }
  };

  const handleEdit = async () => {
    if (!selected || !title.trim()) return;
    setIsSubmitting(true);

    const result = await updateAnnouncement(selected.id, {
      title,
      description: description || null,
      event_date: eventDate || null,
      location: location || null,
      capacity: capacity ? Number(capacity) : null,
    });

    setIsSubmitting(false);
    if (result) {
      setIsEditOpen(false);
      router.refresh();
    } else {
      showAlert("更新失败，请稍后再试");
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm("确定要删除该公告吗？");
    if (!confirmed) return;
    setIsDeleting(id);
    const result = await deleteAnnouncement(id);
    setIsDeleting(null);
    if (result) {
      router.refresh();
    } else {
      showAlert("删除失败，请稍后再试");
    }
  };

  const handleSignup = async () => {
    if (!selected || !signupName.trim()) return;
    setIsSubmitting(true);

    const result = await signupAnnouncement({
      announcement_id: selected.id,
      name: signupName,
      contact: signupContact || null,
      notes: signupNotes || null,
    });

    setIsSubmitting(false);
    if (result) {
      setIsSignupOpen(false);
      setSignupName("");
      setSignupContact("");
      setSignupNotes("");
      router.refresh();
    } else {
      showAlert("报名失败，请稍后再试");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">活动公告</h2>
          <p className="text-sm text-muted-foreground">发布家族活动，支持在线报名。</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          发布公告
        </Button>
      </div>

      {announcements.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-sm text-muted-foreground">暂无公告</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {announcements.map((item) => {
            const isFull = item.capacity !== null && item.signup_count >= item.capacity;
            return (
              <div key={item.id} className="border rounded-lg p-4 sm:p-5 bg-background">
                <div className="flex flex-col sm:flex-row justify-between gap-3">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {item.event_date ? item.event_date : "时间待定"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {item.location || "地点待定"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {item.signup_count}{item.capacity ? ` / ${item.capacity}` : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelected(item);
                        setIsSignupOpen(true);
                      }}
                      disabled={isFull}
                    >
                      {isFull ? "已满" : "报名"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelected(item);
                        setTitle(item.title);
                        setDescription(item.description || "");
                        setEventDate(item.event_date || "");
                        setLocation(item.location || "");
                        setCapacity(item.capacity ? String(item.capacity) : "");
                        setIsEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelected(item);
                        setIsSignupsOpen(true);
                        loadSignups(item.id);
                      }}
                    >
                      查看报名
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelected(item);
                        setShareLink(`${window.location.origin}/announcements/${item.id}`);
                        setIsShareOpen(true);
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      分享
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      disabled={isDeleting === item.id}
                    >
                      {isDeleting === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>发布公告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="announcement-title">标题</Label>
              <Input id="announcement-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="announcement-desc">内容</Label>
              <Textarea id="announcement-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="announcement-date">活动日期</Label>
                <Input id="announcement-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="announcement-location">地点</Label>
                <Input id="announcement-location" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="announcement-capacity">人数上限</Label>
                <Input id="announcement-capacity" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? "发布中..." : "发布"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>编辑公告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="announcement-title-edit">标题</Label>
              <Input id="announcement-title-edit" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="announcement-desc-edit">内容</Label>
              <Textarea id="announcement-desc-edit" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="announcement-date-edit">活动日期</Label>
                <Input id="announcement-date-edit" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="announcement-location-edit">地点</Label>
                <Input id="announcement-location-edit" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="announcement-capacity-edit">人数上限</Label>
                <Input id="announcement-capacity-edit" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting || !title.trim()}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>活动报名</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {selected ? selected.title : ""}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signup-name">姓名</Label>
              <Input id="signup-name" value={signupName} onChange={(e) => setSignupName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signup-contact">联系方式</Label>
              <Input id="signup-contact" value={signupContact} onChange={(e) => setSignupContact(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signup-notes">备注</Label>
              <Textarea id="signup-notes" value={signupNotes} onChange={(e) => setSignupNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsSignupOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSignup} disabled={isSubmitting || !signupName.trim()}>
              {isSubmitting ? "提交中..." : "提交报名"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSignupsOpen} onOpenChange={setIsSignupsOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>报名列表</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {selected ? selected.title : ""} · 报名人数 {selected?.signup_count ?? 0}
            </div>
            {isLoadingSignups ? (
              <div className="text-sm text-muted-foreground">加载中...</div>
            ) : signups.length === 0 ? (
              <div className="text-sm text-muted-foreground">暂无报名</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {signups.map((signup) => (
                  <div key={signup.id} className="border-b last:border-b-0 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{signup.name}</span>
                      {signup.contact ? (
                        <span className="text-muted-foreground">{signup.contact}</span>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {new Date(signup.created_at).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    {signup.notes ? (
                      <div className="text-xs text-muted-foreground mt-1">{signup.notes}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsSignupsOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>分享活动公告</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">{selected ? selected.title : ""}</div>
            <div className="space-y-2">
              <Label htmlFor="announcement-share-link">分享链接</Label>
              <Input id="announcement-share-link" value={shareLink} readOnly />
            </div>
            {shareLink ? (
              <div className="flex justify-center rounded-md border p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareLink)}`}
                  alt="活动公告分享二维码"
                  className="h-44 w-44"
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                if (!shareLink) return;
                await navigator.clipboard.writeText(shareLink);
                showAlert("已复制分享链接");
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              复制链接
            </Button>
            <Button type="button" onClick={() => setIsShareOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
