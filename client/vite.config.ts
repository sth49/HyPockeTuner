import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vitejs.dev/config/
export default defineConfig({
  base: '/HyPockeTuner_new/', // GitHub 리포지토리 이름에 맞춰 수정
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: undefined, // 자동 등록 완전 비활성화
      injectRegister: false, // 자동 주입 비활성화
      scope: "/HyPockeTuner_new/",
      workbox: {
        // GitHub Pages를 위한 설정
        navigateFallback: null,
      },

      pwaAssets: {
        disabled: true, // PWA assets 생성 비활성화
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
        swDest: "dist/sw.js", // 서비스워커 출력 파일 경로
        // 특정 파일 제외
        globIgnores: [
          "**/node_modules/**/*",
          "service-worker.js",
          "**/apple-touch-icon.png",
          "**/logo192.png",
          "**/logo512.png",
          "**/*.svg"
        ],
        // GitHub Pages base path 고려
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
        enabled: true, // 개발환경에서도 서비스워커 활성화
        navigateFallback: "index.html",
        suppressWarnings: true,
        type: "module",
      },
    }),
  ],
  server: {
    port: 8999, // 또는 원하는 포트
    host: "0.0.0.0", // 모든 IP에서 접근 허용

    // 방법 1: 특정 호스트만 허용
    allowedHosts: ["vis.skku.edu", "localhost", "127.0.0.1"],
  },
});
