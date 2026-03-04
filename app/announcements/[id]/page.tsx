import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getAnnouncementById } from "@/app/family-tree/announcements/actions";
import { AnnouncementPublic } from "./announcement-public";

interface AnnouncementPublicPageProps {
  params: Promise<{ id: string }>;
}

async function AnnouncementPublicContent({ params }: AnnouncementPublicPageProps) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!id) {
    notFound();
  }

  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="container mx-auto py-10 px-4">
        <AnnouncementPublic announcement={announcement} />
      </div>
    </div>
  );
}

export default function AnnouncementPublicPage(props: AnnouncementPublicPageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50" />}>
      <AnnouncementPublicContent {...props} />
    </Suspense>
  );
}
