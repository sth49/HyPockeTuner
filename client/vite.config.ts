import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vitejs.dev/config/
export default defineConfig({
  base: '/HyPockeTuner_new/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: undefined,
      injectRegister: false,
      scope: "/HyPockeTuner_new/",
      workbox: {
        navigateFallback: null,
      },

      pwaAssets: {
        disabled: true,
        config: false,
      },

      manifest: {
        name: "HyPockeTuner",
        short_name: "HyPockeTuner",
        description: "Hyperparameter optimization system using BOHB algorithm",
        theme_color: "#3B82F6",
        background_color: "#ffffff",
        start_url: "/HyPockeTuner_new/",
        scope: "/HyPockeTuner_new/",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/HyPockeTuner_new/vite.svg",
            sizes: "any",
            type: "image/svg+xml"
          }
        ]
      },

      injectManifest: {
        globPatterns: ["**/*.{js,css,html}"],
        swDest: "dist/sw.js",
        globIgnores: [
          "**/node_modules/**/*",
          "service-worker.js"
        ],
        manifestTransforms: [
          (manifestEntries) => {
            const manifest = manifestEntries.map((entry) => {
              if (entry.url.startsWith('/') && !entry.url.startsWith('/HyPockeTuner_new/')) {
                entry.url = `/HyPockeTuner_new${entry.url}`;
              }
              return entry;
            });
            return { manifest };
          }
        ],
      },

      devOptions: {
        enabled: true,
        navigateFallback: "index.html",
        suppressWarnings: true,
        type: "module",
      },
    }),
  ],
  server: {
    port: 8999,
    host: "0.0.0.0",
    allowedHosts: ["localhost", "127.0.0.1"],
  },
});
