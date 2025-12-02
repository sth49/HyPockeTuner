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
            src: "/HyPockeTuner_new/logo192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/HyPockeTuner_new/logo512.png", 
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/HyPockeTuner_new/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/HyPockeTuner_new/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },

      injectManifest: {
        globPatterns: ["**/*.{js,css,html}"],
        swDest: "dist/sw.js",
        globIgnores: [
          "**/node_modules/**/*",
          "service-worker.js",
          "**/apple-touch-icon.png",
          "**/logo192.png",
          "**/logo512.png",
          "**/*.svg"
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
