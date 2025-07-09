declare module '@huggingface/transformers' {
  /** Global configuration object for the transformers.js runtime in browsers. */
  export const env: {
    /** Enable/disable the browser cache. */
    useBrowserCache?: boolean;
    /** Backend-specific configuration (e.g. ONNX). */
    backends?: Record<string, any>;
    [key: string]: unknown;
  };
}