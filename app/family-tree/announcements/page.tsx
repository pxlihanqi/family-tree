import { Suspense } from "react";
import { AnnouncementsLoader } from "./announcements-loader";

export default function AnnouncementsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">活动公告</h1>
      <Suspense fallback={<div className="animate-pulse h-96 bg-stone-100 rounded-lg" />}>
        <AnnouncementsLoader />
      </Suspense>
    </div>
  );
}
