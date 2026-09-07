import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'TwelveReader',
          short_name: 'TwelveReader',
          description: 'Local-First AI Audiobook Generator',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          // NOTE: wasm/onnx are deliberately NOT precached. Precaching the 21MB
          // ORT runtime delayed service-worker install on every visit (brutal on
          // iOS cellular) for files Cloud users never need. They are
          // runtime-cached on first actual local use instead (see below).
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          maximumFileSizeToCacheInBytes: 500 * 1024 * 1024, // 500MB to allow for ONNX models if local
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/(.*\.)?huggingface\.co\/.*$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'kokoro-models-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              // ORT wasm + pdf worker + lazy model chunks: fetch once, serve
              // from cache after. Same-origin so no CORS concerns.
              urlPattern: /\.(?:wasm|onnx|mjs)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'runtime-binaries-cache',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    build: {
      target: 'esnext',
    },
    optimizeDeps: {
      exclude: ['pdfjs-dist']
    },
    server: {
      host: true // Allow access from iPhone on local network
    },
    worker: {
      format: 'es'
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
