"use client"

import { Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FAMILY_TREE_NAV_ITEMS, isActiveFamilyTreeNav } from "@/components/family-tree-nav-items"

export function MobileNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden border border-border/60">
          <Menu className="h-5 w-5" />
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[90vw] max-w-72 max-h-[80vh] overflow-y-auto">
        {FAMILY_TREE_NAV_ITEMS.map((item) => {
          const isActive = isActiveFamilyTreeNav(pathname, item.href)
          return (
            <DropdownMenuItem key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  "w-full cursor-pointer",
                  isActive && "text-primary font-medium bg-primary/5"
                )}
              >
                {item.label}
              </Link>
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />

        <div className="p-2">
          {children}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
