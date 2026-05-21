import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Search,
  Bookmark,
  TrendingUp,
  Sparkles,
  Heart,
  Settings,
  Radio,
  BookOpen,
  Sparkle,
  Radar,
  FolderKanban,
  Megaphone,
  PenLine,
  LayoutTemplate,
  ShoppingCart,
  Rocket,
  Database,
  Play,
  BookText,
  BrainCircuit,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  getFavCount,
  getSavedCount,
  getScaledCount,
  initAdActionsCache,
  subscribeChange,
} from "@/lib/queries";
import logoHorizontal from "@/assets/brand/logo-horizontal.png";
import logoMark from "@/assets/brand/logo-mark.png";

export function AppSidebar() {
  const { t } = useTranslation();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [favCount, setFavCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [scaledCount, setScaledCount] = useState(0);
  useEffect(() => {
    const sync = () => {
      setFavCount(getFavCount());
      setSavedCount(getSavedCount());
      setScaledCount(getScaledCount());
    };
    initAdActionsCache().finally(sync);
    return subscribeChange(sync);
  }, []);
  type Item = { to: string; label: string; icon: typeof LayoutDashboard; badge?: number };
  const mineracao: Item[] = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/minerar", label: t("nav.mine"), icon: Search },
    { to: "/radar", label: "Radar", icon: Radar },
    { to: "/tiktok-radar", label: "Radar TikTok", icon: Play },
    { to: "/central-mineracao", label: t("nav.miningCenter"), icon: Radio },
    { to: "/ofertas-salvas", label: t("nav.saved"), icon: Bookmark, badge: savedCount },
    { to: "/ofertas-escaladas", label: t("nav.scaled"), icon: TrendingUp, badge: scaledCount },
    { to: "/analise-ia", label: t("nav.ai"), icon: Sparkles },
    { to: "/favoritos", label: t("nav.favorites"), icon: Heart, badge: favCount },
  ];
  const esteira: Item[] = [
    { to: "/projetos", label: "Projetos", icon: FolderKanban },
    { to: "/produtos/ebook", label: "Criar Ebook", icon: BookOpen },
    { to: "/produtos/playbook", label: "Criar Playbook", icon: Sparkle },
    { to: "/storybook", label: "StoryBook IA", icon: BookText },
    { to: "/copy", label: "Copy de Vendas", icon: PenLine },
    { to: "/criativos", label: "Criativos & Anúncios", icon: Megaphone },
    { to: "/pagina-venda", label: "Página de Venda", icon: LayoutTemplate },
    { to: "/checkout", label: "Checkout & Oferta", icon: ShoppingCart },
    { to: "/escala", label: "Escala do Produto", icon: Rocket },
    { to: "/strategic-ai", label: "Strategic AI", icon: BrainCircuit },
  ];
  const conta: Item[] = [
    { to: "/database", label: "Database", icon: Database },
    { to: "/configuracoes", label: t("nav.settings"), icon: Settings },
  ];
  const groups: { label: string; items: Item[] }[] = [
    { label: "Mineração", items: mineracao },
    { label: "Esteira do Produto", items: esteira },
    { label: "Conta", items: conta },
  ];
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-3 py-4 transition-opacity duration-300 animate-fade-in group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-3 group-data-[collapsible=icon]:justify-center"
          aria-label="EscalaFlow"
        >
          <img
            src={logoMark}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 logo-drop-glow group-data-[collapsible=icon]:block hidden"
          />
          <img
            src={logoHorizontal}
            alt="Flow"
            className="h-10 w-auto logo-drop-glow group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={path === it.to}
                      className="relative transition-all duration-200 hover:bg-primary/5 hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-foreground data-[active=true]:shadow-[0_0_0_1px_color-mix(in_oklab,var(--primary)_30%,transparent),0_0_18px_-4px_color-mix(in_oklab,var(--primary)_50%,transparent)] data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-1.5 data-[active=true]:before:bottom-1.5 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-primary data-[active=true]:before:shadow-[0_0_8px_var(--primary)]"
                    >
                      <Link to={it.to} className="flex items-center gap-3">
                        <it.icon className={`h-4 w-4 transition-colors ${path === it.to ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="flex-1">{it.label}</span>
                        {it.badge ? (
                          <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary shadow-[0_0_12px_-2px_var(--primary)] group-data-[collapsible=icon]:hidden">
                            {it.badge}
                          </span>
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
