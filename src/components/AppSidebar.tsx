import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Search, Bookmark, TrendingUp, Sparkles, Heart, Settings } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader } from "@/components/ui/sidebar";

export function AppSidebar() {
  const { t } = useTranslation();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const items = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/minerar", label: t("nav.mine"), icon: Search },
    { to: "/ofertas-salvas", label: t("nav.saved"), icon: Bookmark },
    { to: "/ofertas-escaladas", label: t("nav.scaled"), icon: TrendingUp },
    { to: "/analise-ia", label: t("nav.ai"), icon: Sparkles },
    { to: "/favoritos", label: t("nav.favorites"), icon: Heart },
    { to: "/configuracoes", label: t("nav.settings"), icon: Settings },
  ];
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground font-bold" style={{ background: "var(--gradient-primary)" }}>E</div>
          <span className="font-bold tracking-tight group-data-[collapsible=icon]:hidden">EscalaFlow</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => (
                <SidebarMenuItem key={it.to}>
                  <SidebarMenuButton asChild isActive={path === it.to}>
                    <Link to={it.to} className="flex items-center gap-3">
                      <it.icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}