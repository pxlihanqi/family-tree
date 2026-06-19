"use client";

import * as React from "react";
import { showAlert, showConfirm } from "@/lib/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Calendar, X, Loader2 } from "lucide-react";
import type { LifeEvent } from "./actions";
import { createLifeEvent, updateLifeEvent, deleteLifeEvent } from "./actions";
import { RichTextEditor } from "@/components/rich-text/editor";
import { RichTextViewer } from "@/components/rich-text/viewer";
import { cn } from "@/lib/utils";

interface LifeEventsProps {
  familyMemberId: number;
  lifeEvents: LifeEvent[];
}

export function LifeEvents({ familyMemberId, lifeEvents }: LifeEventsProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<LifeEvent | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  // 表单状态
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [eventDate, setEventDate] = React.useState<string | null>(null);

  // 打开添加对话框
  const handleAddClick = () => {
    setTitle("");
    setDescription("");
    setEventDate(null);
    setIsAddDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEditClick = (event: LifeEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setEventDate(event.event_date);
    setIsEditDialogOpen(true);
  };

  // 处理添加生平事迹
  const handleAddLifeEvent = async () => {
    if (!title.trim()) return;

    setIsLoading(true);

    const result = await createLifeEvent({
      family_member_id: familyMemberId,
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate || null,
    });

    if (result) {
      setIsAddDialogOpen(false);
      window.location.reload();
    } else {
      showAlert("添加生平事迹失败，请稍后再试");
    }

    setIsLoading(false);
  };

  // 处理更新生平事迹
  const handleUpdateLifeEvent = async () => {
    if (!title.trim() || !editingEvent) return;

    setIsLoading(true);

    const result = await updateLifeEvent(editingEvent.id, {
      title: title.trim(),
      description: description.trim() || null,
      event_date: eventDate || null,
    });

    if (result) {
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      window.location.reload();
    } else {
      showAlert("更新生平事迹失败，请稍后再试");
    }

    setIsLoading(false);
  };

  // 处理删除生平事迹
  const handleDeleteLifeEvent = async (eventId: number) => {
    const confirmed = await showConfirm("确定要删除这条生平事迹吗？");
    if (!confirmed) return;

    setIsDeleting(true);

    const result = await deleteLifeEvent(eventId);

    if (result) {
      window.location.reload();
    } else {
      showAlert("删除生平事迹失败，请稍后再试");
    }

    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      {/* 生平事迹标题和添加按钮 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">生平事迹</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            记录家族成员的重要人生事件，按时间轴排序
          </p>
        </div>
        
        <Button onClick={handleAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          添加事迹
        </Button>
      </div>

      {/* 生平事迹列表 */}
      <div className="space-y-4">
        {lifeEvents.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-100 dark:bg-stone-800 mb-4">
              <Calendar className="h-8 w-8 text-stone-400 dark:text-stone-500" />
            </div>
            <p className="text-lg text-stone-500 dark:text-stone-400 mb-4">
              暂无生平事迹记录
            </p>
            <Button onClick={handleAddClick}>
              <Plus className="h-4 w-4 mr-2" />
              添加第一条事迹
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {lifeEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      {event.event_date && (
                        <span className="text-sm text-stone-500 dark:text-stone-400">
                          {new Date(event.event_date).toLocaleDateString("zh-CN")}
                        </span>
                      )}
                      <span>{event.title}</span>
                    </CardTitle>
                    {!event.event_date && (
                      <CardDescription>无具体日期</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditClick(event)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">编辑</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteLifeEvent(event.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">删除</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  {event.description && (
                    <div className="text-sm">
                      <RichTextViewer value={event.description} />
                    </div>
                  )}
                </CardContent>
                <CardFooter className="text-xs text-stone-400 dark:text-stone-500">
                  创建于 {new Date(event.created_at).toLocaleString("zh-CN")}
                  {event.updated_at !== event.created_at && (
                    <span className="ml-2">
                      更新于 {new Date(event.updated_at).toLocaleString("zh-CN")}
                    </span>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 添加生平事迹对话框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>添加生平事迹</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">事件标题</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入事件标题"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">事件描述</Label>
              <RichTextEditor
                id="event-description"
                value={description}
                onChange={setDescription}
                placeholder="输入事件详细描述（可选）"
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">事件日期</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate || ""}
                onChange={(e) => setEventDate(e.target.value || null)}
                placeholder="选择事件日期（可选）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleAddLifeEvent}
              disabled={!title.trim() || isLoading}
            >
              {isLoading ? (
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

      {/* 编辑生平事迹对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑生平事迹</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-event-title">事件标题</Label>
              <Input
                id="edit-event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入事件标题"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-description">事件描述</Label>
              <RichTextEditor
                id="edit-event-description"
                value={description}
                onChange={setDescription}
                placeholder="输入事件详细描述（可选）"
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-date">事件日期</Label>
              <Input
                id="edit-event-date"
                type="date"
                value={eventDate || ""}
                onChange={(e) => setEventDate(e.target.value || null)}
                placeholder="选择事件日期（可选）"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingEvent(null);
              }}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleUpdateLifeEvent}
              disabled={!title.trim() || isLoading}
            >
              {isLoading ? (
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
