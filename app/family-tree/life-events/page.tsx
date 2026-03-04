import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { LifeEventsLoader } from "./life-events-loader";

interface PageProps {
  searchParams: Promise<{ memberId?: string }>;
}

async function LifeEventsWrapper({ searchParams }: { searchParams: Promise<{ memberId?: string }> }) {
  const params = await searchParams;
  const memberId = params.memberId ? parseInt(params.memberId, 10) : null;
  
  return <LifeEventsLoader memberId={memberId} />;
}

export default function LifeEventsPage({ searchParams }: PageProps) {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-6">生平事迹</h1>
      
      <Suspense fallback={<div className="animate-pulse h-96 bg-stone-100 dark:bg-stone-800 rounded-lg"></div>}>
        <LifeEventsWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
