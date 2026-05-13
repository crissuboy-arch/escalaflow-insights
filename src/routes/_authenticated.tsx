import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/providers/AuthProvider";
import logoMark from "@/assets/brand/logo-mark.png";

export const Route = createFileRoute("/_authenticated")({ component: AuthenticatedLayout });

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 animate-fade-in">
          <img
            src={logoMark}
            alt="EscalaFlow"
            width={56}
            height={56}
            className="h-14 w-14 animate-pulse [animation-duration:2.4s]"
          />
          <div className="relative h-px w-32 overflow-hidden rounded-full bg-border/50">
            <div className="absolute inset-y-0 left-0 w-1/2 animate-[shimmer_1.6s_ease_infinite] bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
        </div>
      </div>
    );
  }
  if (!user) return null;
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-4 md:p-6 animate-fade-in"><Outlet /></main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}