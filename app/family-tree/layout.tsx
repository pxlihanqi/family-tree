import { Suspense } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { MobileNav } from "@/components/mobile-nav";
import { FamilyTreeDesktopNav } from "@/components/family-tree-desktop-nav";
import { FAMILY_NAME } from "@/lib/utils";

export default function FamilyTreeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <header className="border-b sticky top-0 z-40 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-semibold text-base sm:text-lg hover:opacity-80 transition-opacity truncate max-w-[42vw] sm:max-w-none"
          >
            {FAMILY_NAME}
          </Link>

          <FamilyTreeDesktopNav />

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeSwitcher />
            <div className="hidden md:block">
              <Suspense fallback={<div className="h-9 w-32 bg-muted animate-pulse rounded-md" />}>
                <AuthButton />
              </Suspense>
            </div>
            <MobileNav>
              <Suspense fallback={<div className="h-9 w-full bg-muted animate-pulse rounded-md" />}>
                <AuthButton />
              </Suspense>
            </MobileNav>
          </div>
        </div>
      </header>

      {/* 页面内容 */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
