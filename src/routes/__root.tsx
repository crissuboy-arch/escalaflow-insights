import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "@/i18n/config";

import appCss from "../styles.css?url";
import faviconUrl from "@/assets/brand/favicon.png";
import ogImageUrl from "@/assets/brand/logo-mark.png";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Flow — AI Mission Control para escalar produtos" },
      { name: "description", content: "Flow é a central de inteligência artificial para minerar, criar e escalar produtos digitais — mineração de ofertas, copy, criativos, página de venda e escala em um único fluxo." },
      { name: "author", content: "Flow" },
      { property: "og:title", content: "Flow — AI Mission Control para escalar produtos" },
      { property: "og:description", content: "Minere. Crie. Escale. A central de IA para operar sua máquina de produtos digitais." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImageUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@flowapp" },
      { name: "twitter:image", content: ogImageUrl },
      { name: "theme-color", content: "#050816" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: faviconUrl },
      { rel: "apple-touch-icon", href: faviconUrl },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
