import React, { useState, useCallback, useRef, useEffect } from 'react';
/* eslint-disable @typescript-eslint/no-unused-vars */
// Touch the default import to avoid TS6133 (React might still be needed by JSX in future refactor)
void React;
import { KokoroTTS } from 'kokoro-js';
import { AppError } from '../types';
import { configureOnnxRuntimeForIOS } from '../utils/onnxIosConfig';

// === HuggingFace Space TTS API URL ===
const HF_TTS_API_URL = 'https://oronto-kokoro-tts-api.hf.space';


// Force enable caching for transformers.js
if (typeof window !== 'undefined') {
  // Enable caching explicitly
  const enableCaching = async () => {
    try {
      // Check if we can access the transformers.js env
      const { env } = await import('@huggingface/transformers');
      console.log('🔧 Configuring transformers.js caching...');

      // Respect user preference for model caching (defaults to ON)
      const keepCached = localStorage.getItem('keepModelCached') !== 'false';
      env.useBrowserCache = keepCached;

      // Optional: Also enable file system cache if available
      if (env.backends && env.backends.onnx) {
        env.backends.onnx.useBrowserCache = keepCached;
      }

      console.log('✅ Browser cache enabled for transformers.js');
    } catch (error) {
      console.warn('⚠️ Could not configure transformers.js caching:', error);
    }
  };

  enableCaching();
}

interface UseKokoroWebWorkerTtsProps {
  onError: (error: AppError) => void;
  enabled?: boolean; // if false, delay model initialization
  selectedModel?: string; // New: selected model ID
  preferredDevice?: 'webgpu' | 'wasm' | 'cpu' | 'serverless'; // New: preferred device
  preferredDtype?: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16'; // New: preferred dtype
}

export interface AudioChunk {
  index: number;
  text: string;
  audioData: Float32Array;
  sampleRate: number;
  duration: number;
}

// Alignment object returned by Kokoro when `return_alignments` is true
type Alignment = {
  word: string;
  start_time: number; // seconds
  end_time: number;   // seconds
};

