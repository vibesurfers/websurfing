"use client";

import { Home, FileText, Settings, LogOut, Plus, ChevronRight, Sparkles, Database } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/react";

interface AppSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSignOut?: () => void;
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/welcome",
    icon: Home,
  },
  {
    title: "All Websets",
    href: "/websets",
    icon: Database,
  },
  {
    title: "Templates",
    href: "/templates",
    icon: FileText,
  },
];

export function AppSidebar({ user, onSignOut }: AppSidebarProps) {
  const pathname = usePathname();

  // Query sheets list
  const { data: sheets, isLoading: sheetsLoading } = api.sheet.list.useQuery();

  // Get recent sheets (last 15, reversed to show newest first)
  const recentSheets = sheets ? sheets.slice(-15).reverse() : [];

  const getUserInitials = () => {
    if (!user?.name) return "U";
    const names = user.name.split(" ");
    if (names.length >= 2) {
      return `${names[0]![0]}${names[1]![0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="VibeSurfing"
              width={32}
              height={32}
              className="rounded"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">VibeSurfing</span>
              <span className="text-xs text-muted-foreground">Vibe the Web</span>
            </div>
          </div>
          <SidebarTrigger className="-mr-1" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Websets Group */}
        <SidebarGroup>
          <SidebarGroupLabel>Recent Websets</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Create New Button */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/welcome">
                    <Plus className="w-4 h-4" />
                    <span>Create New</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Loading State */}
              {sheetsLoading && (
                <>
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                </>
              )}

              {/* Sheets List */}
              {!sheetsLoading && recentSheets.map((sheet) => {
                const isActive = pathname.includes(sheet.id);
                return (
                  <SidebarMenuItem key={sheet.id}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={`/sheets/${sheet.id}`} className="flex items-center gap-2">
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate flex-1">{sheet.name}</span>
                        {sheet.isAutonomous && (
                          <Sparkles className="w-3 h-3 flex-shrink-0 text-primary" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* View All Link */}
              {!sheetsLoading && sheets && sheets.length > 15 && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild variant="outline">
                    <Link href="/welcome" className="flex items-center gap-2">
                      <span className="flex-1 text-xs">View all {sheets.length} websets</span>
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {/* Settings Link */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors hover:bg-sidebar-accent mb-2 ${
            pathname === "/settings" ? "bg-sidebar-accent" : ""
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Settings</span>
        </Link>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full hover:bg-sidebar-accent rounded-lg p-2 transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="text-sm font-medium truncate w-full">
                  {user?.name ?? "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {user?.email ?? ""}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
