import { useCallback, useEffect, useRef, useState } from 'react';
import * as ort from 'onnxruntime-web';

/**
 * Extremely lightweight TTS hook for the 25-MB KittenTTS ONNX model.
 * Only implements the functionality that the rest of the UI touches
 * (play / pause, basic timing, ready/loading flags, etc.).
 * Any advanced features that KittenTTS does not provide are stubbed.
 */
const MODEL_URL =
  'https://huggingface.co/KittenML/kitten-tts-nano-0.1/resolve/main/kitten_tts_nano_v0_1.onnx';

// Inject a default wasm path for ONNX Runtime so that the runtime can locate the
// WebAssembly binaries even when the project is bundled. This mirrors the path
// used elsewhere in the app (see `utils/onnxIosConfig.ts`).
if (!ort.env.wasm.wasmPaths) {
  ort.env.wasm.wasmPaths = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.17.3/';
}
const SAMPLE_RATE = 24_000;

export default function useKittenTts() {
  // ────────────────────────────────────────────────
  // Internal state
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('Loading KittenTTS model…');
  const [error, setError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const sessionRef = useRef<ort.InferenceSession | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const timerRef = useRef<number | null>(null);

  // ────────────────────────────────────────────────
  // Model loading
  useEffect(() => {
    let isMounted = true;

    const loadModel = async () => {
      if (!isMounted) return;
      
      try {
        console.log('🐱 Loading KittenTTS model from:', MODEL_URL);
        
        const session = await ort.InferenceSession.create(MODEL_URL, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        });

        if (!isMounted) return;

        // Log model information
        console.log('🐱 KittenTTS model loaded successfully');
        console.log('Model input names:', session.inputNames);
        console.log('Model output names:', session.outputNames);

        sessionRef.current = session;
        setStatus('KittenTTS ready');
        setIsReady(true);
        setIsLoading(false);
        setError(null);
      } catch (e) {
        console.error('KittenTTS model failed to load', e);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        setStatus('KittenTTS unavailable');
        setError(`Failed to load KittenTTS model: ${errorMessage}`);
        setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      isMounted = false;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ────────────────────────────────────────────────
  // Helpers
  const asciiTokenizer = (text: string): Int32Array => {
    // Placeholder tokenizer: map each char → charCode (this works OK for ASCII demo).
    if (!text || typeof text !== 'string') {
      console.error('Invalid text input to tokenizer:', text);
      return new Int32Array([]);
    }
    
    const ids = text.split('').map((c) => c.charCodeAt(0));
    if (ids.length === 0) {
      console.warn('Tokenizer produced empty result for text:', text);
    }
    
    return new Int32Array(ids);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    sourceRef.current?.stop();
    sourceRef.current = null;
    setIsPlaying(false);
    clearTimer();
  }, []);

  const speak = useCallback(async (text: string, _voice = 'expr-voice-2-f', onProgress?: (p: number) => void) => {
    if (!sessionRef.current || !isReady) {
      console.warn('KittenTTS not ready');
      return;
    }
    
    // Validate input text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.error('Invalid input text:', text);
      throw new Error('Text input is empty or invalid');
    }
    
    stop();
    setStatus('Synthesising…');
    setIsLoading(true);
    onProgress?.(0);

    try {
      // Prepare inputs (KittenTTS expects ids + maybe speaker – we only feed ids for now).
      const ids = asciiTokenizer(text.trim());
      console.log('Tokenized input:', { textLength: text.length, idsLength: ids.length, firstFewIds: Array.from(ids.slice(0, 10)) });
      
      const feeds: Record<string, ort.Tensor> = {
        input: new ort.Tensor('int32', ids, [1, ids.length]),
        // Pass speaker-id as a proper BigInt64Array – using plain BigInt crashes in browsers.
        sid: new ort.Tensor('int64', new BigInt64Array([0n]), []), // default speaker
      };

      console.log('Running model inference with feeds:', Object.keys(feeds));
      const result = await sessionRef.current.run(feeds);
      // Model outputs a single float32 buffer named 'audio'
      // Add error handling for undefined result or audio property
      if (!result) {
        throw new Error('KittenTTS model returned no result');
      }
      
      // Check if result has an 'audio' property, if not, try common alternatives
      let audioTensor = result.audio;
      if (!audioTensor) {
        // Try common alternative output names
        const possibleNames = ['output', 'output_0', 'wav', 'waveform', 'speech'];
        for (const name of possibleNames) {
          if (result[name]) {
            audioTensor = result[name];
            console.log(`Found audio output under name: ${name}`);
            break;
          }
        }
        
        if (!audioTensor) {
          console.error('Available output keys:', Object.keys(result));
          throw new Error('KittenTTS model output does not contain expected audio tensor');
        }
      }
      
      const audio = audioTensor.data as Float32Array;
      if (!audio || audio.length === 0) {
        throw new Error('KittenTTS model returned empty or invalid audio data');
      }

      // WebAudio
      const ctx = (ctxRef.current ||= new AudioContext({ sampleRate: SAMPLE_RATE }));
      const buf = ctx.createBuffer(1, audio.length, SAMPLE_RATE);
      buf.copyToChannel(audio, 0);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
      sourceRef.current = src;

      setDuration(buf.duration);
      setCurrentTime(0);
      setIsPlaying(true);
      setStatus('Playing');
      onProgress?.(100); // 100% once audio is ready

      // simple progress timer
      clearTimer();
      timerRef.current = window.setInterval(() => {
        setCurrentTime((t) => {
          const next = Math.min(buf.duration, t + 0.2);
          if (next >= buf.duration) clearTimer();
          return next;
        });
      }, 200);

      src.onended = () => {
        setIsPlaying(false);
        clearTimer();
      };
    } catch (err) {
      console.error('KittenTTS speak() failed', err);
    } finally {
      setIsLoading(false);
    }
  }, [asciiTokenizer, isReady, stop]);

  const togglePlayPause = () => {
    if (!ctxRef.current) return;
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
      setIsPlaying(true);
    } else {
      ctxRef.current.suspend();
      setIsPlaying(false);
    }
  };

  // ────────────────────────────────────────────────
  // Stub / unimplemented helpers required by the UI but
  // not supported by KittenTTS yet.
  const noPromise = async () => {};
  const noBlob = () => null;
  const noop = () => {};

  // ────────────────────────────────────────────────
  // Public API object (matches Kokoro version keys that the UI reads)
  return {
    // basic use
    voices: [
      { name: 'expr-voice-2-f', label: 'expr-voice-2-f', nationality: 'EN', gender: 'F' },
      { name: 'expr-voice-2-m', label: 'expr-voice-2-m', nationality: 'EN', gender: 'M' },
      { name: 'expr-voice-3-f', label: 'expr-voice-3-f', nationality: 'EN', gender: 'F' },
      { name: 'expr-voice-3-m', label: 'expr-voice-3-m', nationality: 'EN', gender: 'M' },
      { name: 'expr-voice-4-f', label: 'expr-voice-4-f', nationality: 'EN', gender: 'F' },
      { name: 'expr-voice-4-m', label: 'expr-voice-4-m', nationality: 'EN', gender: 'M' },
      { name: 'expr-voice-5-f', label: 'expr-voice-5-f', nationality: 'EN', gender: 'F' },
      { name: 'expr-voice-5-m', label: 'expr-voice-5-m', nationality: 'EN', gender: 'M' },
    ],
    speak,
    stop,
    isPlaying,
    isLoading,
    status,
    error,
    canScrub: false,
    currentTime,
    duration,
    // stubs
    seekToTime: noop,
    togglePlayPause,
    skipForward: noop,
    skipBackward: noop,
    wordTimings: [],
    currentWordIndex: -1,
    clearModel: noPromise,
    checkCacheStatus: noPromise,
    debugAudioQuality: noPromise,
    checkAudioQuality: noPromise,
    normalizeAudio: false,
    toggleNormalizeAudio: noop,
    synthesisComplete: true,
    getAudioBlob: noBlob,
    isReady,
    playbackRate: 1,
    setPlaybackRate: (_r: number) => {},
  } as const;
}