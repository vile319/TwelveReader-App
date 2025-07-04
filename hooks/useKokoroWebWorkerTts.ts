import { useState, useCallback, useRef, useEffect } from 'react';
import { KokoroTTS } from 'kokoro-js';
import { AppError } from '../types';

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
  const [canScrub, setCanScrub] = useState<boolean>(false);

  const ttsRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const currentSynthesisRef = useRef<string | null>(null);
  
  // Enhanced audio refs for scrubbing
  const completeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  
  // New continuous audio buffer system
  const audioBufferRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(24000);
  const playbackPositionRef = useRef<number>(0);
  const isPlaybackActiveRef = useRef<boolean>(false);

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

  // Continuous audio playback system
  const startContinuousPlayback = useCallback(async () => {
    if (isPlaybackActiveRef.current) return;
    
    isPlaybackActiveRef.current = true;
    console.log('🎵 Starting continuous audio playback');
    
    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🎵 Created new audio context');
      }

      console.log(`🎵 Audio context state: ${audioContextRef.current.state}`);

      // Resume context if suspended
      if (audioContextRef.current.state === 'suspended') {
        console.log('🎵 Resuming suspended audio context...');
        await audioContextRef.current.resume();
        console.log(`🎵 Audio context resumed, new state: ${audioContextRef.current.state}`);
      }

      const playNextChunk = async () => {
        // Check if we have audio data to play
        if (audioBufferRef.current.length === 0) {
          // No more audio, check if synthesis is still active
          if (currentSynthesisRef.current) {
            // Synthesis still running, wait a bit and try again
                    console.log(`⏳ Buffer empty, waiting for audio... (synthesis active)`);
        setTimeout(playNextChunk, 100);
            return;
          } else {
            // Synthesis complete and no more audio
            isPlaybackActiveRef.current = false;
            setIsPlaying(false);
            setStatus('🚀 Kokoro AI ready - All international voices available!');
            console.log('🎉 Continuous playback completed');
            return;
          }
        }

        // Get next audio chunk
        const audioData = audioBufferRef.current.shift()!;
        console.log(`🔊 Playing continuous chunk - ${audioData.length} samples (${audioBufferRef.current.length} remaining in buffer)`);

        // Create and play audio buffer
        const audioBuffer = audioContextRef.current!.createBuffer(1, audioData.length, sampleRateRef.current);
        const channelData = audioBuffer.getChannelData(0);
        channelData.set(audioData);

        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current!.destination);
        
        sourceNodeRef.current = source;
        
        // Set up audio completion handling
        let hasEnded = false;
        let startTime = performance.now();
        
        const continueToNext = () => {
          if (hasEnded) return; // Prevent double-triggering
          hasEnded = true;
          
          const actualDurationMs = performance.now() - startTime;
          const expectedDurationMs = (audioData.length / sampleRateRef.current) * 1000;
          console.log(`➡️ Audio finished after ${actualDurationMs.toFixed(0)}ms (expected ${expectedDurationMs.toFixed(0)}ms)`);
          console.log(`   ${audioBufferRef.current.length} items remaining in buffer`);
          
          if (Math.abs(actualDurationMs - expectedDurationMs) > 1000) {
            console.warn(`⚠️ Audio duration mismatch! Expected ${expectedDurationMs.toFixed(0)}ms, got ${actualDurationMs.toFixed(0)}ms`);
          }
          
          if (isPlaybackActiveRef.current) {
            // Small delay to prevent audio glitches
            setTimeout(playNextChunk, 10);
          }
        };
        
        // Backup: timeout based on audio duration
        const audioDurationMs = (audioData.length / sampleRateRef.current) * 1000;
        const timeoutId = setTimeout(() => {
          console.log(`⏰ Timeout triggered after ${(performance.now() - startTime).toFixed(0)}ms`);
          console.log(`   Expected duration: ${audioDurationMs.toFixed(0)}ms`);
          continueToNext();
        }, audioDurationMs + 500); // Increased buffer to 500ms
        
        // Primary: normal end event (with timeout cleanup)
        source.onended = () => {
          console.log(`🏁 Source onended fired after ${(performance.now() - startTime).toFixed(0)}ms`);
          clearTimeout(timeoutId);
          continueToNext();
        };
        
        try {
          startTime = performance.now(); // Reset start time right before starting
          source.start();
          console.log(`▶️ Audio started playing - ${audioDurationMs.toFixed(0)}ms expected duration`);
          console.log(`   Samples: ${audioData.length}, Sample rate: ${sampleRateRef.current}Hz`);
        } catch (error) {
          console.error('Error starting audio source:', error);
          clearTimeout(timeoutId);
          continueToNext();
        }
      };

      // Start the continuous playback chain
      playNextChunk();
      
    } catch (error) {
      console.error('Continuous playback error:', error);
      isPlaybackActiveRef.current = false;
      setIsPlaying(false);
    }
  }, []);

  // Scrubbing functions
  const seekToTime = useCallback((time: number) => {
    if (!completeAudioBuffer || !canScrub) return;
    
    const maxTime = duration;
    const clampedTime = Math.max(0, Math.min(time, maxTime));
    
    console.log(`🎯 Seeking to ${clampedTime.toFixed(2)}s`);
    
    // Stop current playback
    if (completeAudioSourceRef.current) {
      try {
        completeAudioSourceRef.current.stop();
      } catch (e) {
        console.log('Audio source already stopped');
      }
      completeAudioSourceRef.current = null;
    }
    
    // Update current time
    setCurrentTime(clampedTime);
    playbackOffsetRef.current = clampedTime;
    
    // If playing, start from new position
    if (isPlaying) {
      playCompleteAudio(clampedTime);
    }
  }, [completeAudioBuffer, canScrub, duration, isPlaying]);

  const playCompleteAudio = useCallback(async (startTime: number = 0) => {
    if (!completeAudioBuffer || !audioContextRef.current) return;
    
    try {
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
      
      // Start progress updates
      const updateProgress = () => {
        if (isPlaying && completeAudioSourceRef.current) {
          const elapsed = audioContextRef.current!.currentTime - playbackStartTimeRef.current;
          const currentPos = playbackOffsetRef.current + elapsed;
          
          if (currentPos >= duration) {
            // Playback completed
            setIsPlaying(false);
            setCurrentTime(duration);
            completeAudioSourceRef.current = null;
          } else {
            setCurrentTime(currentPos);
            requestAnimationFrame(updateProgress);
          }
        }
      };
      
      source.onended = () => {
        console.log('🏁 Complete audio playback ended');
        setIsPlaying(false);
        setCurrentTime(duration);
        completeAudioSourceRef.current = null;
      };
      
      // Start playing from offset
      source.start(0, startTime);
      requestAnimationFrame(updateProgress);
      
      console.log(`▶️ Started complete audio playback from ${startTime.toFixed(2)}s`);
      
    } catch (error) {
      console.error('Error playing complete audio:', error);
      setIsPlaying(false);
    }
  }, [completeAudioBuffer, completeAudioSampleRate, duration, isPlaying]);

  const togglePlayPause = useCallback(() => {
    if (!canScrub) return;
    
    if (isPlaying) {
      // Pause
      if (completeAudioSourceRef.current) {
        try {
          completeAudioSourceRef.current.stop();
        } catch (e) {
          console.log('Audio source already stopped');
        }
        completeAudioSourceRef.current = null;
      }
      setIsPlaying(false);
      console.log('⏸️ Audio paused');
    } else {
      // Play from current position
      setIsPlaying(true);
      playCompleteAudio(currentTime);
      console.log('▶️ Audio resumed');
    }
  }, [canScrub, isPlaying, currentTime, playCompleteAudio]);

  // Auto-play when audio becomes available
  useEffect(() => {
    if (completeAudioBuffer && canScrub && !isPlaying && currentTime === 0) {
      console.log('🚀 Auto-starting scrubbing playback (audio ready)');
      setIsPlaying(true);
      playCompleteAudio(0);
    }
  }, [completeAudioBuffer, canScrub, isPlaying, currentTime, playCompleteAudio]);

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

      const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: dtype,
        device: device,
        progress_callback: (progress) => {
          if (progress.status === 'progress') {
            const percent = Math.round(progress.progress * 100);
            const deviceLabel = device === 'webgpu' ? 'GPU' : 'CPU';
            setStatus(`Downloading model (${deviceLabel}): ${percent}%`);
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

    setIsPlaying(true);
    currentSynthesisRef.current = text;
    onProgress?.(0);

    // Clear previous audio buffer and scrubbing state
    audioBufferRef.current = [];
    isPlaybackActiveRef.current = false;
    setCompleteAudioBuffer(null);
    setCurrentTime(0);
    setDuration(0);
    setCanScrub(false);

    try {
      console.log(`📚 Processing text (${text.length} characters)`);
      
      // Chunk text for better processing
      const chunks = chunkText(text, 2000);
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
        
        console.log(`✅ Chunk ${i + 1} processed: ${audioData.length} samples`);
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

      // Store complete audio for scrubbing
      setCompleteAudioBuffer(combinedAudio);
      setCompleteAudioSampleRate(sampleRate);
      setDuration(combinedAudio.length / sampleRate);
      setCanScrub(true);
      setCurrentTime(0);

      onProgress?.(100);
      setStatus(`🎵 Audio ready! ${(combinedAudio.length / sampleRate).toFixed(1)}s of audio generated`);
      
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
    // Scrubbing functionality
    canScrub,
    currentTime,
    duration,
    seekToTime,
    togglePlayPause
  };
};

export default useKokoroWebWorkerTts; 