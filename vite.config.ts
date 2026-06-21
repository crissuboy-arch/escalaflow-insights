// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
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
  },
});
