import { Suspense } from "react";
import { MemorialLoader } from "./memorial-loader";

export default function MemorialPage() {
  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <div className="container mx-auto py-12 px-4">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-stone-500">Memorial</p>
          <h1 className="text-2xl sm:text-3xl font-semibold font-serif text-stone-800 mt-2">族谱纪念页</h1>
          <p className="text-sm text-stone-500 mt-2 font-serif">敬香追思，传承祖训</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white/70 shadow-[0_20px_50px_rgba(48,38,25,0.08)] backdrop-blur">
          <div className="p-6 sm:p-8">
            <Suspense fallback={<div className="animate-pulse h-96 bg-stone-100 rounded-lg" />}>
              <MemorialLoader />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
