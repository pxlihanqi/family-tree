export interface FamilyTreeNavItem {
  href: string;
  label: string;
}

export const FAMILY_TREE_NAV_ITEMS: FamilyTreeNavItem[] = [
  { href: "/family-tree", label: "成员列表" },
  { href: "/family-tree/graph", label: "2D 族谱" },
  { href: "/family-tree/graph-3d", label: "3D 族谱" },
  { href: "/family-tree/timeline", label: "时间轴" },
  { href: "/family-tree/statistics", label: "统计分析" },
  { href: "/family-tree/biography-book", label: "生平册" },
  { href: "/family-tree/memorial", label: "纪念页" },
  { href: "/family-tree/announcements", label: "活动公告" },
  { href: "/family-tree/holiday-moments", label: "活动记录" },
  { href: "/family-tree/photo-annotation", label: "图片标注" },
  { href: "/family-tree/ancestral-halls", label: "祠堂" },
];

export function isActiveFamilyTreeNav(pathname: string, href: string) {
  if (href === "/family-tree") {
    return pathname === "/family-tree";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
