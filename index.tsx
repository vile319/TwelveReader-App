import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime globally before any components load
// This ensures consistent settings across all models
ort.env.wasm.numThreads = 1; // Single thread to avoid crossOriginIsolated requirement
ort.env.wasm.simd = true; // Enable SIMD if available
ort.env.wasm.wasmPaths = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.17.3/';
ort.env.logLevel = 'warning'; // Reduce log verbosity

// Also configure transformers.js if it's loaded
(async () => {
  try {
    const { env } = await import('@huggingface/transformers');
    if (env.backends?.onnx) {
      env.backends.onnx.wasm = {
        ...env.backends.onnx.wasm,
        numThreads: 1,
      };
    }
  } catch (e) {
    // Transformers.js might not be loaded yet, that's ok
  }
})();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for model caching (once page loads)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(() => {
        console.log('🛟 Service worker registered – model files will be cached for offline use.');
      })
      .catch((err) => {
        console.warn('⚠️ Service worker registration failed:', err);
      });
  });
}