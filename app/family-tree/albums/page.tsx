import { Suspense } from "react";
import { AlbumsLoader } from "./albums-loader";

interface PageProps {
  searchParams: Promise<{ memberId?: string }>;
}

async function AlbumsWrapper({ searchParams }: { searchParams: Promise<{ memberId?: string }> }) {
  const params = await searchParams;
  const memberId = params.memberId ? parseInt(params.memberId, 10) : null;
  
  return <AlbumsLoader memberId={memberId} />;
}

export default function AlbumsPage({ searchParams }: PageProps) {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">家族相册</h1>
      
      <Suspense fallback={<div className="animate-pulse h-96 bg-stone-100 dark:bg-stone-800 rounded-lg"></div>}>
        <AlbumsWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
