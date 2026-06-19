"use client";

import * as React from "react";
import { showAlert } from "@/lib/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, MapPin, Users } from "lucide-react";
import type { AnnouncementWithStats } from "@/app/family-tree/announcements/actions";
import { signupAnnouncement } from "@/app/family-tree/announcements/actions";

interface AnnouncementPublicProps {
  announcement: AnnouncementWithStats;
}

export function AnnouncementPublic({ announcement }: AnnouncementPublicProps) {
  const [name, setName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isFull = announcement.capacity !== null && announcement.signup_count >= announcement.capacity;

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    const result = await signupAnnouncement({
      announcement_id: announcement.id,
      name,
      contact: contact || null,
      notes: notes || null,
    });
    setIsSubmitting(false);

    if (result) {
      showAlert("报名成功");
      setName("");
      setContact("");
      setNotes("");
      window.location.reload();
    } else {
      showAlert("报名失败，请稍后再试");
    }
  };

  return (
    <div className="space-y-8">
      <div className="border rounded-2xl p-6 bg-white/90 shadow-sm">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">{announcement.title}</h1>
          {announcement.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{announcement.description}</p>
          )}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {announcement.event_date ? announcement.event_date : "时间待定"}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {announcement.location || "地点待定"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {announcement.signup_count}{announcement.capacity ? ` / ${announcement.capacity}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="border rounded-2xl p-6 bg-white/90 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">活动报名</h2>
        {isFull ? (
          <div className="text-sm text-muted-foreground">该活动报名已满。</div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="public-signup-name">姓名</Label>
              <Input id="public-signup-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="public-signup-contact">联系方式</Label>
              <Input id="public-signup-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="public-signup-notes">备注</Label>
              <Textarea id="public-signup-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "提交中..." : "提交报名"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
