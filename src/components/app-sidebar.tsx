"use client";

import { Home, FileText, LogOut, Plus } from "lucide-react";
import { api } from "@/trpc/react";
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
import { useRouter } from "next/navigation";

interface AppSidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onSignOut?: () => void;
  selectedSheetId?: string | null;
  onSelectSheet?: (sheetId: string) => void;
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/welcome",
    icon: Home,
  },
  {
    title: "Templates",
    href: "/templates",
    icon: FileText,
  },
];

export function AppSidebar({ user, onSignOut, selectedSheetId, onSelectSheet }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: sheets } = api.sheet.list.useQuery();

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
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="VibeSurfing"
            width={32}
            height={32}
            className="rounded"
          />
          <span className="font-semibold text-lg text-foreground">
            VibeSurfing
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/welcome">
                    <Plus className="w-4 h-4" />
                    <span>New Sheet</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/templates/new">
                    <Plus className="w-4 h-4" />
                    <span>New Template</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Most Recent Sheets</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sheets && sheets.length > 0 ? (
                sheets
                  .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
                  .slice(0, 5)
                  .map((sheet) => {
                  const isActive = selectedSheetId === sheet.id;
                  return (
                    <SidebarMenuItem key={sheet.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                      >
                        <Link href={`/sheets/${sheet.id}`}>
                          <FileText className="w-4 h-4" />
                          <span className="truncate">{sheet.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })
              ) : (
                <SidebarMenuItem>
                  <div className="px-2 py-1 text-sm text-muted-foreground">
                    No sheets yet
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
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
