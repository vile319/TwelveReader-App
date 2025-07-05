import { useState, useCallback, useRef, useEffect } from 'react';
import { KokoroTTS } from 'kokoro-js';
import { AppError } from '../types';

// Force enable caching for transformers.js
if (typeof window !== 'undefined') {
  // Enable caching explicitly
  const enableCaching = async () => {
    try {
      // Check if we can access the transformers.js env
      const { env } = await import('@huggingface/transformers');
      console.log('🔧 Configuring transformers.js caching...');
      
      // Force enable browser cache
      env.useBrowserCache = true;
      
      // Optional: Also enable file system cache if available
      if (env.backends && env.backends.onnx) {
        env.backends.onnx.useBrowserCache = true;
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
}

export interface AudioChunk {
  index: number;
  text: string;
  audioData: Float32Array;
  sampleRate: number;
  duration: number;
}

const useKokoroWebWorkerTts = ({ onError }: UseKokoroWebWorkerTtsProps) => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('Initializing Kokoro AI...');
  const [currentDevice, setCurrentDevice] = useState<'webgpu' | 'wasm' | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [storedChunks, setStoredChunks] = useState<AudioChunk[]>([]);
  
  // New scrubbing state
  const [completeAudioBuffer, setCompleteAudioBuffer] = useState<Float32Array | null>(null);
  const [completeAudioSampleRate, setCompleteAudioSampleRate] = useState<number>(24000);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [synthesizedDuration, setSynthesizedDuration] = useState<number>(0);
  const [canScrub, setCanScrub] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  
  // Word timing for highlighting
  const [wordTimings, setWordTimings] = useState<Array<{word: string, start: number, end: number}>>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  
  // Helper function to update current word index based on time
  const updateCurrentWordIndex = useCallback((currentTime: number) => {
    if (wordTimings.length === 0) {
      console.log('📝 No word timings available');
      return;
    }
    
    // Find the current word index based on time
    let newIndex = -1;
    for (let i = 0; i < wordTimings.length; i++) {
      const timing = wordTimings[i];
      if (currentTime >= timing.start && currentTime < timing.end) {
        newIndex = i;
        break;
      }
    }
    
    // If we're past the last word, set to -1
    if (newIndex === -1 && currentTime > (wordTimings[wordTimings.length - 1]?.end || 0)) {
      newIndex = -1;
    }
    
    // If we didn't find a word but we're in the middle of the text, find the closest word
    if (newIndex === -1 && currentTime > 0 && currentTime < (wordTimings[wordTimings.length - 1]?.end || 0)) {
      // Find the word we're closest to
      let closestIndex = 0;
      let closestDistance = Math.abs(currentTime - wordTimings[0].start);
      
      for (let i = 1; i < wordTimings.length; i++) {
        const distance = Math.abs(currentTime - wordTimings[i].start);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = i;
        }
      }
      newIndex = closestIndex;
    }
    
    // Update the index using a setter function to avoid stale closure
    setCurrentWordIndex(prevIndex => {
      if (newIndex !== prevIndex) {
        console.log(`📝 Word highlight: ${prevIndex} → ${newIndex} (time: ${currentTime.toFixed(2)}s)`);
        if (newIndex >= 0 && newIndex < wordTimings.length) {
          console.log(`📝 Current word: "${wordTimings[newIndex].word}" (${wordTimings[newIndex].start.toFixed(2)}s - ${wordTimings[newIndex].end.toFixed(2)}s)`);
        }
        return newIndex;
      }
      return prevIndex;
    });
  }, [wordTimings]);

  const ttsRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const currentSynthesisRef = useRef<string | null>(null);
  
  // Enhanced audio refs for scrubbing
  const completeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // New continuous audio buffer system
  const audioBufferRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(24000);
  const playbackPositionRef = useRef<number>(0);
  const isPlaybackActiveRef = useRef<boolean>(false);
  const streamingAudioRef = useRef<Float32Array[]>([]);
  const streamingStartTimeRef = useRef<number>(0);

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
    
    // European Female
    { name: 'ef_dora', label: '🇪🇺 Dora (European Female)', nationality: 'European', gender: 'Female' },
    
    // European Male
    { name: 'em_alex', label: '🇪🇺 Alex (European Male)', nationality: 'European', gender: 'Male' },
    { name: 'em_santa', label: '🎅 Santa (European Male)', nationality: 'European', gender: 'Male' },
    
    // French Female
    { name: 'ff_siwis', label: '🇫🇷 Siwis (French Female)', nationality: 'French', gender: 'Female' },
    
    // Hindi Female
    { name: 'hf_alpha', label: '🇮🇳 Alpha (Hindi Female)', nationality: 'Hindi', gender: 'Female' },
    { name: 'hf_beta', label: '🇮🇳 Beta (Hindi Female)', nationality: 'Hindi', gender: 'Female' },
    
    // Hindi Male
    { name: 'hm_omega', label: '🇮🇳 Omega (Hindi Male)', nationality: 'Hindi', gender: 'Male' },
    { name: 'hm_psi', label: '🇮🇳 Psi (Hindi Male)', nationality: 'Hindi', gender: 'Male' },
    
    // Italian Female
    { name: 'if_sara', label: '🇮🇹 Sara (Italian Female)', nationality: 'Italian', gender: 'Female' },
    
    // Italian Male
    { name: 'im_nicola', label: '🇮🇹 Nicola (Italian Male)', nationality: 'Italian', gender: 'Male' },
    
    // Japanese Female
    { name: 'jf_alpha', label: '🇯🇵 Alpha (Japanese Female)', nationality: 'Japanese', gender: 'Female' },
    { name: 'jf_gongitsune', label: '🦊 Gongitsune (Japanese Female)', nationality: 'Japanese', gender: 'Female' },
    { name: 'jf_nezumi', label: '🐭 Nezumi (Japanese Female)', nationality: 'Japanese', gender: 'Female' },
    { name: 'jf_tebukuro', label: '🧤 Tebukuro (Japanese Female)', nationality: 'Japanese', gender: 'Female' },
    
    // Japanese Male
    { name: 'jm_kumo', label: '🕷️ Kumo (Japanese Male)', nationality: 'Japanese', gender: 'Male' },
    
    // Portuguese Female
    { name: 'pf_dora', label: '🇵🇹 Dora (Portuguese Female)', nationality: 'Portuguese', gender: 'Female' },
    
    // Portuguese Male
    { name: 'pm_alex', label: '🇵🇹 Alex (Portuguese Male)', nationality: 'Portuguese', gender: 'Male' },
    { name: 'pm_santa', label: '🎅 Santa (Portuguese Male)', nationality: 'Portuguese', gender: 'Male' },
    
    // Chinese Female
    { name: 'zf_xiaobei', label: '🇨🇳 Xiaobei (Chinese Female)', nationality: 'Chinese', gender: 'Female' },
    { name: 'zf_xiaoni', label: '🇨🇳 Xiaoni (Chinese Female)', nationality: 'Chinese', gender: 'Female' },
    { name: 'zf_xiaoxiao', label: '🇨🇳 Xiaoxiao (Chinese Female)', nationality: 'Chinese', gender: 'Female' },
    { name: 'zf_xiaoyi', label: '🇨🇳 Xiaoyi (Chinese Female)', nationality: 'Chinese', gender: 'Female' },
    
    // Chinese Male
    { name: 'zm_yunjian', label: '🇨🇳 Yunjian (Chinese Male)', nationality: 'Chinese', gender: 'Male' },
    { name: 'zm_yunxi', label: '🇨🇳 Yunxi (Chinese Male)', nationality: 'Chinese', gender: 'Male' },
    { name: 'zm_yunxia', label: '🇨🇳 Yunxia (Chinese Male)', nationality: 'Chinese', gender: 'Male' },
    { name: 'zm_yunyang', label: '🇨🇳 Yunyang (Chinese Male)', nationality: 'Chinese', gender: 'Male' },
  ];

  // Add audio to buffer (no longer used but keeping for compatibility)
  const addAudioChunk = useCallback((audioData: Float32Array, sampleRate: number) => {
    // This function is no longer used in the new chunking system
    // Audio is now processed and combined in the speak function
    console.log('⚠️ addAudioChunk called but chunking system is in use');
  }, []);

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
    setCurrentTime(clampedTime);
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
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Calculate which chunk to start from
      let samplesPerSecond = sampleRateRef.current;
      let targetSample = Math.floor(startTime * samplesPerSecond);
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
       streamingStartTimeRef.current = audioContextRef.current.currentTime - startTime;
       
       // Start progress tracking for streaming
       const trackStreamingProgress = () => {
         if (isPlaybackActiveRef.current && audioContextRef.current) {
           const elapsed = audioContextRef.current.currentTime - streamingStartTimeRef.current;
           // Calculate max time from streaming audio length
           const totalStreamingSamples = streamingAudioRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
           const maxStreamTime = totalStreamingSamples / sampleRateRef.current;
           const currentPos = Math.max(0, Math.min(elapsed, maxStreamTime));
           setCurrentTime(currentPos);
           
           // Update current word index for highlighting
           updateCurrentWordIndex(currentPos);
           
           requestAnimationFrame(trackStreamingProgress);
         }
       };
       trackStreamingProgress();
       
       playStreamingChunks(chunkIndex, targetSample - currentSample);
      
    } catch (error) {
      console.error('Error starting streaming playback:', error);
      isPlaybackActiveRef.current = false;
      setIsPlaying(false);
    }
  }, []);

  // Play streaming chunks sequentially
  const playStreamingChunks = useCallback(async (startChunkIndex: number = 0, offsetSamples: number = 0) => {
    if (!isPlaybackActiveRef.current) return;
    
    for (let i = startChunkIndex; i < streamingAudioRef.current.length && isPlaybackActiveRef.current; i++) {
      const chunk = streamingAudioRef.current[i];
      const actualChunk = offsetSamples > 0 && i === startChunkIndex 
        ? chunk.slice(offsetSamples) 
        : chunk;
      
      if (actualChunk.length === 0) continue;
      
      // Check if we're still supposed to be playing before each chunk
      if (!isPlaybackActiveRef.current) {
        console.log('🛑 Streaming playback stopped');
        return;
      }
      
      await new Promise<void>((resolve) => {
        if (!audioContextRef.current || !isPlaybackActiveRef.current) {
          resolve();
          return;
        }
        
        const audioBuffer = audioContextRef.current.createBuffer(1, actualChunk.length, sampleRateRef.current);
        audioBuffer.getChannelData(0).set(actualChunk);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        // Store the source so we can stop it if needed
        completeAudioSourceRef.current = source;
        
        let chunkEnded = false;
        source.onended = () => {
          if (!chunkEnded) {
            chunkEnded = true;
            completeAudioSourceRef.current = null;
            resolve();
          }
        };
        
        // If playback is stopped while this chunk is playing, stop immediately
        const checkStop = () => {
          if (!isPlaybackActiveRef.current && !chunkEnded) {
            chunkEnded = true;
            try {
              source.stop();
            } catch (e) {
              // Already stopped
            }
            completeAudioSourceRef.current = null;
            resolve();
          } else if (isPlaybackActiveRef.current && !chunkEnded) {
            setTimeout(checkStop, 50);
          }
        };
        checkStop();
        
        source.start();
        console.log(`🎵 Playing streaming chunk ${i + 1}/${streamingAudioRef.current.length}`);
      });
      
      offsetSamples = 0; // Reset offset after first chunk
    }
    
    // Check if we need to wait for more chunks or if synthesis is complete
    if (isPlaybackActiveRef.current && currentSynthesisRef.current) {
      // Still synthesizing, wait a bit and check for new chunks
      setTimeout(() => {
        if (isPlaybackActiveRef.current) {
          playStreamingChunks(streamingAudioRef.current.length);
        }
      }, 100);
    } else if (isPlaybackActiveRef.current) {
      // Synthesis complete, end of audio
      console.log('🏁 Streaming playback completed');
      setIsPlaying(false);
      isPlaybackActiveRef.current = false;
    }
  }, []);

  const playCompleteAudio = useCallback(async (startTime: number = 0) => {
    if (!completeAudioBuffer || !audioContextRef.current) return;
    
    try {
      // Stop any existing playback first
      if (completeAudioSourceRef.current) {
        try {
          completeAudioSourceRef.current.stop();
        } catch (e) {
          // Already stopped
        }
        completeAudioSourceRef.current = null;
      }
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Create audio buffer
      const audioBuffer = audioContextRef.current.createBuffer(
        1, 
        completeAudioBuffer.length, 
        completeAudioSampleRate
      );
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(completeAudioBuffer);
      
      // Create and configure source
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      completeAudioSourceRef.current = source;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      playbackOffsetRef.current = startTime;
      
      // Start progress updates with both animation frame and interval for reliability
      const progressAnimationRef = { current: 0 };
      const updateProgress = () => {
        // Check if we should continue updating
        if (!completeAudioSourceRef.current) {
          return; // Audio stopped, stop updating
        }
        
        const elapsed = audioContextRef.current!.currentTime - playbackStartTimeRef.current;
        const currentPos = playbackOffsetRef.current + elapsed;
        
        if (currentPos >= duration) {
          // Playback completed
          setIsPlaying(false);
          setCurrentTime(duration);
          updateCurrentWordIndex(duration);
          completeAudioSourceRef.current = null;
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        } else {
          setCurrentTime(currentPos);
          // Update current word index for highlighting
          updateCurrentWordIndex(currentPos);
          // Continue updating regardless of isPlaying state for smooth progress
          progressAnimationRef.current = requestAnimationFrame(updateProgress);
        }
      };
      
      // Also use an interval as backup for consistent updates
      progressIntervalRef.current = setInterval(() => {
        if (completeAudioSourceRef.current && audioContextRef.current) {
          const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
          const currentPos = playbackOffsetRef.current + elapsed;
          
          if (currentPos < duration) {
            setCurrentTime(currentPos);
            updateCurrentWordIndex(currentPos);
          }
        }
      }, 100); // Update every 100ms
      
      source.onended = () => {
        console.log('🏁 Complete audio playback ended');
        // Only set to end if we're actually playing (not manually paused)
        if (isPlaying) {
          setIsPlaying(false);
          setCurrentTime(duration);
          console.log('🏁 Audio completed naturally');
        }
        completeAudioSourceRef.current = null;
        if (progressAnimationRef.current) {
          cancelAnimationFrame(progressAnimationRef.current);
        }
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
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
  }, [completeAudioBuffer, completeAudioSampleRate, duration]);

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
        setCurrentTime(pausedTime);
        playbackOffsetRef.current = pausedTime;
      } else if (completeAudioSourceRef.current && audioContextRef.current) {
        // For complete audio mode
        const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
        const currentPos = playbackOffsetRef.current + elapsed;
        const pausedTime = Math.max(0, Math.min(currentPos, duration));
        console.log(`⏸️ Pausing complete audio at ${pausedTime.toFixed(2)}s`);
        setCurrentTime(pausedTime);
        playbackOffsetRef.current = pausedTime;
      }
      
      setIsPlaying(false);
      isPlaybackActiveRef.current = false; // Stop streaming playback
      
      // Clear progress updates when paused
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Stop any current audio source
      if (completeAudioSourceRef.current) {
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
      
      if (isStreaming && currentTime < synthesizedDuration) {
        // For streaming mode, restart streaming playback
        startStreamingFromPosition(currentTime);
      } else if (completeAudioBuffer) {
        // For complete audio mode
        playCompleteAudio(currentTime);
      }
    }
  }, [canScrub, isPlaying, currentTime, isStreaming, synthesizedDuration, completeAudioBuffer, startStreamingFromPosition, playCompleteAudio]);

  // Don't auto-play - let user control playback
  // Audio is ready when completeAudioBuffer is set

  // Initialize audio context when needed
  useEffect(() => {
    if (canScrub && !audioContextRef.current) {
      console.log('🎵 Initializing audio context for scrubbing');
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, [canScrub]);

  // Detect WebGPU support
  const detectWebGPU = useCallback(async (): Promise<boolean> => {
    if (!(navigator as any).gpu) return false;
    
    try {
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) return false;
      
      const device = await adapter.requestDevice();
      device.destroy();
      return true;
    } catch (error) {
      console.warn('WebGPU detection failed:', error);
      return false;
    }
  }, []);

  // Initialize TTS model
  const initializeTts = useCallback(async () => {
    if (ttsRef.current) return ttsRef.current;

    setIsLoading(true);
    setStatus('Detecting best device for AI model...');

    try {
      // Try WebGPU first, fallback to WASM
      const supportsWebGPU = await detectWebGPU();
      let device: 'wasm' | 'webgpu' = 'wasm';
      let dtype: 'q8' | 'fp32' = 'q8';
      
      if (supportsWebGPU) {
        device = 'webgpu';
        dtype = 'fp32';
        setStatus('🚀 WebGPU detected! Loading model with GPU acceleration... (82MB)');
      } else {
        setStatus('💻 Using CPU optimization - Loading Kokoro AI model... (82MB)');
      }

      console.log(`🎯 TTS Device: ${device} (${dtype})`);

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
      const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: dtype,
        device: device,
        progress_callback: (progress) => {
          if (progress.status === 'progress') {
            const percent = Math.round(progress.progress * 100);
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
          const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
            dtype: 'q8',
            device: 'wasm',
            progress_callback: (progress) => {
              if (progress.status === 'progress') {
                const percent = Math.round(progress.progress * 100);
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

  // Initialize on mount
  useEffect(() => {
    initializeTts();
  }, [initializeTts]);

  // Chunk text for better TTS processing
  const chunkText = useCallback((text: string, maxChunkSize: number = 2000): string[] => {
    if (text.length <= maxChunkSize) {
      return [text];
    }
    
    const chunks: string[] = [];
    let currentIndex = 0;
    
    while (currentIndex < text.length) {
      let endIndex = Math.min(currentIndex + maxChunkSize, text.length);
      
      // Try to break at sentence boundaries
      if (endIndex < text.length) {
        const sentenceEnd = text.lastIndexOf('.', endIndex);
        const exclamationEnd = text.lastIndexOf('!', endIndex);
        const questionEnd = text.lastIndexOf('?', endIndex);
        
        const bestEnd = Math.max(sentenceEnd, exclamationEnd, questionEnd);
        if (bestEnd > currentIndex + maxChunkSize * 0.5) {
          endIndex = bestEnd + 1;
        }
      }
      
      chunks.push(text.slice(currentIndex, endIndex).trim());
      currentIndex = endIndex;
    }
    
    return chunks.filter(chunk => chunk.length > 0);
  }, []);

  // Generate speech
  const speak = useCallback(async (text: string, voice: string = 'af_bella', onProgress?: (progress: number) => void) => {
    if (!isReady || !ttsRef.current) {
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
    setCurrentTime(0);
    setDuration(0);
    setSynthesizedDuration(0);
    setCanScrub(false);
    setIsStreaming(false);
    
    // Clear word timing data
    setWordTimings([]);
    setCurrentWordIndex(-1);
    console.log('📝 Cleared word timings and reset current word index');

    try {
      console.log(`📚 Processing text (${text.length} characters)`);
      
      // Chunk text for better processing - shorter chunks to avoid TTS cutoff
      const chunks = chunkText(text, 500);
      console.log(`📝 Split into ${chunks.length} chunks for processing`);
      
      const allAudioChunks: Float32Array[] = [];
      let totalSamples = 0;
      let sampleRate = 24000;
      const startTime = performance.now();

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkProgress = (i / chunks.length) * 90; // Save 10% for combining
        
        setStatus(`🎯 Synthesizing chunk ${i + 1}/${chunks.length} (${chunkProgress.toFixed(0)}%)...`);
        onProgress?.(chunkProgress);

        if (currentSynthesisRef.current !== text) {
          console.log(`🛑 Synthesis stopped (user stopped)`);
          return;
        }

        console.log(`🔄 Processing chunk ${i + 1}: ${chunk.length} characters`);

        if (!ttsRef.current) {
          throw new Error('TTS model not initialized');
        }

        const audioObject = await ttsRef.current.generate(chunk, { voice: voice });

        // Extract audio data
        let audioData: Float32Array | null = null;

        if (audioObject && typeof audioObject === 'object') {
          if (audioObject.audio && audioObject.audio instanceof Float32Array) {
            audioData = audioObject.audio;
            sampleRate = audioObject.sample_rate || audioObject.sampling_rate || 24000;
          } else if (audioObject.data && audioObject.data instanceof Float32Array) {
            audioData = audioObject.data;
            sampleRate = audioObject.sample_rate || audioObject.sampling_rate || 24000;
          } else if (audioObject instanceof Float32Array) {
            audioData = audioObject;
          } else {
            for (const [key, value] of Object.entries(audioObject)) {
              if (value instanceof Float32Array) {
                audioData = value;
                break;
              }
            }
          }
        }

        if (!audioData || audioData.length === 0) {
          console.error(`❌ No audio data generated for chunk ${i + 1}`);
          continue; // Skip this chunk and continue
        }

                allAudioChunks.push(audioData);
        totalSamples += audioData.length;
        
        // Add to streaming buffer for immediate playback
        streamingAudioRef.current.push(audioData);
        const currentStreamDuration = (totalSamples / sampleRate);
        setSynthesizedDuration(currentStreamDuration);
        
        // Enable streaming controls after first chunk
        if (i === 0) {
          setCanScrub(true);
          setIsStreaming(true);
          
          // Start streaming playback immediately with proper state management
          console.log('🎵 Starting streaming playback with first chunk');
          setIsPlaying(true);
          startStreamingFromPosition(0);
        }
        
        console.log(`✅ Chunk ${i + 1} processed: ${audioData.length} samples (${currentStreamDuration.toFixed(1)}s total)`);
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
      setDuration(combinedAudio.length / sampleRate);
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
      
      // If audio was playing, seamlessly switch to complete audio playback
      if (wasPlaying) {
        console.log('🔄 Switching from streaming to complete audio playback');
        setTimeout(() => {
          playCompleteAudio(currentTime);
        }, 100);
      }

      onProgress?.(100);
      setStatus(`🎵 Audio complete! ${(combinedAudio.length / sampleRate).toFixed(1)}s of audio ready`);
      
      // Calculate and set word timings now that we have the final audio duration
      const actualDuration = combinedAudio.length / sampleRate;
      
      // Calculate word timings - split text into words and estimate timing
      const words = text.split(/\s+/).filter(word => word.length > 0);
      const initialWordTimings: Array<{word: string, start: number, end: number}> = [];
      
      // Estimate timing based on average speaking rate
      let currentWordStart = 0;
      
      words.forEach((word, index) => {
        // More realistic word duration: ~0.4s per word on average
        const wordDuration = Math.max(0.3, word.length * 0.05); // 0.05s per character, min 0.3s
        const wordEnd = currentWordStart + wordDuration;
        
        initialWordTimings.push({
          word: word,
          start: currentWordStart,
          end: wordEnd
        });
        
        currentWordStart = wordEnd; // No gap between words for more accurate timing
      });
      
      // Scale timings to match actual audio duration
      const estimatedDuration = initialWordTimings[initialWordTimings.length - 1]?.end || 1;
      const scaleFactor = actualDuration / estimatedDuration;
      
      const correctedWordTimings = initialWordTimings.map(timing => ({
        word: timing.word,
        start: timing.start * scaleFactor,
        end: timing.end * scaleFactor
      }));
      
      setWordTimings(correctedWordTimings);
      console.log(`📝 ✅ WORD TIMINGS SET! ${words.length} words, ${correctedWordTimings.length} timings`);
      console.log(`📝 Estimated: ${estimatedDuration.toFixed(2)}s → Actual: ${actualDuration.toFixed(2)}s (scale: ${scaleFactor.toFixed(3)})`);
      console.log(`📝 Final word timings:`, correctedWordTimings.slice(0, 3), '...', correctedWordTimings.slice(-3));
      
      // Immediately verify the word timings are set
      setTimeout(() => {
        console.log(`📝 Word timings verification - should not be empty:`, correctedWordTimings.length);
      }, 100);
      
      console.log(`📊 Synthesis Performance:
        • Total characters: ${text.length.toLocaleString()}
        • Total chunks: ${allAudioChunks.length}
        • Synthesis time: ${(synthTime / 1000).toFixed(1)}s
        • Characters per second: ${(text.length / (synthTime / 1000)).toFixed(0)}`);

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

  // Stop current synthesis/playback
  const stop = useCallback(() => {
    console.log('🛑 STOP called - stopping synthesis and playback');
    console.trace('Stop function call stack:'); // This will show what called stop()
    
    // Stop current synthesis
    currentSynthesisRef.current = null;
    
    // Stop continuous playback
    isPlaybackActiveRef.current = false;
    
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

    // Clear audio buffer and reset scrubbing state
    audioBufferRef.current = [];
    playbackPositionRef.current = 0;
    setCompleteAudioBuffer(null);
    setCurrentTime(0);
    setDuration(0);
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
    currentWordIndex
  };
};

export default useKokoroWebWorkerTts; 