const useKokoroWebWorkerTts = ({ onError, enabled = true, selectedModel = 'kokoro-82m-fp32', preferredDevice, preferredDtype }: UseKokoroWebWorkerTtsProps) => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Ready to generate audio');
  const [currentDevice, setCurrentDevice] = useState<'webgpu' | 'wasm' | 'cpu' | 'serverless' | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [storedChunks, setStoredChunks] = useState<AudioChunk[]>([]);

  // New scrubbing state
  const [completeAudioBuffer, setCompleteAudioBuffer] = useState<Float32Array | null>(null);
  const [completeAudioSampleRate, setCompleteAudioSampleRate] = useState<number>(24000);
  const [currentTime, setCurrentTime] = useState<number>(0);
  // Always-fresh ref mirror of currentTime — use this inside async/stale-closure contexts
  const currentTimeRef = useRef<number>(0);
  // Helper: update both state (for React renders) and ref (for closures) atomically
  const setCurrentTimeBoth = useCallback((t: number) => {
    currentTimeRef.current = t;
    setCurrentTime(t); // call the raw React setter, not ourselves
  }, []);
  const [duration, setDuration] = useState<number>(0);
  // Always-fresh ref for duration so onended/rAF closures never see stale 0
  const durationRef = useRef<number>(0);
  const setDurationBoth = useCallback((d: number) => { durationRef.current = d; setDuration(d); }, []);
  const [synthesizedDuration, setSynthesizedDuration] = useState<number>(0);
  const [canScrub, setCanScrub] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // Word timing for highlighting
  const [wordTimings, setWordTimings] = useState<Array<{ word: string, start: number, end: number }>>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  // Debug flag to force WASM mode (for WebGPU audio scaling issues)
  const [forceWasmMode, setForceWasmMode] = useState(false);

  // Audio normalization flag to fix scaling issues
  const [normalizeAudio, setNormalizeAudio] = useState(false);

  // New synthesis complete flag
  const [synthesisComplete, setSynthesisComplete] = useState(false);

  // === Playback Rate State ===
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const playbackRateRef = useRef<number>(1);

  // New state for playback trigger
  const [isFirstChunkReady, setIsFirstChunkReady] = useState(false);

  // Ref for last word update time (reserved for future use)
  const wordTimingsRef = useRef(wordTimings);
  wordTimingsRef.current = wordTimings;

  const lastTimeUpdateRef = useRef(0);

  // Helper function to update current word index based on time
  const updateCurrentWordIndex = useCallback((currentTime: number) => {
    const timings = wordTimingsRef.current;
    if (timings.length === 0) {
      console.log('📝 No word timings available');
      return;
    }

    // Find the current word index based on time
    let newIndex = -1;
    for (let i = 0; i < timings.length; i++) {
      const timing = timings[i];
      if (currentTime >= timing.start && currentTime < timing.end) {
        newIndex = i;
        break;
      }
    }

    // If we're past the last word, set to -1
    if (newIndex === -1 && currentTime > (timings[timings.length - 1]?.end || 0)) {
      newIndex = -1;
    }

    // If we didn't find a word but we're in the middle of the text, find the closest word
    if (newIndex === -1 && currentTime > 0 && currentTime < (timings[timings.length - 1]?.end || 0)) {
      // Find the word we're closest to
      let closestIndex = 0;
      let closestDistance = Math.abs(currentTime - timings[0].start);

      for (let i = 1; i < timings.length; i++) {
        const distance = Math.abs(currentTime - timings[i].start);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }
      newIndex = closestIndex;
    }

    // Update the index using a setter function to avoid stale closure
    setCurrentWordIndex((prevIndex: number) => {
      if (newIndex !== prevIndex) {
        console.log(`📝 Word highlight: ${prevIndex} → ${newIndex} (time: ${currentTime.toFixed(2)}s)`);
        if (newIndex >= 0 && newIndex < timings.length) {
          console.log(`📝 Current word: "${timings[newIndex].word}" (${timings[newIndex].start.toFixed(2)}s - ${timings[newIndex].end.toFixed(2)}s)`);
        }
        return newIndex;
      }
      return prevIndex;
    });
  }, [setCurrentWordIndex]);

  const ttsRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const currentSynthesisRef = useRef<string | null>(null);

  // Enhanced audio refs for scrubbing
  const completeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref mirrors of complete-audio state so callbacks read latest values immediately
  // (React setState is async — closures inside speak() see stale state otherwise).
  const completeAudioBufferRef = useRef<Float32Array | null>(null);
  const completeAudioSampleRateRef = useRef<number>(24000);

  // Set true immediately before calling source.stop() for pause/seek.
  // onended inspects this to skip "natural end" handling when stop was intentional.
  const intentionalStopRef = useRef<boolean>(false);

  // Ref to playCompleteAudio so speak() (which doesn't have it in its deps)
  // always calls the LATEST version, never the stale mount-time closure.
  const playCompleteAudioRef = useRef<(startTime?: number) => Promise<void>>(() => Promise.resolve());

  // New continuous audio buffer system
  const audioBufferRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(24000);
  const playbackPositionRef = useRef<number>(0);
  const isPlaybackActiveRef = useRef<boolean>(false);
  const streamingAudioRef = useRef<Float32Array[]>([]);
  const streamingStartTimeRef = useRef<number>(0);
  const scheduledSourceNodesRef = useRef<AudioBufferSourceNode[]>([]);

  // Complete list of all Kokoro voices from Hugging Face
  const voices = [
    // American Female
    { name: 'af_alloy', label: '🇺🇸 Alloy (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_aoede', label: '🇺🇸 Aoede (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_bella', label: '🇺🇸 Bella (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_heart', label: '❤️ Heart (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_jessica', label: '🇺🇸 Jessica (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_kore', label: '🇺🇸 Kore (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_nicole', label: '🇺🇸 Nicole (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_nova', label: '⭐ Nova (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_river', label: '🌊 River (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_sarah', label: '🇺🇸 Sarah (American Female)', nationality: 'American', gender: 'Female' },
    { name: 'af_sky', label: '☁️ Sky (American Female)', nationality: 'American', gender: 'Female' },

    // American Male
    { name: 'am_adam', label: '🇺🇸 Adam (American Male)', nationality: 'American', gender: 'Male' },
    { name: 'am_echo', label: '🔊 Echo (American Male)', nationality: 'American', gender: 'Male' },
    { name: 'am_eric', label: '🇺🇸 Eric (American Male)', nationality: 'American', gender: 'Male' },
    { name: 'am_fenrir', label: '⚡ Fenrir (American Male)', nationality: 'American', gender: 'Male' },
    { name: 'am_liam', label: '🇺🇸 Liam (American Male)', nationality: 'American', gender: 'Male' },
    { name: 'am_michael', label: '🇺🇸 Michael (American Male)', nationality: 'American', gender: 'Male' },
    { name: 'am_onyx', label: '⚫ Onyx (American Male)', nationality: 'American', gender: 'Male' },
    { name: 'am_puck', label: '🎭 Puck (American Male)', nationality: 'American', gender: 'Male' },
    { name: 'am_santa', label: '🎅 Santa (American Male)', nationality: 'American', gender: 'Male' },

    // British Female
    { name: 'bf_alice', label: '🇬🇧 Alice (British Female)', nationality: 'British', gender: 'Female' },
    { name: 'bf_emma', label: '🇬🇧 Emma (British Female)', nationality: 'British', gender: 'Female' },
    { name: 'bf_isabella', label: '🇬🇧 Isabella (British Female)', nationality: 'British', gender: 'Female' },
    { name: 'bf_lily', label: '🌸 Lily (British Female)', nationality: 'British', gender: 'Female' },

    // British Male
    { name: 'bm_daniel', label: '🇬🇧 Daniel (British Male)', nationality: 'British', gender: 'Male' },
    { name: 'bm_fable', label: '📚 Fable (British Male)', nationality: 'British', gender: 'Male' },
    { name: 'bm_george', label: '🇬🇧 George (British Male)', nationality: 'British', gender: 'Male' },
    { name: 'bm_lewis', label: '🇬🇧 Lewis (British Male)', nationality: 'British', gender: 'Male' },
  ];

  // Deprecated: kept as a placeholder for backwards-compatibility with older saves
  // const addAudioChunk = useCallback((audioData: Float32Array, sampleRate: number) => {
  //   console.log('⚠️ addAudioChunk called but chunking system is in use');
  // }, []);

  // Old continuous playback system removed - now using streaming system

  // Scrubbing functions
  const seekToTime = useCallback((time: number) => {
    if (!canScrub) return;

    const maxTime = isStreaming ? synthesizedDuration : duration;
    const clampedTime = Math.max(0, Math.min(time, maxTime));

    console.log(`🎯 Seeking to ${clampedTime.toFixed(2)}s (${isStreaming ? 'streaming' : 'complete'})`);

    const wasPlaying = isPlaying;

    // Clear any pending seek operations
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }

    // Stop current playback immediately
    if (completeAudioSourceRef.current) {
      try {
        completeAudioSourceRef.current.stop();
      } catch (e) {
        console.log('Audio source already stopped');
      }
      completeAudioSourceRef.current = null;
    }

    // Stop streaming playback
    if (isPlaybackActiveRef.current) {
      isPlaybackActiveRef.current = false;
    }

    // Update current time immediately
    setCurrentTimeBoth(clampedTime);
    playbackOffsetRef.current = clampedTime;

    // If was playing, restart from new position with debouncing
    if (wasPlaying) {
      seekTimeoutRef.current = setTimeout(() => {
        seekTimeoutRef.current = null;
        if (isStreaming && clampedTime < synthesizedDuration) {
          // For streaming, restart streaming playback from position
          startStreamingFromPosition(clampedTime);
        } else if (completeAudioBuffer) {
          // For complete audio, use complete playback
          playCompleteAudio(clampedTime);
        }
      }, 50);
    }
  }, [canScrub, duration, synthesizedDuration, isStreaming, isPlaying, completeAudioBuffer]);

  // Start streaming playback from a specific position
  const startStreamingFromPosition = useCallback(async (startTime: number = 0) => {
    if (isPlaybackActiveRef.current) return;

    console.log(`🎵 Starting streaming playback from ${startTime.toFixed(2)}s`);
    isPlaybackActiveRef.current = true;
    setIsPlaying(true);

    // Stop any previously scheduled streaming nodes to prevent overlap if restarted quickly
    scheduledSourceNodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) { }
    });
    scheduledSourceNodesRef.current = [];

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Calculate which chunk to start from
      const samplesPerSecond = sampleRateRef.current;
      const targetSample = Math.floor(startTime * samplesPerSecond);
      let currentSample = 0;
      let chunkIndex = 0;

      // Find the starting chunk
      for (let i = 0; i < streamingAudioRef.current.length; i++) {
        if (currentSample + streamingAudioRef.current[i].length > targetSample) {
          chunkIndex = i;
          break;
        }
        currentSample += streamingAudioRef.current[i].length;
      }

      // Start playback from the appropriate chunk
      streamingStartTimeRef.current = audioContextRef.current.currentTime - startTime / playbackRateRef.current;

      if (!isPlaying) setIsPlaying(true);

      // Start progress tracking for streaming
      const trackStreamingProgress = () => {
        if (isPlaybackActiveRef.current && audioContextRef.current) {
          // elapsed in audio-time (already accounts for playback rate via AudioContext scheduling)
          const elapsed = (audioContextRef.current.currentTime - streamingStartTimeRef.current) * playbackRateRef.current;
          // Calculate max time from streaming audio length
          const totalStreamingSamples = streamingAudioRef.current.reduce((sum: number, chunk: Float32Array) => sum + chunk.length, 0);
          const maxStreamTime = totalStreamingSamples / samplesPerSecond;
          // DO NOT multiply elapsed by playbackRate again — it was already applied above
          const currentPos = Math.max(0, Math.min(elapsed, maxStreamTime));
          setCurrentTimeBoth(currentPos);

          // Update current word index for highlighting (un-throttled for accuracy)
          updateCurrentWordIndex(currentPos);

          requestAnimationFrame(trackStreamingProgress);
        }
      };

      trackStreamingProgress();
      if (audioContextRef.current) {
        playStreamingChunks(chunkIndex, targetSample - currentSample, audioContextRef.current.currentTime);
      }

    } catch (error) {
      console.error('Error starting streaming playback:', error);
      isPlaybackActiveRef.current = false;
      setIsPlaying(false);
    }
  }, []);

  // Play streaming chunks sequentially using precise AudioContext scheduling
  const playStreamingChunks = useCallback(async (startChunkIndex: number = 0, offsetSamples: number = 0, initialNextTime?: number) => {
    if (!isPlaybackActiveRef.current || !audioContextRef.current) return;

    let nextPlayTime = initialNextTime || audioContextRef.current.currentTime;
    let chunksProcessed = 0;

    for (let i = startChunkIndex; i < streamingAudioRef.current.length && isPlaybackActiveRef.current; i++) {
      const chunk = streamingAudioRef.current[i];
      const actualChunk = offsetSamples > 0 && i === startChunkIndex
        ? chunk.slice(offsetSamples)
        : chunk;

      if (actualChunk.length === 0) continue;

      const audioBuffer = audioContextRef.current.createBuffer(1, actualChunk.length, sampleRateRef.current);
      audioBuffer.getChannelData(0).set(actualChunk);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      try {
        source.playbackRate.value = playbackRateRef.current;
      } catch { }
      source.connect(audioContextRef.current.destination);
      scheduledSourceNodesRef.current.push(source);

      // Ensure we don't schedule in the past
      nextPlayTime = Math.max(audioContextRef.current.currentTime, nextPlayTime);

      source.start(nextPlayTime);
      console.log(`🎵 Scheduled streaming chunk ${i + 1}/${streamingAudioRef.current.length} at ${nextPlayTime.toFixed(2)}s`);

      // Calculate duration of this chunk considering playback rate
      const chunkDuration = (actualChunk.length / sampleRateRef.current) / playbackRateRef.current;
      nextPlayTime += chunkDuration;

      chunksProcessed++;
      offsetSamples = 0; // Reset offset after first chunk
    }

    const nextStartIndex = startChunkIndex + chunksProcessed;

    // Check if we need to wait for more chunks or if synthesis is complete
    if (isPlaybackActiveRef.current) {
      if (currentSynthesisRef.current && !synthesisComplete) {
        // Still synthesizing, check for new chunks shortly
        setTimeout(() => {
          if (isPlaybackActiveRef.current) {
            playStreamingChunks(nextStartIndex, 0, nextPlayTime);
          }
        }, 100);
      } else if (nextStartIndex >= streamingAudioRef.current.length) {
        // Synthesis complete and all chunks scheduled.
        // We wait for the scheduled time to pass before declaring playback ended.
        const timeRemaining = nextPlayTime - audioContextRef.current.currentTime;
        if (timeRemaining > 0) {
          setTimeout(() => {
            if (isPlaybackActiveRef.current) {
              console.log('🏁 Streaming playback completed naturally');
              setIsPlaying(false);
              isPlaybackActiveRef.current = false;
            }
          }, timeRemaining * 1000);
        } else {
          console.log('🏁 Streaming playback completed');
          setIsPlaying(false);
          isPlaybackActiveRef.current = false;
        }
      }
    }
  }, [synthesisComplete]);

  // Play complete audio buffer from a specific time.
  // Reads from completeAudioBufferRef (always fresh) instead of React state
  // (state may still be null when called mid-synthesis due to async React updates).
  const playCompleteAudio = useCallback(async (startTime: number = 0) => {
    const buf = completeAudioBufferRef.current;
    const rate = completeAudioSampleRateRef.current;
    if (!buf || !audioContextRef.current) return;

    console.log(`🎵 Playing complete audio from ${startTime.toFixed(2)}s`);
    isPlaybackActiveRef.current = true;
    setIsPlaying(true);

    // Stop any currently playing source before starting new one
    if (completeAudioSourceRef.current) {
      intentionalStopRef.current = true;
      try { completeAudioSourceRef.current.stop(); } catch { }
      completeAudioSourceRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    try {
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const audioBuffer = audioContextRef.current.createBuffer(1, buf.length, rate);
      audioBuffer.getChannelData(0).set(buf);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      try { source.playbackRate.value = playbackRateRef.current; } catch { }
      source.connect(audioContextRef.current.destination);

      completeAudioSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      playbackOffsetRef.current = startTime;

      const progressAnimationRef = { current: 0 };
      const updateProgress = () => {
        // Stop the loop if the source was stopped (intentional or natural end)
        if (!completeAudioSourceRef.current || !audioContextRef.current) return;

        const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
        const currentPos = playbackOffsetRef.current + elapsed * playbackRateRef.current;

        // Update word highlight every frame for tight sync
        updateCurrentWordIndex(currentPos);

        // Update displayed time at ~20fps to avoid React re-render thrash
        const now = performance.now();
        if (now - lastTimeUpdateRef.current > 50) {
          lastTimeUpdateRef.current = now;
          setCurrentTimeBoth(currentPos);
        }

        // Always continue the loop while source is alive; onended handles the clean end state
        progressAnimationRef.current = requestAnimationFrame(updateProgress);
      };

      // Remove the setInterval backup — rAF above handles all updates.

      source.onended = () => {
        // If stopped intentionally (pause/seek), skip end-of-audio handling.
        if (intentionalStopRef.current) {
          intentionalStopRef.current = false;
          return;
        }
        const finalDuration = durationRef.current;
        console.log(`🏁 Audio ended naturally at ${finalDuration.toFixed(2)}s — ready to restart`);
        setIsPlaying(false);
        setCurrentTimeBoth(finalDuration);
        updateCurrentWordIndex(finalDuration);
        playbackOffsetRef.current = finalDuration;
        completeAudioSourceRef.current = null;
        if (progressAnimationRef.current) {
          cancelAnimationFrame(progressAnimationRef.current);
          progressAnimationRef.current = 0;
        }
      };

      // Start playing from offset
      source.start(0, startTime);
      progressAnimationRef.current = requestAnimationFrame(updateProgress);

      console.log(`▶️ Started complete audio playback from ${startTime.toFixed(2)}s`);

    } catch (error) {
      console.error('Error playing complete audio:', error);
      setIsPlaying(false);
    }
    // Note: deps intentionally omit completeAudioBuffer/Rate — we read from refs instead.
  }, [duration, updateCurrentWordIndex]);

  // Keep playCompleteAudioRef in sync whenever playCompleteAudio is re-created.
  // This lets speak() (which has a stale closure) always call the latest version.
  useEffect(() => {
    playCompleteAudioRef.current = playCompleteAudio;
  });

  const togglePlayPause = useCallback(() => {
    if (!canScrub) return;

    if (isPlaying) {
      // Pause - capture current time BEFORE stopping to avoid jumping to end
      console.log('⏸️ Pausing audio');

      // Calculate and save current position before stopping
      if (isStreaming && audioContextRef.current) {
        // For streaming mode, use the current time from progress tracking
        const pausedTime = Math.max(0, Math.min(currentTime, synthesizedDuration));
        console.log(`⏸️ Pausing streaming at ${pausedTime.toFixed(2)}s`);
        setCurrentTimeBoth(pausedTime);
        playbackOffsetRef.current = pausedTime;
      } else if (completeAudioSourceRef.current && audioContextRef.current) {
        // For complete audio mode
        const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
        const currentPos = playbackOffsetRef.current + elapsed * playbackRateRef.current;
        const pausedTime = Math.max(0, Math.min(currentPos, duration));
        console.log(`⏸️ Pausing complete audio at ${pausedTime.toFixed(2)}s`);
        setCurrentTimeBoth(pausedTime);
        playbackOffsetRef.current = pausedTime;
      }

      setIsPlaying(false);
      isPlaybackActiveRef.current = false; // Stop streaming playback

      // Also explicitly stop any currently scheduled streaming audio nodes
      scheduledSourceNodesRef.current.forEach(node => {
        try { node.stop(); } catch (e) { }
      });
      scheduledSourceNodesRef.current = [];

      // Clear progress updates when paused
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Set flag BEFORE stop() so onended skips end-of-audio handling
      if (completeAudioSourceRef.current) {
        intentionalStopRef.current = true;
        try {
          completeAudioSourceRef.current.stop();
        } catch (e) {
          console.log('Audio source already stopped');
        }
        completeAudioSourceRef.current = null;
      }

      console.log('⏸️ Paused - all playback stopped');
    } else {
      // Play from current position
      console.log('▶️ Starting audio playback');
      setIsPlaying(true);

      // If we're at (or very near) the end, restart from the beginning
      const effectiveDuration = isStreaming ? synthesizedDuration : duration;
      const atEnd = effectiveDuration > 0 && currentTime >= effectiveDuration - 0.3;
      const startPosition = atEnd ? 0 : currentTime;
      if (atEnd) {
        setCurrentTimeBoth(0);
        playbackOffsetRef.current = 0;
        console.log('🔁 At end — restarting from beginning');
      }

      if (isStreaming && !atEnd && currentTime < synthesizedDuration) {
        startStreamingFromPosition(startPosition);
      } else if (completeAudioBufferRef.current) {
        // Use ref (always fresh) instead of potentially-stale React state
        isPlaybackActiveRef.current = true;
        playCompleteAudio(startPosition);
      }
    }
  }, [canScrub, isPlaying, currentTime, isStreaming, synthesizedDuration, duration, startStreamingFromPosition, playCompleteAudio]);

  // Don't auto-play - let user control playback
  // Audio is ready when completeAudioBuffer is set

  // Initialize audio context when needed
  useEffect(() => {
    if (canScrub && !audioContextRef.current) {
      console.log('🎵 Initializing audio context for scrubbing');
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, [canScrub]);

  // Function to toggle WASM mode
  const toggleForceWasm = useCallback(() => {
    setForceWasmMode((prev: boolean) => !prev);
    console.log('🔧 Force WASM mode:', !forceWasmMode);
  }, [forceWasmMode]);

  // Function to toggle audio normalization
  const toggleNormalizeAudio = useCallback(() => {
    setNormalizeAudio((prev: boolean) => !prev);
    console.log('🔧 Audio normalization:', !normalizeAudio);
  }, [normalizeAudio]);

  // Function to normalize audio if it's clipped/scaled wrong
  const normalizeAudioData = useCallback((audioData: Float32Array): Float32Array => {
    if (!normalizeAudio) return audioData;

    const peak = Math.max(...audioData.map(Math.abs));
    if (peak > 1.0) {
      // Audio is clipped/too loud - normalize it
      const scale = 0.95 / peak; // Scale to 95% to prevent clipping
      console.log(`🔧 Normalizing audio: peak ${peak.toFixed(4)} → scaling by ${scale.toFixed(4)}`);
      return audioData.map(sample => sample * scale);
    }
    return audioData;
  }, [normalizeAudio]);

  // Detect if WebGPU is available and choose the best configuration
  const detectWebGPU = useCallback(async (): Promise<{ device: 'webgpu' | 'wasm' | 'cpu' | 'serverless'; dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16' }> => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Honour explicit WASM override first
    if (forceWasmMode) {
      console.log('🔧 Forcing WASM mode as requested.');
      return { device: 'wasm', dtype: 'q8' };
    }

    // Use user preferences if provided
    if (preferredDevice && preferredDtype) {
      console.log(`🔧 Using user preferences: ${preferredDevice} with ${preferredDtype}`);

      // Validate device availability
      if (preferredDevice === 'webgpu') {
        if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
          try {
            const adapter = await (navigator as any).gpu.requestAdapter();
            if (adapter) {
              return { device: preferredDevice, dtype: preferredDtype };
            } else {
              console.warn('⚠️ WebGPU requested but not available, falling back to WASM');
              return { device: 'wasm', dtype: preferredDtype };
            }
          } catch (e) {
            console.warn('⚠️ WebGPU detection failed:', e);
            return { device: 'wasm', dtype: preferredDtype };
          }
        } else {
          console.warn('⚠️ WebGPU requested but not supported, falling back to WASM');
          return { device: 'wasm', dtype: preferredDtype };
        }
      }

      return { device: preferredDevice, dtype: preferredDtype };
    }

    // Auto-detection logic (fallback)
    if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          console.log(`✅ WebGPU available on ${isMobile ? 'mobile' : 'desktop'}. Using stable fp32 model.`);
          return { device: 'webgpu', dtype: 'fp32' };
        }
      } catch (e) {
        console.warn('⚠️ WebGPU detection failed:', e);
      }
    }

    // Fallback path – CPU (WASM) back-end with quantised model to conserve memory
    console.log('➡️ WebGPU not available or failed, using CPU (wasm) with q8 model.');
    return { device: 'wasm', dtype: 'q8' };
  }, [forceWasmMode, preferredDevice, preferredDtype]);

  // Initialize TTS model
  const initializeTts = useCallback(async () => {
    setIsLoading(true);
    setStatus('Initializing model...');

    // Configure ONNX Runtime for iOS compatibility before any model loading
    try {
      await configureOnnxRuntimeForIOS();
    } catch (error) {
      console.warn('⚠️ iOS configuration failed, continuing with defaults:', error);
    }

    // All device and dtype decision logic is now consolidated in detectWebGPU.
    // Use iOS-optimized settings if available (now bypassing local WASM entirely)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // === CLOUD FIRST: Use HuggingFace Space TTS by default for all devices ===
    // This gives the best quality (full fp32 PyTorch model) and works everywhere.
    // Local WASM is only used when explicitly requested (for offline use).
    const wantsLocal = preferredDevice === 'wasm' || preferredDevice === 'webgpu' || preferredDevice === 'cpu';

    if (!wantsLocal) {
      // Default path: Cloud TTS via HuggingFace Space
      console.log('☁️ Using HuggingFace Space TTS (full quality, all devices)...');
      setIsReady(true);
      setCurrentDevice('serverless');
      setStatus('☁️ Cloud Kokoro AI ready (best quality)');
      setIsLoading(false);
      return;
    }

    // Local WASM path — user explicitly wants offline/local
    if (isIOS) {
      // Warn iOS users that local processing may crash or be very slow
      console.warn('⚠️ iOS + Local WASM: This may not work on your device. Consider using Cloud mode.');
      setStatus('⚠️ Local mode may not work on iPhone — Cloud mode is recommended');
    }


    const { device, dtype } = await detectWebGPU();

    console.log(`🚀 Initializing Kokoro TTS with ${device} and ${dtype}...`);

    try {
      // Check if cache is available
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          console.log('📦 Available caches:', cacheNames);

          // Check specifically for model cache
          const modelCache = await caches.open('models');
          const cachedRequests = await modelCache.keys();
          console.log('📁 Cached model files:', cachedRequests.length);

          if (cachedRequests.length > 0) {
            console.log('🎯 Model appears to be cached - should load faster');
          } else {
            console.log('📥 No cached model files found - will download');
          }
        } catch (error) {
          console.warn('⚠️ Could not check cache:', error);
        }
      }

      const modelLoadStart = performance.now();
      const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
        dtype: dtype,
        device: device,
        progress_callback: (progress: { status: string; progress?: number }) => {
          if (progress.status === 'progress') {
            const percent = Math.round(Math.min((progress.progress ?? 0) * 100, 100));
            const deviceLabel = device === 'webgpu' ? 'GPU' : 'CPU';
            setStatus(`Downloading model (${deviceLabel}): ${percent}%`);
          } else if (progress.status === 'ready') {
            const loadTime = ((performance.now() - modelLoadStart) / 1000).toFixed(1);
            console.log(`⏱️ Model loaded in ${loadTime}s`);
          }
        }
      });

      ttsRef.current = tts;
      setIsReady(true);
      setCurrentDevice(device);
      const deviceEmoji = device === 'webgpu' ? '⚡' : '🖥️';
      const deviceLabel = device === 'webgpu' ? 'GPU-accelerated' : 'CPU-optimized';
      setStatus(`${deviceEmoji} Kokoro AI ready - ${deviceLabel} with all international voices!`);
      return tts;
    } catch (error: any) {
      console.error('Failed to load Kokoro model:', error);

      // If WebGPU failed, try WASM fallback
      if (error.message && (error.message.includes('webgpu') || error.message.includes('WebGPU'))) {
        console.warn('WebGPU failed, falling back to CPU...');
        setStatus('⚠️ GPU failed, trying CPU fallback...');

        try {
          const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
            dtype: 'q8',
            device: 'wasm',
            progress_callback: (progress: { status: string; progress?: number }) => {
              if (progress.status === 'progress') {
                const percent = Math.round(Math.min((progress.progress ?? 0) * 100, 100));
                setStatus(`CPU fallback - Downloading: ${percent}%`);
              }
            }
          });

          ttsRef.current = tts;
          setIsReady(true);
          setCurrentDevice('wasm');
          setStatus('🔄 CPU fallback successful - Kokoro AI ready with all voices!');
          return tts;
        } catch (fallbackError: any) {
          console.error('CPU fallback also failed:', fallbackError);
          onError({
            title: 'Model Loading Error',
            message: `Both GPU and CPU loading failed: ${fallbackError.message}`
          });
          throw fallbackError;
        }
      } else {
        onError({
          title: 'Model Loading Error',
          message: `Failed to load Kokoro model: ${error.message}`
        });
        throw error;
      }
    } finally {
      setIsLoading(false);
    }
  }, [onError, detectWebGPU]);

  // Initialize when enabled flips true or model configuration changes.
  // Cloud/serverless mode initializes immediately without needing model download consent.
  // Local WASM/WebGPU mode requires explicit user consent (enabled flag).
  useEffect(() => {
    const isCloudMode = !preferredDevice || preferredDevice === 'serverless';
    if (isCloudMode || enabled) {
      initializeTts();
    }
  }, [enabled, selectedModel, preferredDevice, preferredDtype, initializeTts]);

  // Chunk text for better TTS processing
  const chunkText = useCallback((text: string, maxChunkSize: number = 2000, firstChunkSize: number = maxChunkSize): string[] => {
    if (text.length <= firstChunkSize && text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let currentIndex = 0;
    let isFirst = true;

    while (currentIndex < text.length) {
      const currentSize = isFirst ? firstChunkSize : maxChunkSize;
      let endIndex = Math.min(currentIndex + currentSize, text.length);

      if (endIndex < text.length) {
        // Try to split at a sentence/clause boundary for smoother audio
        const substr = text.slice(currentIndex, endIndex);
        const lastPunc = Math.max(
          substr.lastIndexOf('. '),
          substr.lastIndexOf('! '),
          substr.lastIndexOf('? '),
          substr.lastIndexOf(', ')
        );

        if (lastPunc > 20) {
          endIndex = currentIndex + lastPunc + 1; // Include the punctuation
        } else if (/\S/.test(text[endIndex])) {
          // Fallback to word boundary
          const lastSpace = text.lastIndexOf(' ', endIndex);
          if (lastSpace > currentIndex + 20) {
            endIndex = lastSpace;
          }
        }
      }

      chunks.push(text.slice(currentIndex, endIndex).trim());
      currentIndex = endIndex;
      isFirst = false;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }, []);

  // Generate speech
  const speak = useCallback(async (text: string, voice: string = 'af_bella', onProgress?: (progress: number) => void) => {
    // If it's a Serverless device, it's always "ready". For WebWorker, check ttsRef.
    const isServerless = currentDevice === 'serverless';
    if (!isReady || (!isServerless && !ttsRef.current)) {
      console.warn('TTS not ready');
      onError({
        title: 'TTS Not Ready',
        message: 'The TTS model is still loading. Please wait...'
      });
      return;
    }

    setIsPlaying(false); // Will be set to true when first chunk starts playing
    currentSynthesisRef.current = text;
    onProgress?.(0);

    // Clear previous audio buffer and scrubbing state
    audioBufferRef.current = [];
    streamingAudioRef.current = [];
    isPlaybackActiveRef.current = false;
    setCompleteAudioBuffer(null);
    setCurrentTimeBoth(0);
    setDurationBoth(0);
    setSynthesizedDuration(0);
    setCanScrub(false);
    setIsStreaming(false);

    // Reset state before new synthesis
    setIsFirstChunkReady(false);
    setWordTimings([]);
    setCurrentWordIndex(-1);
    setSynthesisComplete(false);
    console.log('📝 Cleared word timings and reset current word index');

    try {
      console.log(`📚 Processing text (${text.length} characters)`);

      // First chunk is much smaller (e.g. 80 chars) to ensure instant playback streaming
      const chunks = chunkText(text, 300, 80);
      console.log(`📝 Split into ${chunks.length} chunks for processing`);

      // Process all chunks but in smaller batches to prevent stack overflow
      console.log(`📦 Will process ${chunks.length} chunks (${text.length} characters total)`);
      setStatus(`📦 Processing ${chunks.length} chunks...`);

      const allAudioChunks: Float32Array[] = [];
      let totalSamples = 0;
      let sampleRate = 24000;
      const startTime = performance.now();

      // Process chunks in batches to prevent stack overflow  
      const BATCH_SIZE = 10; // Process 10 chunks at a time

      for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
        console.log(`📦 Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (chunks ${batchStart + 1}-${batchEnd})`);

        // Process this batch of chunks
        for (let i = batchStart; i < batchEnd; i++) {
          const chunk = chunks[i];
          const chunkProgress = (i / chunks.length) * 90; // Save 10% for combining

          setStatus(`🎯 Synthesizing chunk ${i + 1}/${chunks.length} (${chunkProgress.toFixed(0)}%)...`);
          onProgress?.(chunkProgress);

          if (currentSynthesisRef.current !== text) {
            console.log(`🛑 Synthesis stopped after generate() – discarding chunk ${i + 1}`);
            return; // Exit early, abandon this synthesis entirely
          }

          console.log(`🔄 Processing chunk ${i + 1}: ${chunk.length} characters`);

          if (!isServerless && !ttsRef.current) {
            throw new Error('TTS model not initialized');
          }

          let audioData: Float32Array | null = null;
          let audioObject: any = null;

          // Branching logic: Cloud API vs Local WebWorker
          if (isServerless) {
            // === iOS / HuggingFace Space Route ===
            console.log(`☁️ Sending chunk ${i + 1} to HuggingFace TTS API...`);
            const apiStart = performance.now();

            const response = await fetch(`${HF_TTS_API_URL}/tts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: chunk,
                voice: voice,
                speed: 1.0
              })
            });

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(`HuggingFace TTS API failed: ${errData.detail || errData.error || response.statusText}`);
            }

            console.log(`☁️ Received audio from HF TTS API in ${(performance.now() - apiStart).toFixed(0)}ms`);

            // The API returns a WAV file blob. We need to decode it back into a Float32Array for the chunker.
            const arrayBuffer = await response.arrayBuffer();
            if (!audioContextRef.current) {
              audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
            audioData = decodedBuffer.getChannelData(0); // Assuming mono output
            // IMPORTANT: use the rate from the decoded buffer (which is the AudioContext's actual rate after resampling)
            // This ensures all timing math (duration, word timings, progress) uses the right denominator
            sampleRate = decodedBuffer.sampleRate;
            // Keep sampleRateRef in sync so the streaming path also gets the correct rate
            sampleRateRef.current = sampleRate;

            // Mock empty alignments for serverless for now
            audioObject = { alignments: null };

          } else {
            // === Desktop/Android / Local WASM Route ===
            // Request word alignments for precise timing
            audioObject = await ttsRef.current.generate(chunk, {
              voice: voice,
              return_alignments: true
            });

            // Extract audio data
            if (audioObject && typeof audioObject === 'object') {
              if (audioObject.audio && audioObject.audio instanceof Float32Array) {
                audioData = audioObject.audio;
                sampleRate = audioObject.sample_rate || audioObject.sampling_rate || 24000;
              } else if (audioObject.data && audioObject.data instanceof Float32Array) {
                audioData = audioObject.data;
                sampleRate = audioObject.sample_rate || audioObject.sampling_rate || 24000;
              } else if (audioObject instanceof Float32Array) {
                audioData = audioObject;
                // Float32Array carries no metadata — keep whatever sampleRate the model reported earlier (or default 24000)
              } else {
                for (const value of Object.values(audioObject)) {
                  if (value instanceof Float32Array) {
                    audioData = value;
                    break;
                  }
                }
              }
            }
            // Keep sampleRateRef in sync for streaming path consistency
            sampleRateRef.current = sampleRate;
          }

          // === New cancellation check ===
          if (currentSynthesisRef.current !== text) {
            console.log(`🛑 Synthesis stopped after generate() – discarding chunk ${i + 1}`);
            return; // Exit early, abandon this synthesis entirely
          }

          if (!audioData || audioData.length === 0) {
            console.error(`❌ No audio data generated for chunk ${i + 1}`);
            continue; // Skip this chunk and continue
          }

          // Debug audio sample rate and scaling - avoid stack overflow with large arrays
          let peak = 0;
          let rmsSum = 0;
          for (let j = 0; j < audioData!.length; j++) {
            const abs = Math.abs(audioData![j]);
            if (abs > peak) peak = abs;
            rmsSum += audioData![j] * audioData![j];
          }
          const rms = Math.sqrt(rmsSum / audioData!.length);

          console.log(`🎵 Chunk ${i + 1} audio info:`, {
            samples: audioData!.length,
            sampleRate: sampleRate,
            duration: (audioData!.length / sampleRate).toFixed(3) + 's',
            peak: peak.toFixed(4),
            rms: rms.toFixed(4)
          });

          // Apply normalization if enabled
          audioData = normalizeAudioData(audioData!);

          allAudioChunks.push(audioData!);
          totalSamples += audioData!.length;

          // Add to streaming buffer for immediate playback
          streamingAudioRef.current.push(audioData!);
          const currentStreamDuration = (totalSamples / sampleRate);
          setSynthesizedDuration(currentStreamDuration);

          // --- New: Use precise word timings if available ---
          if (audioObject && audioObject.alignments) {
            const chunkOffset = currentStreamDuration - (audioData!.length / sampleRate);
            const alignedTimings = (audioObject.alignments as Alignment[]).map((alignment) => ({
              word: alignment.word,
              start: chunkOffset + alignment.start_time,
              end: chunkOffset + alignment.end_time
            }));

            if (alignedTimings.length > 0) {
              console.log(`📊 Received ${alignedTimings.length} precise word timings for chunk ${i + 1}.`);
              setWordTimings((prev: { word: string; start: number; end: number }[]) => [...prev, ...alignedTimings]);
            }
          } else {
            // Fallback to provisional timings if alignments are not available
            const chunkDuration = audioData!.length / sampleRate;
            const chunkOffset = currentStreamDuration - chunkDuration;
            const wordsInChunk = chunk.split(/\s+/).filter((w: string) => w.length > 0);

            // Kokoro typically adds ~250ms of trailing silence after a chunk (punctuation)
            const trailingSilence = 0.25;
            const activeDuration = Math.max(0.1, chunkDuration - trailingSilence);
            const totalChars = wordsInChunk.reduce((sum: number, word: string) => sum + word.length, 0);
            const timePerChar = totalChars > 0 ? activeDuration / totalChars : 0;

            let wordStart = chunkOffset;
            const provisionalTimings = wordsInChunk.map((w: string, idx: number) => {
              const isLastWord = idx === wordsInChunk.length - 1;
              const wordActiveDur = totalChars > 0 ? (w.length * timePerChar) : (activeDuration / wordsInChunk.length);

              // Only the last word in the chunk holds through the trailing silence
              const wordDur = wordActiveDur + (isLastWord ? (chunkDuration - activeDuration) : 0);
              const timing = {
                word: w,
                start: wordStart,
                end: wordStart + wordDur,
              };
              wordStart += wordDur;
              return timing;
            });

            if (provisionalTimings.length) {
              setWordTimings((prev: { word: string; start: number; end: number }[]) => [...prev, ...provisionalTimings]);
            }
          }

          console.log(`✅ Chunk ${i + 1} processed: ${audioData!.length} samples (${currentStreamDuration.toFixed(1)}s total)`);

          // Start streaming playback after first chunk
          if (i === 0) {
            setCanScrub(true);
            setIsStreaming(true);
            console.log('🎵 First chunk is ready. Setting trigger for playback.');
            setIsFirstChunkReady(true);
          }
        }

        // Allow event loop to breathe between batches
        if (batchEnd < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Combine all audio chunks
      setStatus('🔄 Combining audio chunks...');
      onProgress?.(95);

      if (allAudioChunks.length === 0) {
        throw new Error('No audio data generated from any chunks');
      }

      const combinedAudio = new Float32Array(totalSamples);
      let offset = 0;

      for (const chunk of allAudioChunks) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      const synthTime = performance.now() - startTime;
      console.log(`✅ All text synthesized successfully:`);
      console.log(`   Total chunks: ${allAudioChunks.length}`);
      console.log(`   Total audio: ${combinedAudio.length} samples at ${sampleRate}Hz`);
      console.log(`   Duration: ${(combinedAudio.length / sampleRate).toFixed(1)}s`);
      console.log(`   Time: ${synthTime.toFixed(0)}ms`);

      // Store complete audio for scrubbing and switch from streaming to complete mode
      setCompleteAudioBuffer(combinedAudio);
      setCompleteAudioSampleRate(sampleRate);
      // Mirror into refs immediately — React state updates are async, so these refs
      // ensure playCompleteAudio (called right below) sees the correct values.
      completeAudioBufferRef.current = combinedAudio;
      completeAudioSampleRateRef.current = sampleRate;
      setDurationBoth(combinedAudio.length / sampleRate);
      setSynthesizedDuration(combinedAudio.length / sampleRate);

      // Stop streaming playback before switching to complete mode
      const wasPlaying = isPlaybackActiveRef.current;
      isPlaybackActiveRef.current = false;

      // Stop any current streaming audio source
      if (completeAudioSourceRef.current) {
        try {
          completeAudioSourceRef.current.stop();
        } catch (e) {
          console.log('Streaming audio source already stopped');
        }
        completeAudioSourceRef.current = null;
      }

      setIsStreaming(false); // Switch from streaming to complete mode

      if (wasPlaying) {
        console.log('🔄 Switching from streaming to complete audio playback');
        // Use ref — speak()'s closure doesn't include playCompleteAudio in its deps,
        // so the direct call would use the stale mount-time version with duration=0.
        playCompleteAudioRef.current(currentTimeRef.current);
      }

      onProgress?.(100);
      setStatus(`🎵 Audio complete! ${(combinedAudio.length / sampleRate).toFixed(1)}s of audio ready`);

      // Word timings are now generated provisionally, no final calculation needed.

      console.log(`📊 Synthesis Performance:
        • Total characters: ${text.length.toLocaleString()}
        • Total chunks: ${allAudioChunks.length}
        • Synthesis time: ${(synthTime / 1000).toFixed(1)}s
        • Characters per second: ${(text.length / (synthTime / 1000)).toFixed(0)}`);

      // After synthesis finishes (where you set canScrub true), also set synthesisComplete true
      setSynthesisComplete(true);

    } catch (error: any) {
      console.error('Synthesis error:', error);
      setIsPlaying(false);
      currentSynthesisRef.current = null;
      onError({
        title: 'Synthesis Error',
        message: `Failed to synthesize text: ${error.message}`
      });
    }
  }, [isReady, onError, chunkText]);

  // This effect will trigger playback once the UI is ready after the first chunk
  useEffect(() => {
    if (isFirstChunkReady) {
      console.log('▶️ UI is ready, starting playback.');
      startStreamingFromPosition(0);
    }
  }, [isFirstChunkReady, startStreamingFromPosition]);

  // Stop current synthesis/playback
  const stop = useCallback(() => {
    console.log('🛑 STOP called - stopping synthesis and playback');
    console.trace('Stop function call stack:'); // This will show what called stop()

    // Stop current synthesis
    currentSynthesisRef.current = null;

    // Stop continuous playback
    isPlaybackActiveRef.current = false;

    // Stop any currently scheduled streaming audio nodes
    scheduledSourceNodesRef.current.forEach(node => {
      try { node.stop(); } catch (e) { }
    });
    scheduledSourceNodesRef.current = [];

    // Stop current audio playback
    if (sourceNodeRef.current) {
      try {
        console.log('🛑 Stopping current audio source');
        sourceNodeRef.current.stop();
      } catch (e) {
        console.log('🛑 Audio source already stopped:', e);
      }
      sourceNodeRef.current = null;
    }

    // Stop complete audio playback
    if (completeAudioSourceRef.current) {
      try {
        console.log('🛑 Stopping complete audio source');
        completeAudioSourceRef.current.stop();
      } catch (e) {
        console.log('🛑 Complete audio source already stopped:', e);
      }
      completeAudioSourceRef.current = null;
    }

    // Close AudioContext to release resources (important on memory-constrained devices)
    if (audioContextRef.current) {
      try {
        // Close returns a promise but we don't need to await inside sync function
        audioContextRef.current.close();
      } catch { }
      audioContextRef.current = null;
    }

    // Clear audio buffer and reset scrubbing state
    audioBufferRef.current = [];
    playbackPositionRef.current = 0;
    setCompleteAudioBuffer(null);
    setCurrentTimeBoth(0);
    setDurationBoth(0);
    setCanScrub(false);

    // Reset word highlighting
    setWordTimings([]);
    setCurrentWordIndex(-1);

    // Clear any pending seek operations and progress updates
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    setIsPlaying(false);
    setStatus(isReady ? '🚀 Kokoro AI ready - All international voices available!' : 'Loading Kokoro model...');
  }, [isReady]);

  // Debug mode controls
  const enableDebugMode = useCallback(() => {
    setDebugMode(true);
    setStoredChunks([]);
    console.log('🐛 Debug mode enabled - audio will be stored instead of auto-playing');
  }, []);

  const disableDebugMode = useCallback(() => {
    setDebugMode(false);
    setStoredChunks([]);
    console.log('🎵 Debug mode disabled - audio will auto-play normally');
  }, []);

  const clearChunks = useCallback(() => {
    setStoredChunks([]);
    console.log('🧹 Cleared stored audio');
  }, []);

  // Clear model from memory AND cache
  const clearModel = useCallback(async () => {
    console.log('🧹 Clearing model and cache...');

    // Stop any current operations
    stop();

    // Clear model instance
    if (ttsRef.current) {
      ttsRef.current = null;
    }

    // Clear cache
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        console.log('🗑️ Clearing browser cache...');
        const cacheNames = await caches.keys();
        console.log('📦 Found caches:', cacheNames);

        // Clear all caches (this will force redownload)
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        console.log('✅ All caches cleared');
      } catch (error) {
        console.warn('⚠️ Could not clear cache:', error);
      }
    }

    // Clear IndexedDB cache if it exists
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        console.log('🗑️ Checking IndexedDB...');
        // Clear transformers.js cache in IndexedDB
        const dbDeleteRequest = indexedDB.deleteDatabase('transformers-cache');
        await new Promise((resolve, reject) => {
          dbDeleteRequest.onsuccess = () => resolve(true);
          dbDeleteRequest.onerror = () => reject(dbDeleteRequest.error);
        });
        console.log('✅ IndexedDB cache cleared');
      } catch (error) {
        console.warn('⚠️ Could not clear IndexedDB:', error);
      }
    }

    // Reset state
    setIsReady(false);
    setCurrentDevice(null);
    setStatus('🔄 Model and cache cleared - ready to reload');

    // Optionally reinitialize after clearing
    setTimeout(() => {
      initializeTts();
    }, 1000);
  }, [stop, initializeTts]);

  // Check cache status
  const checkCacheStatus = useCallback(async () => {
    const defaultResult = {
      cached: false,
      fileCount: 0,
      size: 0,
      sizeFormatted: '0KB'
    };

    if (typeof window === 'undefined') return defaultResult;

    try {
      let totalSize = 0;
      let fileCount = 0;

      // Check Cache API
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        console.log('📦 Cache names:', cacheNames);

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          fileCount += requests.length;

          // Try to estimate size
          for (const request of requests) {
            try {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.blob();
                totalSize += blob.size;
              }
            } catch (error) {
              console.warn('Could not get cache entry size:', error);
            }
          }
        }
      }

      const result = {
        cached: fileCount > 0,
        fileCount,
        size: totalSize,
        sizeFormatted: totalSize > 1024 * 1024
          ? `${(totalSize / 1024 / 1024).toFixed(1)}MB`
          : `${(totalSize / 1024).toFixed(1)}KB`
      };

      console.log('📊 Cache status:', result);
      return result;
    } catch (error) {
      console.warn('⚠️ Could not check cache status:', error);
      return defaultResult;
    }
  }, []);

  // Skip forward/backward functions
  const skipForward = useCallback(() => {
    if (!canScrub) return;
    const maxTime = isStreaming ? synthesizedDuration : duration;
    const newTime = Math.min(currentTime + 15, maxTime);
    seekToTime(newTime);
  }, [canScrub, currentTime, duration, synthesizedDuration, isStreaming, seekToTime]);

  const skipBackward = useCallback(() => {
    if (!canScrub) return;
    const newTime = Math.max(currentTime - 15, 0);
    seekToTime(newTime);
  }, [canScrub, currentTime, seekToTime]);

  // Debug audio quality function
  const debugAudioQuality = useCallback(async () => {
    console.log('🔍 === AUDIO QUALITY DEBUG INFO ===');

    // Browser info
    console.log('🌐 Browser:', navigator.userAgent);
    console.log('🖥️ Platform:', navigator.platform);

    // Audio context info
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      console.log('🎵 Audio Context Sample Rate:', ctx.sampleRate);
      console.log('🎵 Audio Context State:', ctx.state);
      console.log('🎵 Audio Context Base Latency:', ctx.baseLatency);
      console.log('🎵 Audio Context Output Latency:', ctx.outputLatency);
    }

    // TTS model info
    if (ttsRef.current) {
      console.log('🤖 TTS Model Device:', currentDevice);
      console.log('🤖 TTS Model Ready:', isReady);

      // Try to get model info
      try {
        const voices = ttsRef.current.list_voices?.() || [];
        console.log('🎭 Available Voices:', voices.length);
      } catch (error) {
        console.log('⚠️ Could not list voices:', error);
      }
    }

    // Hardware info (if available)
    if ('navigator' in window) {
      try {
        const memInfo = (performance as any).memory;
        if (memInfo) {
          console.log('💾 Memory - Used:', Math.round(memInfo.usedJSHeapSize / 1024 / 1024) + 'MB');
          console.log('💾 Memory - Limit:', Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024) + 'MB');
        }
      } catch (error) {
        console.log('⚠️ Memory info not available');
      }

      try {
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
          console.log('🌐 Network - Effective Type:', connection.effectiveType);
          console.log('🌐 Network - Downlink:', connection.downlink, 'Mbps');
        }
      } catch (error) {
        console.log('⚠️ Network info not available');
      }
    }

    // WebGPU info
    if ('gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          console.log('⚡ WebGPU Available');
          const info = await adapter.requestAdapterInfo?.();
          if (info) {
            console.log('⚡ GPU Vendor:', info.vendor);
            console.log('⚡ GPU Device:', info.device);
          }
        }
      } catch (error) {
        console.log('❌ WebGPU Not Available:', error instanceof Error ? error.message : String(error));
      }
    } else {
      console.log('❌ WebGPU Not Supported');
    }

    console.log('🔍 === END DEBUG INFO ===');

    // Return summary for display
    return {
      browser: navigator.userAgent.split(' ').pop() || 'Unknown',
      platform: navigator.platform,
      device: currentDevice,
      sampleRate: audioContextRef.current?.sampleRate || 'Unknown',
      webgpuSupported: 'gpu' in navigator
    };
  }, [currentDevice, isReady]);

  // Enhanced model loading with quality checks
  const checkAudioQuality = useCallback(async (testText: string = "Hello, this is a test.") => {
    if (!ttsRef.current || !isReady) {
      console.warn('⚠️ TTS not ready for quality check');
      return null;
    }

    console.log('🧪 Testing audio quality...');
    const startTime = performance.now();

    try {
      const testAudio = await ttsRef.current.generate(testText, { voice: 'af_bella' });
      const endTime = performance.now();

      let audioData: Float32Array | null = null;
      let sampleRate = 24000;

      // Extract audio data
      if (testAudio && typeof testAudio === 'object') {
        if (testAudio.audio instanceof Float32Array) {
          audioData = testAudio.audio;
          sampleRate = testAudio.sample_rate || 24000;
        } else if (testAudio.data instanceof Float32Array) {
          audioData = testAudio.data;
          sampleRate = testAudio.sample_rate || 24000;
        }
      }

      if (audioData) {
        // Analyze audio quality
        const duration = audioData.length / sampleRate;
        const rms = Math.sqrt(audioData.reduce((sum, val) => sum + val * val, 0) / audioData.length);
        const peak = Math.max(...audioData.map(Math.abs));

        const qualityInfo = {
          generationTime: Math.round(endTime - startTime),
          duration: duration.toFixed(2),
          sampleRate,
          samples: audioData.length,
          rms: rms.toFixed(4),
          peak: peak.toFixed(4),
          device: currentDevice,
          quality: peak > 0.1 && rms > 0.01 ? 'Good' : 'Poor'
        };

        console.log('📊 Audio Quality Report:', qualityInfo);
        return qualityInfo;
      } else {
        console.error('❌ No audio data generated for quality test');
        return null;
      }
    } catch (error) {
      console.error('❌ Audio quality test failed:', error);
      return null;
    }
  }, [isReady, currentDevice]);

  // Utility: get combined audio buffer as WAV Blob
  const getAudioBlob = useCallback((): Blob | null => {
    if (!completeAudioBuffer) return null;

    const numChannels = 1;
    const sampleRate = completeAudioSampleRate;
    const numSamples = completeAudioBuffer.length;

    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    const writeString = (dv: DataView, offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        dv.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    let offset = 0;
    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + numSamples * 2, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4; // PCM format chunk size
    view.setUint16(offset, 1, true); offset += 2; // Audio format (1 = PCM)
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * numChannels * 2, true); offset += 4; // Byte rate
    view.setUint16(offset, numChannels * 2, true); offset += 2; // Block align
    view.setUint16(offset, 16, true); offset += 2; // Bits per sample
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, numSamples * 2, true); offset += 4;

    // Write PCM samples
    let pos = 44;
    for (let i = 0; i < numSamples; i++) {
      let sample = Math.max(-1, Math.min(1, completeAudioBuffer[i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, sample, true);
      pos += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }, [completeAudioBuffer, completeAudioSampleRate]);

  // Load audio WAV blob back into player (for saved books)
  const loadAudioFromBlob = useCallback(async (blob: Blob) => {
    if (!blob) return;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const floatData = new Float32Array(channelData.length);
      floatData.set(channelData);
      setCompleteAudioBuffer(floatData);
      setCompleteAudioSampleRate(audioBuffer.sampleRate);
      setDurationBoth(audioBuffer.duration); // Use setDurationBoth for safety
      setCurrentTimeBoth(0);
      setCanScrub(true);
      setIsStreaming(false);
      setSynthesisComplete(true);
      setWordTimings([]);
      setCurrentWordIndex(-1);
      console.log('📚 Loaded saved audio book');
    } catch (err) {
      console.error('Failed to decode saved audio', err);
    }
  }, [setDurationBoth, setCurrentTimeBoth]);

  const seek = useCallback((time: number) => {
    console.log(`🎤 Seeking to ${time.toFixed(2)}s`);
    // Use the robust seekToTime function which handles all states
    seekToTime(time);
  }, [seekToTime]);

  // NEW: Automatically unlock or create the AudioContext on first user interaction (needed for iOS Safari)
  useEffect(() => {
    const unlock = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
      } catch (e) {
        console.warn('⚠️ Unable to unlock AudioContext:', e);
      }
      document.removeEventListener('touchend', unlock);
      document.removeEventListener('click', unlock);
    };
    // Use once + passive to make sure the handler is lightweight
    document.addEventListener('touchend', unlock, { once: true, passive: true });
    document.addEventListener('click', unlock, { once: true, passive: true });
    return () => {
      document.removeEventListener('touchend', unlock);
      document.removeEventListener('click', unlock);
    };
  }, []);

  // NEW: Expose a primeAudioContext function to be called explicitly by the UI
  // inside synchronous event handlers (e.g. onClick) to satisfy iOS Safari requirements.
  const primeAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      console.log('🔊 AudioContext explicitly primed by UI interaction');
    } catch (e) {
      console.warn('⚠️ Unable to prime AudioContext:', e);
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (rate <= 0) return;
    playbackRateRef.current = rate;
    setPlaybackRateState(rate);

    // Apply new rate to any actively playing sources
    try {
      if (completeAudioSourceRef.current) {
        completeAudioSourceRef.current.playbackRate.value = rate;
      }
      if (sourceNodeRef.current) {
        sourceNodeRef.current.playbackRate.value = rate;
      }
    } catch (e) {
      console.warn('⚠️ Unable to set playbackRate on current source:', e);
    }
  }, [sourceNodeRef, completeAudioSourceRef]);

  return {
    speak,
    stop,
    isReady,
    isPlaying,
    isLoading,
    status,
    voices,
    currentDevice,
    debugMode,
    storedChunks,
    enableDebugMode,
    disableDebugMode,
    clearChunks,
    clearModel,
    checkCacheStatus,
    debugAudioQuality,
    checkAudioQuality,
    // Scrubbing functionality
    canScrub,
    currentTime,
    duration,
    seekToTime,
    togglePlayPause,
    skipForward,
    skipBackward,
    // Word highlighting
    wordTimings,
    currentWordIndex,
    // Debug mode controls
    forceWasmMode,
    toggleForceWasm,
    normalizeAudio,
    toggleNormalizeAudio,
    // New synthesis complete flag
    synthesisComplete,
    // Utility: get combined audio buffer as WAV Blob
    getAudioBlob,
    loadAudioFromBlob,
    seek,
    playbackRate,
    setPlaybackRate,
    primeAudioContext,
  };
};

export default useKokoroWebWorkerTts; 