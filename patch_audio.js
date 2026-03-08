const fs = require('fs');
const file = 'c:/Github/TwelveReader-App/hooks/useKokoroWebWorkerTts.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add floatToWav helper
if (!code.includes('const floatToWav =')) {
    code = code.replace(
        "import { configureOnnxRuntimeForIOS } from '../utils/onnxIosConfig';",
        "import { configureOnnxRuntimeForIOS } from '../utils/onnxIosConfig';\n\n// Helper to create WAV for HTMLAudioElement\nconst floatToWav = (float32Array: Float32Array, sampleRate: number): Blob => {\n  const wav = new ArrayBuffer(44 + float32Array.length * 2);\n  const view = new DataView(wav);\n\n  const writeString = (view: DataView, offset: number, string: string) => {\n    for (let i = 0; i < string.length; i++) {\n        view.setUint8(offset + i, string.charCodeAt(i));\n    }\n  };\n\n  writeString(view, 0, 'RIFF');\n  view.setUint32(4, 36 + float32Array.length * 2, true);\n  writeString(view, 8, 'WAVE');\n  writeString(view, 12, 'fmt ');\n  view.setUint32(16, 16, true);\n  view.setUint16(20, 1, true);\n  view.setUint16(22, 1, true);\n  view.setUint32(24, sampleRate, true);\n  view.setUint32(28, sampleRate * 2, true);\n  view.setUint16(32, 2, true);\n  view.setUint16(34, 16, true);\n  writeString(view, 36, 'data');\n  view.setUint32(40, float32Array.length * 2, true);\n\n  const length = float32Array.length;\n  let offset = 44;\n  for (let i = 0; i < length; i++) {\n    const s = Math.max(-1, Math.min(1, float32Array[i]));\n    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);\n    offset += 2;\n  }\n\n  return new Blob([wav], { type: 'audio/wav' });\n};"
    );
}

// 2. Add completeHtmlAudioRef and completeAudioUrlRef
code = code.replace(
    "const completeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);",
    "const completeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);\n  const completeHtmlAudioRef = useRef<HTMLAudioElement | null>(null);\n  const completeAudioUrlRef = useRef<string | null>(null);"
);

// 3. Update playCompleteAudio
const oldPlayCompleteAudio = `  const playCompleteAudio = useCallback(async (startTime: number = 0) => {
    const buf = completeAudioBufferRef.current;
    const rate = completeAudioSampleRateRef.current;
    if (!buf || !audioContextRef.current) return;

    console.log(\`🎵 Playing complete audio from \${startTime.toFixed(2)}s\`);
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
        console.log(\`🏁 Audio ended naturally at \${finalDuration.toFixed(2)}s — ready to restart\`);
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

      console.log(\`▶️ Started complete audio playback from \${startTime.toFixed(2)}s\`);

    } catch (error) {
      console.error('Error playing complete audio:', error);
      setIsPlaying(false);
    }
    // Note: deps intentionally omit completeAudioBuffer/Rate — we read from refs instead.
  }, [duration, updateCurrentWordIndex]);`;

const newPlayCompleteAudio = `  const playCompleteAudio = useCallback(async (startTime: number = 0) => {
    const audio = completeHtmlAudioRef.current;
    if (!audio) return;

    console.log(\`🎵 Playing complete HTML audio from \${startTime.toFixed(2)}s\`);
    isPlaybackActiveRef.current = true;
    setIsPlaying(true);

    intentionalStopRef.current = true;
    audio.pause();
    intentionalStopRef.current = false;

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    try {
      audio.currentTime = startTime;
      audio.playbackRate = playbackRateRef.current;
      audio.preservesPitch = true;

      const progressAnimationRef = { current: 0 };
      const updateProgress = () => {
        if (!isPlaybackActiveRef.current) return;

        const currentPos = audio.currentTime;
        updateCurrentWordIndex(currentPos);

        const now = performance.now();
        if (now - lastTimeUpdateRef.current > 50) {
          lastTimeUpdateRef.current = now;
          setCurrentTimeBoth(currentPos);
        }
        progressAnimationRef.current = requestAnimationFrame(updateProgress);
      };

      audio.onended = () => {
        if (intentionalStopRef.current) {
          intentionalStopRef.current = false;
          return;
        }
        const finalDuration = durationRef.current;
        console.log(\`🏁 Audio ended naturally at \${finalDuration.toFixed(2)}s\`);
        setIsPlaying(false);
        isPlaybackActiveRef.current = false;
        setCurrentTimeBoth(finalDuration);
        updateCurrentWordIndex(finalDuration);
        
        if (progressAnimationRef.current) {
          cancelAnimationFrame(progressAnimationRef.current);
        }
      };

      await audio.play();
      progressAnimationRef.current = requestAnimationFrame(updateProgress);
      console.log(\`▶️ Started HTML audio from \${startTime.toFixed(2)}s\`);

    } catch (error) {
      console.error('Error playing complete HTML audio:', error);
      setIsPlaying(false);
    }
  }, [duration, updateCurrentWordIndex]);`;

