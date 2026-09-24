/**
 * Navigation model shared by the sidebar, the breadcrumb and the mobile drawer.
 * Reference: PRD section 5 (sitemap, 12 routes).
 */

export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const HOME_ITEM: NavItem = { href: "/", label: "Home" };

export const WORKSPACES: NavGroup[] = [
  {
    label: "Image workspace",
    items: [
      { href: "/image/embed", label: "Embedding" },
      { href: "/image/extract", label: "Extraction" },
      { href: "/image/analysis", label: "Analysis Lab" },
      { href: "/image/compression", label: "Compression Attack" },
    ],
  },
  {
    label: "Audio workspace",
    items: [
      { href: "/audio/embed", label: "Embedding" },
      { href: "/audio/extract", label: "Extraction" },
      { href: "/audio/analysis", label: "Analysis Lab" },
      { href: "/audio/compression", label: "Lossless Compression Test" },
    ],
  },
];

export const RESOURCE_ITEMS: NavItem[] = [
  { href: "/guide", label: "Guide & Team" },
];

/** Every route in the demo, used for the breadcrumb. */
export const ALL_ROUTES: NavItem[] = [
  HOME_ITEM,
  ...WORKSPACES.flatMap((group) => group.items),
  ...RESOURCE_ITEMS,
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
];

export const TEAM = [
  { initials: "YA", name: "Yusuf Abdurrahman", npm: "247006111102" },
  { initials: "SH", name: "Subagas Herlambang", npm: "247006111100" },
  { initials: "RF", name: "Reza Firmansyah", npm: "247006111114" },
] as const;

/** Breadcrumb label for a pathname, e.g. "/image/embed" -> "Workspace / Image / Embedding". */
export function breadcrumbFor(pathname: string): string {
  if (pathname === "/") return "Workspace / Home";

  const match = ALL_ROUTES.find((route) => route.href === pathname);
  const label = match?.label ?? "Home";

  if (pathname.startsWith("/image")) return `Workspace / Image / ${label}`;
  if (pathname.startsWith("/audio")) return `Workspace / Audio / ${label}`;
  return `Workspace / ${label}`;
}
