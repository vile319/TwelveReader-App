declare module 'kokoro-js' {
  /** Minimal constructor options recognised by KokoroTTS */
  export interface KokoroTTSInitOptions {
    /** Device backend to run on – e.g. 'webgpu', 'wasm', 'cpu' */
    device?: string;
    /** Whether to enable caching, etc. */
    [key: string]: unknown;
  }

  /**
   * Very small subset of the Kokoro Text-to-Speech API used in the codebase.
   * It is intentionally loose (many `any` types) so that consumers are typed
   * while we avoid having to replicate the entire upstream definition.
   */
  export class KokoroTTS {
    constructor(opts?: KokoroTTSInitOptions);

    /** Pre-loads the model. */
    loadModel(): Promise<void>;

    /** Synthesise speech. Returns an object whose exact structure depends on options. */
    generate(text: string, options?: Record<string, unknown>): Promise<any>;

    /** Returns the list of available voice IDs (shape is lib-dependent). */
    list_voices(): any[];

    /** Static helper to load a pre-trained model */
    static from_pretrained(modelPath: string, opts?: Record<string, unknown>): Promise<KokoroTTS>;
  }
}