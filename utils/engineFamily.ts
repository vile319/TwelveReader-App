/**
 * Featherweight engine helpers — zero heavy imports by design.
 *
 * Previously these lived in `utils/ttsEngine.ts` next to `loadTtsEngine`,
 * which statically imports `kokoro-js` (+transformers/onnx) and the full
 * Inflect chain (+phonemizer/espeak WASM). Every module importing the family
 * check (hook, context, components) therefore dragged ~2MB of ML stack into
 * the initial bundle, even for Cloud-only users who never run local inference.
 * Keep this file dependency-free.
 */

/** Inflect ships one fixed synthetic male voice — duplicated here to avoid importing the engine. */
export const INFLECT_DEFAULT_VOICE = 'im_owen';

export type EngineFamily = 'kokoro' | 'inflect';

export function getEngineFamily(modelId?: string | null): EngineFamily {
  return modelId && modelId.startsWith('inflect-') ? 'inflect' : 'kokoro';
}

/** Inflect has exactly one voice, so any Kokoro voice id must be remapped. */
export function resolveVoiceForModel(modelId: string | null | undefined, voice: string): string {
  return getEngineFamily(modelId) === 'inflect' ? INFLECT_DEFAULT_VOICE : voice;
}
