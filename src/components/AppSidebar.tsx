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
    { to: "/copy", label: "Copy de Vendas", icon: PenLine },
    { to: "/criativos", label: "Criativos & Anúncios", icon: Megaphone },
    { to: "/pagina-venda", label: "Página de Venda", icon: LayoutTemplate },
    { to: "/checkout", label: "Checkout & Oferta", icon: ShoppingCart },
    { to: "/escala", label: "Escala do Produto", icon: Rocket },
  ];
  const conta: Item[] = [
    { to: "/configuracoes", label: t("nav.settings"), icon: Settings },
  ];
  const groups: { label: string; items: Item[] }[] = [
    { label: "Mineração", items: mineracao },
    { label: "Esteira do Produto", items: esteira },
    { label: "Conta", items: conta },
  ];
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2" aria-label="EscalaFlow">
          <img
            src={logoMark}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 group-data-[collapsible=icon]:block hidden"
          />
          <img
            src={logoHorizontal}
            alt="EscalaFlow"
            className="h-7 w-auto group-data-[collapsible=icon]:hidden dark:invert dark:brightness-200"
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
                    <SidebarMenuButton asChild isActive={path === it.to}>
                      <Link to={it.to} className="flex items-center gap-3">
                        <it.icon className="h-4 w-4" />
                        <span className="flex-1">{it.label}</span>
                        {it.badge ? (
                          <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary group-data-[collapsible=icon]:hidden">
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
