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
    // Playwright + chromium-bidi are Node.js-only — exclude from Vite dep optimizer
    optimizeDeps: {
      exclude: [
        "playwright",
        "playwright-core",
        "@playwright/test",
        "chromium-bidi",
      ],
    },
    ssr: {
      external: [
        "playwright",
        "playwright-core",
        "@playwright/test",
        "chromium-bidi",
      ],
    },
  },
});
