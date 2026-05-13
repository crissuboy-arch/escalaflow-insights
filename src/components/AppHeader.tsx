import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Settings } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const initials = (user?.email ?? "U").slice(0, 2).toUpperCase();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
      <SidebarTrigger />
      <div className="ml-auto flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm"><p className="font-medium truncate">{user?.email}</p></div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/configuracoes" className="cursor-pointer"><Settings className="mr-2 h-4 w-4" />{t("nav.settings")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/login" }); }} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />{t("auth.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}