code = code.replace(oldPlayCompleteAudio, newPlayCompleteAudio);

// 4. Update 'speak' generation to create the WAV, replace completeAudioSourceRef stop
code = code.replace(
    `      // Stop any current streaming audio source
      if (completeAudioSourceRef.current) {
        try {
          completeAudioSourceRef.current.stop();
        } catch (e) {
          console.log('Streaming audio source already stopped');
        }
        completeAudioSourceRef.current = null;
      }`,
    `      // Stop any current streaming audio source
      if (completeHtmlAudioRef.current) {
        completeHtmlAudioRef.current.pause();
      }
      
      try {
        const wavBlob = floatToWav(combinedAudio, sampleRate);
        const url = URL.createObjectURL(wavBlob);
        if (completeAudioUrlRef.current) {
          URL.revokeObjectURL(completeAudioUrlRef.current);
        }
        completeAudioUrlRef.current = url;
        const audio = new Audio(url);
        audio.preservesPitch = true;
        audio.playbackRate = playbackRateRef.current;
        completeHtmlAudioRef.current = audio;
      } catch (e) {
        console.error("Failed to generate WAV URL", e);
      }`
);

// 5. Update togglePlayPause
code = code.replace(
    `} else if (completeAudioSourceRef.current && audioContextRef.current) {
        // For complete audio mode
        const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current;
        const currentPos = playbackOffsetRef.current + elapsed * playbackRateRef.current;
        const pausedTime = Math.max(0, Math.min(currentPos, duration));
        console.log(\`⏸️ Pausing complete audio at \${pausedTime.toFixed(2)}s\`);
        setCurrentTimeBoth(pausedTime);
        playbackOffsetRef.current = pausedTime;
      }`,
    `} else if (completeHtmlAudioRef.current && !isStreaming) {
        const pausedTime = completeHtmlAudioRef.current.currentTime;
        console.log(\`⏸️ Pausing complete HTML audio at \${pausedTime.toFixed(2)}s\`);
        intentionalStopRef.current = true;
        completeHtmlAudioRef.current.pause();
        setCurrentTimeBoth(pausedTime);
      }`
);

// 6. Update handleSeek
code = code.replace(
    `} else if (completeAudioSourceRef.current) {
        console.log(\`⏭️ Seeking complete audio to \${time.toFixed(2)}s\`);
        intentionalStopRef.current = true;
        try {
          completeAudioSourceRef.current.stop();
        } catch (e) { }
        playCompleteAudio(time);
      }`,
    `} else if (completeHtmlAudioRef.current) {
        console.log(\`⏭️ Seeking complete HTML audio to \${time.toFixed(2)}s\`);
        intentionalStopRef.current = true;
        completeHtmlAudioRef.current.pause();
        playCompleteAudio(time);
      }`
);

// 7. Update stop
code = code.replace(
    `// Stop complete audio playback
    if (completeAudioSourceRef.current) {
      try {
        console.log('🛑 Stopping complete audio source');
        completeAudioSourceRef.current.stop();
      } catch (e) {
        console.log('🛑 Complete audio source already stopped:', e);
      }
      completeAudioSourceRef.current = null;
    }`,
    `// Stop complete HTML audio playback
    if (completeHtmlAudioRef.current) {
      try {
        console.log('🛑 Stopping complete HTML audio source');
        intentionalStopRef.current = true;
        completeHtmlAudioRef.current.pause();
        completeHtmlAudioRef.current.currentTime = 0;
      } catch (e) {}
    }`
);

// 8. Update setPlaybackRate
code = code.replace(
    `if (completeAudioSourceRef.current) {
        console.log(\`🔄 Updating running complete audio source rate to \${rate}\`);
        completeAudioSourceRef.current.playbackRate.value = rate;
      }`,
    `if (completeHtmlAudioRef.current && !isStreaming) {
        console.log(\`🔄 Updating running HTML audio source rate to \${rate}\`);
        completeHtmlAudioRef.current.playbackRate = rate;
      }`
);

fs.writeFileSync(file, code);
console.log("Successfully patched " + file);
