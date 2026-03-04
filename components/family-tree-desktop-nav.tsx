"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FAMILY_TREE_NAV_ITEMS, isActiveFamilyTreeNav } from "@/components/family-tree-nav-items";

export function FamilyTreeDesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-1 overflow-x-auto max-w-[52vw] lg:max-w-[58vw] pr-1">
      {FAMILY_TREE_NAV_ITEMS.map((item) => {
        const isActive = isActiveFamilyTreeNav(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
