// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Detect if building for Vercel (VERCEL env var is set during Vercel builds)
const isVercel = process.env.VERCEL === "1";

export default defineConfig({
  // Disable Cloudflare plugin when building for Vercel
  cloudflare: isVercel ? false : undefined,
  vite: {
    server: {
      port: 8082,
      strictPort: true,
    },
    preview: {
      port: 8082,
      strictPort: true,
    },
    // Prevent Vite's dep optimizer from pre-bundling playwright packages in dev.
    // The actual playwright import uses new Function() so bundlers never see it,
    // but optimizeDeps.exclude is a safety net to avoid optimizer warnings.
    optimizeDeps: {
      exclude: ["playwright", "playwright-core", "@playwright/test", "chromium-bidi"],
    },
    build: {
      // Sobe o limite de aviso (o app é grande) e descola as libs pesadas de
      // PDF/export em chunks próprios — reduz o pico de memória do bundler no
      // client e evita um único chunk gigante. Não tocamos na árvore React
      // (o config da Lovable já cuida do dedupe), só libs-folha isoladas.
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return;
            if (/[\\/](jspdf|html2canvas|canvg|pdfjs-dist|pdf-lib)[\\/]/.test(id)) return "vendor-pdf";
            if (/[\\/](xlsx|exceljs|jszip)[\\/]/.test(id)) return "vendor-export";
            if (/[\\/]epubjs?[\\/]/.test(id)) return "vendor-epub";
            return;
          },
        },
      },
    },
    plugins: [
      // Add Nitro plugin for Vercel deployment
      ...(isVercel ? [nitro()] : []),
    ],
  },
});
