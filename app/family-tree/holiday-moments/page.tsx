import { Suspense } from "react";
import { HolidayMomentsLoader } from "./holiday-moments-loader";

export default function HolidayMomentsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">活动记录</h1>
      <Suspense fallback={<div className="animate-pulse h-96 bg-stone-100 dark:bg-stone-800 rounded-lg" />}>
        <HolidayMomentsLoader />
      </Suspense>
    </div>
  );
}
