/* eslint-disable no-restricted-globals */
// Simple offline-first service worker for caching Kokoro model files so they don't
// need to be re-downloaded on subsequent visits. This works for both GPU (WebGPU)
// and CPU (WASM) variants because we cache based on the full request URL.

const CACHE_NAME = 'models';

// Match large model files and tokenizer data from HuggingFace
// Adjust extensions if additional files should be cached.
const MODEL_FILE_REGEX = /\/Kokoro-82M.*\.(onnx|bin|json|params|safetensors)$/i;

self.addEventListener('install', (event) => {
  // Activate immediately after installation
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Become available to all pages
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (MODEL_FILE_REGEX.test(request.url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }),
    );
  }
});