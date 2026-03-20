import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import useKokoroWebWorkerTts from '../hooks/useKokoroWebWorkerTts';
import { BRAND_NAME } from '../utils/branding';
import { AppContextType, AppState, AppToast, SampleText, TextSet } from '../types.ts';
import { driveSync } from '../utils/GoogleDriveSync';
import { localDB } from '../utils/localDatabase';
import { modelManager } from '../utils/modelManager';
import { detectGpuCapabilities } from '../utils/gpuCapabilities';
import { getDefaultModelForDevice } from '../utils/modelRuntime';
import { useGoogleLogin } from '@react-oauth/google';
import JSZip from 'jszip';

const AppContext = createContext<AppContextType | undefined>(undefined);

const hashText = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

/* eslint-disable @typescript-eslint/no-empty-object-type */
interface AppProviderProps {
  children?: React.ReactNode;
}

// Sample texts for quick testing
export const sampleTexts: SampleText[] = [
  {
    title: 'Quick Test',
    text: 'Hello! This is a quick test of the text-to-speech system. How does it sound?'
  },
  {
    title: 'Poetry',
    text: 'The woods are lovely, dark and deep, But I have promises to keep, And miles to go before I sleep, And miles to go before I sleep.'
  },
  {
    title: 'Science',
    text: 'The theory of relativity, developed by Albert Einstein, revolutionized our understanding of space, time, and gravity. It consists of two parts: special relativity and general relativity.'
  },
  {
    title: 'Story',
    text: 'Once upon a time, in a small village nestled between rolling hills and a sparkling river, there lived a young girl named Luna who could speak to the stars.'
  }
];

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // Core state
  const [selectedVoice, setSelectedVoice] = useState('af_heart');
  const [toast, setToast] = useState<AppToast | null>(null);

  // Auto-dismiss short-lived toasts
  useEffect(() => {
    if (toast && toast.type !== 'error') {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Pre-populate with the first sample text so the user can generate audio right away
  const [inputText, setInputText] = useState<string>(() => sampleTexts[0].text);
  const [isReading, setIsReading] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);

  // Model download consent
  const [showModelWarning, setShowModelWarning] = useState(false);
  const [modelAccepted, setModelAccepted] = useState(false);

  // Processing mode selection state - initialized from model manager
  const [preferredDevice, setPreferredDevice] = useState<'webgpu' | 'wasm' | 'cpu' | 'serverless'>(() => {
    const preferences = modelManager.getPreferences();
    return preferences.preferredDevice === 'auto' ? 'serverless' : (preferences.preferredDevice as 'webgpu' | 'wasm' | 'cpu' | 'serverless');
  });
  const [autoSelect, setAutoSelect] = useState(false);
  const [keepLocal, setKeepLocal] = useState(true);
  const [detectedHardwareLabel, setDetectedHardwareLabel] = useState('Detecting...');
  const [detectedHardwareReason, setDetectedHardwareReason] = useState<string | null>(null);

  const derivedModelConfig = getDefaultModelForDevice(preferredDevice);
  const selectedModel = derivedModelConfig.modelId;
  const preferredDtype = derivedModelConfig.dtype;

  // Store pending read request during model download
  const [pendingRead, setPendingRead] = useState<{ text: string; voice: string } | null>(null);

  // Seeking state
  const [isSeekingHover, setIsSeekingHover] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Generation progress (0-100)
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationCheckpoint, setGenerationCheckpoint] = useState<{ setId: string; resumeChunkIndex: number; totalChunks: number } | null>(null);

  // Modal states
  const ONBOARDING_KEY = `${BRAND_NAME.toLowerCase()}-onboarding-completed`;
  const TEXT_SETS_KEY = `${BRAND_NAME.toLowerCase()}-text-sets`;
  const PROGRESS_KEY = `${BRAND_NAME.toLowerCase()}-progress`;

  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Show onboarding for first-time users (also respect old key for smooth migration)
    return !localStorage.getItem(ONBOARDING_KEY) && !localStorage.getItem('twelvereader-onboarding-completed');
  });

  // Saved text sets (library)
  const [savedTextSets, setSavedTextSets] = useState<TextSet[]>(() => {
    try {
      const raw = localStorage.getItem(TEXT_SETS_KEY);
      if (raw) return JSON.parse(raw) as TextSet[];
    } catch {
    }
    return [];
  });

  // Which set is currently loaded
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);

  // Google Drive linked flag (stub)
  const [googleDriveLinked, setGoogleDriveLinked] = useState(false);
  const [isSyncingToDrive, setIsSyncingToDrive] = useState<boolean>(false);

  // 👤 Identity / Stripe
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem('twelvereader-signed-in-email');
    } catch { return null; }
  });
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    try {
      return localStorage.getItem('twelvereader-is-premium') === 'true';
    } catch { return false; }
  });

  // Reading progress map { setId: { audioTime: number; scrollTop: number } }
  const [readingProgress, setReadingProgress] = useState<Record<string, { audioTime: number; scrollTop: number }>>(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) return JSON.parse(raw) as Record<string, { audioTime: number; scrollTop: number }>;
    } catch { }
    return {};
  });

  const [showHelp, setShowHelp] = useState(false);

  const handleTtsError = React.useCallback((t: { title: string; message: string }) => {
    setToast({ title: t.title, message: t.message, type: 'error' });
  }, []);

  // Initialize TTS hook
  const tts = useKokoroWebWorkerTts({
    onError: handleTtsError,
    enabled: modelAccepted || preferredDevice === 'serverless',
    selectedModel,
    preferredDevice: preferredDevice as 'webgpu' | 'wasm' | 'cpu' | 'serverless',
    preferredDtype
  });

  // Action handlers
  const handleStartReading = async (providedText?: string) => {
    const textToRead = (providedText ?? inputText).trim();

    if (!textToRead) {
      setToast({ title: 'No Text', message: 'Please enter some text or upload a PDF to read.', type: 'info' });
      return;
    }

    // Check if we already have the exact audio generated/loaded for this text
    if (tts.synthesisComplete && tts.canScrub && currentSetId) {
      const currentSet = savedTextSets.find(s => s.id === currentSetId);
      if (currentSet && currentSet.text.trim() === textToRead) {
        console.log('🎵 Audio already loaded for this text, transitioning to player view...');

        // If we weren't in reading mode, reset to the start for a clean experience.
        // This prevents desynced highlighting when audio was playing in the background
        // without the highlighting view active.
        if (!isReading) {
          tts.seekToTime(0);
        }

        setIsReading(true);
        setCurrentSentence(textToRead);

        // Start playback if not already playing
        if (!tts.isPlaying) {
          tts.togglePlayPause();
        }
        return;
      }
    }

    // Reset generation progress
    setGenerationProgress(0);

    // Stop any previous audio before starting anew
    tts.stop();

    // If model not accepted and using local mode, show download warning
    // Cloud/serverless mode skips this entirely - no download needed
    const isCloudMode = preferredDevice === 'serverless' || !preferredDevice;
    if (!modelAccepted && !isCloudMode) {
      setPendingRead({ text: textToRead, voice: selectedVoice });
      setShowModelWarning(true);
      return;
    }

    // If accepted but model still loading, store pending read and wait
    if (!tts.isReady) {
      setPendingRead({ text: textToRead, voice: selectedVoice });
      return;
    }

    console.log('🎵 Starting audio reading...');
    setIsReading(true);
    setCurrentSentence(textToRead);

    setIsGenerating(true); // Set isGenerating to true here

    try {
      // Fire and forget, don't await to block UI state. The player will handle playback.
      tts.speak(textToRead, selectedVoice, (p: number) => setGenerationProgress(Math.round(p)))
        .then(() => {
          console.log('✅ Audio generation completed');
          setGenerationProgress(100);
          setIsGenerating(false); // Reset isGenerating on success
        })
        .catch(error => {
          console.error('❌ Error during synthesis:', error);
          setToast({ title: 'Reading Error', message: 'Failed to synthesize the full text. Check console.', type: 'error' });
          setIsGenerating(false); // Reset isGenerating on error
        });

    } catch (error) {
      console.error('❌ Error initializing reading:', error);
      setToast({ title: 'Reading Error', message: 'Failed to start reading. Please try again.', type: 'error' });
      setIsReading(false);
      setCurrentSentence('');
      setIsGenerating(false); // Reset isGenerating on error
    }
  };

  const handleStopReading = () => {
    setIsReading(false);
    tts.stop();
    setCurrentSentence('');

    // Reset progress
    setGenerationProgress(0);
    setIsGenerating(false); // Reset isGenerating when stopping reading
  };

  const cancelGeneration = () => {
    // Phase 2: if we already have generated some audio, persist it as a partial checkpoint.
    (async () => {
      try {
        if (!currentSetId) return;
        const blob = tts.getPartialAudioBlob();
        if (!blob) return;

        const cleaned = inputText.trim();
        if (!cleaned) return;

        // Save partial audio + current timings (if any)
        await localDB.saveAudioBlob(currentSetId, blob);
        if (tts.wordTimings && tts.wordTimings.length > 0) {
          await localDB.saveTimings(currentSetId, tts.wordTimings);
        }

        const stats = tts.getSynthesisChunkStats();
        const textHash = await hashText(cleaned);
        await localDB.saveGenerationCheckpoint(currentSetId, {
          setId: currentSetId,
          resumeChunkIndex: stats.chunksGenerated,
          totalChunks: stats.totalChunks,
          isPartialGeneration: true,
          textHash
        });

        // Mark the active set as having partial audio for UI badge
        setSavedTextSets((prev: TextSet[]) =>
          prev.map((s) => (s.id === currentSetId ? { ...s, hasPartialAudio: true } : s))
        );
      } catch (e) {
        // Don't block cancellation if persistence fails (quota, IDB errors, etc.)
        console.warn('Failed to save partial generation checkpoint:', e);
      }
    })();

    // Cancel synthesis/playback without forcing a mode switch back to editing.
    // This is intentionally lighter than handleStopReading().
    tts.stop();
    setGenerationProgress(0);
    setIsGenerating(false);
    setToast({ title: 'Cancelled', message: 'Generation cancelled.', type: 'info' });
  };

  const continueGenerationFromCheckpoint = () => {
    (async () => {
      if (!currentSetId || !generationCheckpoint || generationCheckpoint.setId !== currentSetId) return;
      const set = savedTextSets.find((s) => s.id === currentSetId);
      if (!set) return;

      const cleaned = set.text.trim();
      if (!cleaned) return;

      // Re-load partial audio into the player
      const blob = await localDB.getAudioBlob(currentSetId);
      const timings = await localDB.getTimings(currentSetId);
      if (!blob) return;

      await tts.loadAudioFromBlob(blob, timings || undefined);

      setIsReading(true);
      setCurrentSentence(cleaned);
      setGenerationProgress(Math.round((generationCheckpoint.resumeChunkIndex / Math.max(1, generationCheckpoint.totalChunks)) * 90));
      setIsGenerating(true);

      const result = await tts.speak(cleaned, selectedVoice, (p: number) => setGenerationProgress(Math.round(p)), {
        startChunkIndex: generationCheckpoint.resumeChunkIndex,
        preserveStreamingSeed: true,
        seedWordTimings: timings || undefined,
        initialSynthesizedDuration: (Array.isArray(timings) && timings.length > 0)
          ? timings[timings.length - 1].end
          : 0
      });

      if (result?.ok && result.completed) {
        await localDB.deleteGenerationCheckpoint(currentSetId);
        setGenerationCheckpoint(null);
        setSavedTextSets((prev: TextSet[]) =>
          prev.map((s) => (s.id === currentSetId ? { ...s, hasPartialAudio: false, audioGenerated: true } : s))
        );
        setGenerationProgress(100);
      }

      setIsGenerating(false);
    })().catch((e) => {
      console.warn('Continue generation failed:', e);
      setIsGenerating(false);
    });
  };

  // --- New: Reset playback when input text changes directly ---
  const updateInputText = (text: string) => {
    // If they are actively reading, changing the text should seamlessly restart the generation
    // if we wanted to be perfectly seamless, but for now we just let them type without 
    // ejecting them from the reading view completely if they are just scrolling.
    if (isReading && !tts.isPlaying) {
      // Allow editing without dropping out of isReading if paused
    } else if (isReading) {
      // Stop ongoing synthesis
      handleStopReading();
    }

    // Clear any previously uploaded PDF context
    setUploadedPDF(null);

    // Update the input text normally
    setInputText(text);

    // Reset error state (if any)
    setToast(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // If audio is currently playing or a synthesis is in progress, stop it first
    handleStopReading();

    const file = event.target.files?.[0];
    if (!file) return;

    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isEPUB = file.type === 'application/epub+zip' || file.name.toLowerCase().endsWith('.epub');

    if (isPDF) {
      setUploadedPDF(file);
      setIsExtractingPDF(true);
      setToast(null);
    } else if (isEPUB) {
      setIsExtractingPDF(true);
      setToast(null);
      extractEpubText(file);
    } else {
      setToast({ title: 'Invalid File', message: 'Please upload a PDF or EPUB file.', type: 'error' });
    }
  };

  // Extract text from an EPUB file (basic implementation)
  async function extractEpubText(file: File) {
    try {
      console.log('📚 Starting EPUB text extraction...');
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Collect XHTML/HTML files (typical for EPUB content)
      const htmlFileNames = Object.keys(zip.files).filter(name => /\.x?html?$/.test(name));
      htmlFileNames.sort(); // Basic ordering

      let allText = '';
      for (const name of htmlFileNames) {
        try {
          const content = await zip.files[name].async('string');
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          const text = doc.body?.textContent || '';
          if (text.trim()) {
            allText += text.trim() + ' ';
          }
        } catch (pageError) {
          console.warn(`⚠️ Failed to extract ${name}:`, pageError);
          continue;
        }
      }

      // Clean up final text similar to PDF processing
      const finalText = allText
        .replace(/\s+/g, ' ')
        .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
        .replace(/([a-z])([A-Z])/g, '$1. $2')
        .trim();

      if (finalText && finalText.length > 50 && finalText.length < 1000000) {
        console.log(`🎯 EPUB extraction complete: ${finalText.length} characters`);
        setInputText(finalText);
        setIsExtractingPDF(false);
        console.log('Text extracted - press Play to start TTS');
      } else {
        throw new Error('Could not extract readable text from this EPUB');
      }
    } catch (error) {
      console.error('❌ EPUB extraction failed:', error);
      setToast({ title: 'EPUB Error', message: 'Unable to extract text from this EPUB. It might be protected or contain unsupported formatting.', type: 'error' });
    } finally {
      setIsExtractingPDF(false);
    }
  }

  const handlePDFTextExtracted = (text: string) => {
    if (text.trim()) {
      setInputText(text);
      setToast(null);
      setIsExtractingPDF(false);
      setUploadedPDF(null);
      console.log('PDF text extracted - press Play to start TTS');
    } else {
      setToast({ title: 'PDF Error', message: 'Unable to extract text from this PDF. It might be a scanned PDF or password-protected.', type: 'error' });
    }
    setIsExtractingPDF(false);
    setUploadedPDF(null); // Clear PDF after extraction
  };

  const handlePDFError = (errorMsg: string) => {
    setToast({ title: 'PDF Error', message: errorMsg, type: 'error' });
    setIsExtractingPDF(false);
    setUploadedPDF(null);
  };

  const handleAcceptModelDownload = () => {
    setModelAccepted(true);
    setShowModelWarning(false);
    // pendingRead already stored; when model finishes downloading, useEffect will trigger speak()
  };

  const handleCancelModelDownload = () => {
    setShowModelWarning(false);
    setPreferredDevice('serverless');
    modelManager.savePreferences({ preferredDevice: 'serverless' });
  };

  const handleDownloadAudio = () => {
    const blob = tts.getAudioBlob();
    if (!blob) {
      alert('Audio is not ready yet.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${BRAND_NAME.toLowerCase()}_audio.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWordClick = (time: number) => {
    if (!tts.canScrub) return;
    console.log(`🖱️ Word clicked, seeking to: ${time.toFixed(2)}s`);
    tts.seekToTime(time);
  };

  const handleDeviceChange = useCallback((device: 'webgpu' | 'wasm' | 'cpu' | 'serverless') => {
    setPreferredDevice(device);
    modelManager.savePreferences({ preferredDevice: device });
    const isLocal = device === 'webgpu' || device === 'wasm' || device === 'cpu';
    if (isLocal && !modelAccepted) {
      setShowModelWarning(true);
    }
  }, [modelAccepted]);

  const handleCloseOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const handleShowOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleShowHelp = () => {
    setShowHelp(true);
  };

  const handleCloseHelp = () => {
    setShowHelp(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start reading once model finishes downloading
  useEffect(() => {
    if (tts.isReady && pendingRead) {
      (async () => {
        try {
          await tts.speak(pendingRead.text, pendingRead.voice);
        } catch { }
        setPendingRead(null);
      })();
    }
  }, [tts.isReady, pendingRead, tts.speak]);

  // Clean up unwanted cached models on mount
  useEffect(() => {
    modelManager.cleanupUnwantedModels();
  }, []);

  useEffect(() => {
    const loadDetectedHardware = async () => {
      const gpuCaps = await detectGpuCapabilities();

      if (gpuCaps.canUseLocalGpu) {
        setDetectedHardwareLabel('GPU (WebGPU) + CPU');
        setDetectedHardwareReason(null);
        return;
      }

      setDetectedHardwareLabel('CPU only');
      setDetectedHardwareReason(
        gpuCaps.localGpuUnavailableReason ?? 'Local GPU is unavailable on this browser/device.'
      );
    };

    loadDetectedHardware();
  }, []);

  useEffect(() => {
    const initDevice = async () => {
      const preferences = modelManager.getPreferences();
      if (preferences.preferredDevice === 'auto') {
        let defaultDevice: 'webgpu' | 'serverless' | 'wasm' = 'serverless';

        const gpuCaps = await detectGpuCapabilities();

        if (!gpuCaps.hasWebGPU) {
          console.log(`❌ [initDevice] WebGPU not usable. Reason: ${gpuCaps.reason}`);
        } else {
          console.log('🔍 [initDevice] WebGPU adapter detected.', {
            isFallback: gpuCaps.isFallbackAdapter,
            maxStorage: gpuCaps.maxStorageBufferBindingSize
          });
        }

        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        if (gpuCaps.canUseLocalGpu) {
          defaultDevice = 'webgpu';
          console.log('✅ Local GPU supported: defaulting to webgpu processing.');
        } else if (isOnline) {
          defaultDevice = 'serverless';
          console.log(`☁️ Defaulting to serverless processing. ${gpuCaps.localGpuUnavailableReason ?? 'Local GPU is unavailable.'}`);
        } else {
          defaultDevice = 'wasm';
          console.log(`📡 Offline detected. Defaulting to local CPU mode (wasm). ${gpuCaps.localGpuUnavailableReason ?? 'Local GPU is unavailable.'}`);
        }

        setPreferredDevice(defaultDevice);
        modelManager.savePreferences({ preferredDevice: defaultDevice });
      }
    };
    initDevice();
  }, []);

  // -------- Cloud sync helpers --------
  const handleDriveError = (e: any, context: string) => {
    console.warn(`[Drive Error] ${context}:`, e);
    if (e instanceof Error && e.message.includes('token expired')) {
      setGoogleDriveLinked(false);
      localStorage.removeItem('twelvereader-drive-linked');
      driveSync.setAccessToken('');
      setToast({ title: 'Sync Paused', message: 'Google Drive session expired. Please sign in again to resume automatic syncing.', type: 'error' });
    } else {
      setToast({
        title: 'Google Drive Sync Failed',
        message: `Failed to sync. Your text is saved locally, but could not be backed up to Drive. Error: ${e instanceof Error ? e.message : String(e)}`,
        type: 'error'
      });
    }
  };

  // -------- Library actions --------
  const saveCurrentTextSet = async (title?: string, suppressPrompt: boolean = false): Promise<boolean> => {
    const cleaned = inputText.trim();
    if (!cleaned) {
      if (!suppressPrompt) setToast({ title: 'Notice', message: 'Nothing to save. Please enter or load some text first.', type: 'info' });
      return false;
    }

    // If we already have a set with this exact text, just update its audioGenerated status and save the blob
    const existingSet = savedTextSets.find((s) => s.text === cleaned);
    if (existingSet) {
      const blob = tts.getAudioBlob();
      if (blob) {
        try {
          await localDB.saveAudioBlob(existingSet.id, blob);
          if (googleDriveLinked && driveSync.hasToken()) {
            setIsSyncingToDrive(true);
            try { await driveSync.uploadAudioBlob(existingSet.id, blob); }
            catch (e) { handleDriveError(e, 'uploadAudioBlob (existing)'); }
            finally { setIsSyncingToDrive(false); }
          }
        } catch (e) {
          console.error('Failed to save audio blob:', e);
        }
      }

      // Also ensure exact word timings are saved/synced for existing items 
      if (tts.wordTimings && tts.wordTimings.length > 0) {
        try {
          await localDB.saveTimings(existingSet.id, tts.wordTimings);
          if (googleDriveLinked && driveSync.hasToken()) {
            driveSync.uploadTimings(existingSet.id, tts.wordTimings).catch(e => console.error('Failed to sync timings (existing)', e));
          }
        } catch (e) {
          console.error('Failed to save timings (existing):', e);
        }
      }
      if (!existingSet.audioGenerated && tts.synthesisComplete) {
        setSavedTextSets((prev: TextSet[]) => prev.map(s => s.id === existingSet.id ? { ...s, audioGenerated: true } : s));
      }
      if (!suppressPrompt) {
        setToast({ title: 'Library Updated', message: 'This text and its exact word timings were already saved in your Library!', type: 'success' });
      }
      return true;
    }

    let finalTitle = title;
    if (!finalTitle && suppressPrompt) {
      const words = cleaned.split(/\s+/).slice(0, 5).join(' ');
      finalTitle = words.length > 25 ? words.substring(0, 25) + '...' : words;
      if (!finalTitle) finalTitle = 'Untitled';
    } else if (!finalTitle) {
      finalTitle = prompt('Enter a title for this text:', 'Untitled') || 'Untitled';
    }

    const newSet: TextSet = {
      id: crypto.randomUUID(),
      title: finalTitle,
      text: cleaned,
      lastPosition: tts.currentTime,
      audioGenerated: tts.synthesisComplete,
    };

    // Save timings separately
    if (tts.wordTimings && tts.wordTimings.length > 0) {
      try {
        await localDB.saveTimings(newSet.id, tts.wordTimings);
        if (googleDriveLinked && driveSync.hasToken()) {
          driveSync.uploadTimings(newSet.id, tts.wordTimings).catch(e => console.error('Failed to sync timings', e));
        }
      } catch (e) {
        console.error('Failed to save timings:', e);
      }
    }

    // Save audio blob to IndexedDB if it exists
    const blob = tts.getAudioBlob();
    if (blob) {
      try {
        await localDB.saveAudioBlob(newSet.id, blob);

        // Push to Google Drive if linked
        if (googleDriveLinked && driveSync.hasToken()) {
          setIsSyncingToDrive(true);
          try {
            await driveSync.uploadAudioBlob(newSet.id, blob);
          } catch (e) {
            handleDriveError(e, 'uploadAudioBlob (new)');
          } finally {
            setIsSyncingToDrive(false);
          }
        }
      } catch (e) {
        console.error('Failed to save audio blob:', e);
      }
    }

    // Check storage limit (~4.5MB) for metadata
    try {
      const prospective = JSON.stringify([...savedTextSets, newSet]);
      const bytes = new Blob([prospective]).size;
      if (bytes > 4.5 * 1024 * 1024) {
        if (!suppressPrompt) alert('Cannot save: local storage limit exceeded. Please delete existing items or use Google Drive sync.');
        return false;
      }
    } catch { }

    setSavedTextSets((prev: TextSet[]) => [...prev, newSet]);
    setCurrentSetId(newSet.id);
    return true;
  };

  // Auto-save history when generation finishes
  useEffect(() => {
    if (tts.synthesisComplete && inputText.trim()) {
      const timer = setTimeout(() => {
        saveCurrentTextSet(undefined, true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tts.synthesisComplete]);

  const loadTextSet = async (id: string) => {
    const set = savedTextSets.find((s: TextSet) => s.id === id);
    if (!set) return;

    // Stop any currently generating background TTS before switching contexts
    if (isReading || isGenerating || tts.isLoading) {
      handleStopReading();
    }

    updateInputText(set.text);
    setCurrentSetId(id);
    setGenerationCheckpoint(null);

    // Attempt to load the audio blob from IndexedDB
    try {
      let blob = await localDB.getAudioBlob(id);

      // Attempt to load from Google Drive if missing locally
      if (!blob && googleDriveLinked && driveSync.hasToken()) {
        setIsSyncingToDrive(true);
        try {
          blob = await driveSync.fetchAudioBlob(id);
          if (blob) {
            // Cache it locally for next time
            await localDB.saveAudioBlob(id, blob);
          }
        } catch (e) {
          handleDriveError(e, 'fetchAudioBlob');
        } finally {
          setIsSyncingToDrive(false);
        }
      }

      if (blob) {
        console.log('Loaded audio blob, size:', blob.size);

        let loadedTimings = await localDB.getTimings(id);
        if (!loadedTimings && googleDriveLinked && driveSync.hasToken()) {
          loadedTimings = await driveSync.fetchTimings(id);
          if (loadedTimings) {
            await localDB.saveTimings(id, loadedTimings);
          }
        }

        // Restore the audio into the TTS engine so it's ready to play without regenerating
        await tts.loadAudioFromBlob(blob, loadedTimings || undefined);
      }
    } catch (e) {
      console.error('Failed to load audio blob:', e);
    }

    // Detect partial-generation checkpoint and surface it to UI
    try {
      const checkpoint = await localDB.getGenerationCheckpoint(id);
      if (checkpoint?.isPartialGeneration) {
        const currentHash = await hashText(set.text.trim());
        if (checkpoint.textHash === currentHash) {
          setGenerationCheckpoint({ setId: id, resumeChunkIndex: checkpoint.resumeChunkIndex, totalChunks: checkpoint.totalChunks });
        } else {
          await localDB.deleteGenerationCheckpoint(id);
          setSavedTextSets((prev: TextSet[]) => prev.map((s) => (s.id === id ? { ...s, hasPartialAudio: false } : s)));
        }
      }
    } catch (e) {
      console.warn('Failed to read generation checkpoint:', e);
    }

    // If we have stored progress, seek after generation is ready
    const prog = readingProgress[id];
    if (prog?.audioTime && tts.canScrub) {
      tts.seekToTime(prog.audioTime);
    }
  };

  const deleteTextSet = async (id: string) => {
    // Remove blob and timings from IndexedDB
    try {
      await localDB.deleteAudioBlob(id);
      await localDB.deleteTimings(id);
    } catch (e) {
      console.error('Failed to delete audio/timings:', e);
    }

    setSavedTextSets((prev: TextSet[]) => prev.filter((s: TextSet) => s.id !== id));
    // Clear progress
    setReadingProgress((prev: Record<string, { audioTime: number; scrollTop: number }>) => {
      const copy = { ...prev } as Record<string, { audioTime: number; scrollTop: number }>;
      delete copy[id];
      return copy;
    });
    if (currentSetId === id) {
      // If deleting the active document, stop any background generation
      if (isReading || isGenerating || tts.isLoading) {
        handleStopReading();
      }
      setCurrentSetId(null);
      updateInputText('');
    }
  };

  // -------- Cloud sync (Google Drive) --------
  const loginToDrive = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file',
    onSuccess: async (tokenResponse: any) => {
      try {
        driveSync.setAccessToken(tokenResponse.access_token);
        setGoogleDriveLinked(true);
        localStorage.setItem('twelvereader-drive-linked', 'true');
        setIsSyncingToDrive(true);
        const remoteData = await driveSync.fetchSyncData();
        if (remoteData) {
          const { textSets: remoteSets, readingProgress: remoteProgress } = remoteData;
          if (remoteSets && remoteSets.length > 0) {
            // Merge unique sets (by id)
            setSavedTextSets((prev: TextSet[]) => {
              const merged = [...prev];
              remoteSets.forEach((r: TextSet) => {
                if (!merged.find((s) => s.id === r.id)) merged.push(r);
              });
              return merged;
            });
            setToast({ title: 'Account Linked', message: `Synced ${remoteSets.length} saved text(s) from Google Drive.`, type: 'success' });
          } else {
            setToast({ title: 'Account Linked', message: 'Your saved texts will now sync automatically to Google Drive.', type: 'success' });
          }

          if (remoteProgress && Object.keys(remoteProgress).length > 0) {
            setReadingProgress((prev) => {
              const next = { ...prev };
              for (const [id, remoteProg] of Object.entries(remoteProgress)) {
                if (!next[id] || remoteProg.audioTime > next[id].audioTime) {
                  next[id] = remoteProg;
                }
              }
              return next;
            });
          }
        } else {
          setToast({ title: 'Account Linked', message: 'Your saved texts will now sync automatically to Google Drive.', type: 'success' });
        }
      } catch (err: any) {
        console.error(err);
        setToast({ title: 'Link Failed', message: 'Failed to initialize Google Drive folder. See browser console for details.', type: 'error' });
        setGoogleDriveLinked(false);
        localStorage.removeItem('twelvereader-drive-linked');
      } finally {
        setIsSyncingToDrive(false);
      }
    },
    onError: (errorResponse: any) => {
      console.error('Login Failed:', errorResponse);
      const errStr = String(errorResponse);
      if (errStr.includes('YOUR_GOOGLE_DRIVE_CLIENT_ID') || errStr.includes('idpiframe') || errStr.includes('idpiframe_initialization_failed')) {
        setToast({ title: 'Setup Required', message: 'Google Drive sync is not yet configured for this deployment. Developer must add Client ID.', type: 'error' });
      } else {
        setToast({ title: 'Link Failed', message: 'Ensure you have an active internet connection and try again.', type: 'error' });
      }
    }
  });

  // Attempt silent login on mount if previously linked
  const loginToDriveSilent = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/drive.file',
    prompt: 'none',
    onSuccess: async (tokenResponse: any) => {
      try {
        driveSync.setAccessToken(tokenResponse.access_token);
        setGoogleDriveLinked(true);
        console.log("✅ Silently re-authenticated with Google Drive");
        // We do a quiet background sync of remote sets
        const remoteData = await driveSync.fetchSyncData();
        if (remoteData) {
          const { textSets: remoteSets, readingProgress: remoteProgress } = remoteData;
          if (remoteSets && remoteSets.length > 0) {
            setSavedTextSets((prev: TextSet[]) => {
              const merged = [...prev];
              remoteSets.forEach((r: TextSet) => {
                if (!merged.find((s) => s.id === r.id)) merged.push(r);
              });
              return merged;
            });
          }

          if (remoteProgress && Object.keys(remoteProgress).length > 0) {
            setReadingProgress((prev) => {
              const next = { ...prev };
              for (const [id, remoteProg] of Object.entries(remoteProgress)) {
                if (!next[id] || remoteProg.audioTime > next[id].audioTime) {
                  next[id] = remoteProg;
                }
              }
              return next;
            });
          }
        }
      } catch (err) {
        console.error("Silent drive sync failed:", err);
      }
    },
    onError: () => {
      console.log("Silent Google Drive login failed or expired.");
      setGoogleDriveLinked(false);
      localStorage.removeItem('twelvereader-drive-linked');
    }
  });

  useEffect(() => {
    // Only attempt silent login if they previously chose to link it
    if (localStorage.getItem('twelvereader-drive-linked') === 'true') {
      loginToDriveSilent();
    }
  }, []);

  const linkGoogleDrive = () => {
    loginToDrive();
  };

  // -------- Identity (Stripe / Auth) --------
  const loginUser = useGoogleLogin({
    scope: 'email profile',
    onSuccess: async (tokenResponse: any) => {
      try {
        setToast({ title: 'Signing In...', message: 'Verifying premium status...', type: 'info' });

        const res = await fetch('/api/checkPremium', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: tokenResponse.access_token }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to verify account');
        }

        const data = await res.json();

        if (data && data.email) {
          setUserEmail(data.email);
          localStorage.setItem('twelvereader-signed-in-email', data.email);

          setIsPremium(data.isPremium);
          localStorage.setItem('twelvereader-is-premium', String(data.isPremium));

          if (data.isPremium) {
            setToast({ title: 'Premium active', message: `Welcome back, ${data.email}`, type: 'success' });
          } else {
            setToast({ title: 'Signed In', message: `Successfully signed in as ${data.email}`, type: 'success' });
          }
        }
      } catch (err) {
        console.error("Identity login failed:", err);
        setToast({ title: 'Sign In Failed', message: 'Failed to sign in. Please try again.', type: 'error' });
        setUserEmail(null);
        setIsPremium(false);
        localStorage.removeItem('twelvereader-signed-in-email');
        localStorage.removeItem('twelvereader-is-premium');
      }
    },
    onError: (errorResponse: any) => {
      console.error('Login Failed:', errorResponse);
      const errStr = String(errorResponse);
      if (errStr.includes('YOUR_GOOGLE_DRIVE_CLIENT_ID') || errStr.includes('idpiframe')) {
        setToast({ title: 'Setup Required', message: 'Sign in configuration is missing on this deployment.', type: 'error' });
      } else {
        setToast({ title: 'Sign In Failed', message: 'Ensure you have an active internet connection and try again.', type: 'error' });
      }
    }
  });

  const logoutUser = () => {
    setUserEmail(null);
    setIsPremium(false);
    localStorage.removeItem('twelvereader-signed-in-email');
    localStorage.removeItem('twelvereader-is-premium');
  };

  // Sync to Drive whenever savedTextSets change
  useEffect(() => {
    (async () => {
      if (!googleDriveLinked || !driveSync.hasToken()) return;
      try {
        setIsSyncingToDrive(true);
        await driveSync.uploadSyncData(savedTextSets, readingProgress);
      } catch (e) {
        handleDriveError(e, 'uploadTextSets (auto-sync)');
      } finally {
        setIsSyncingToDrive(false);
      }
    })();
  }, [savedTextSets, googleDriveLinked]);

  const disconnectDrive = () => {
    setGoogleDriveLinked(false);
    localStorage.removeItem('twelvereader-drive-linked');
    driveSync.setAccessToken('');
    setToast({ title: 'Drive Unlinked', message: 'Your texts will no longer sync automatically.', type: 'info' });
  };

  const forceSyncDrive = async () => {
    if (!googleDriveLinked || !driveSync.hasToken()) {
      setToast({ message: 'Google Drive is not linked.', type: 'error' });
      return;
    }
    setIsSyncingToDrive(true);
    try {
      await driveSync.uploadSyncData(savedTextSets, readingProgress);
      setToast({ title: 'Sync Complete', message: 'All texts backed up to Google Drive.', type: 'success' });
    } catch (e) {
      handleDriveError(e, 'Force Sync');
      setToast({ title: 'Sync Failed', message: 'Please check your connection and try again.', type: 'error' });
    } finally {
      setIsSyncingToDrive(false);
    }
  };

  // Persist saved text sets whenever they change
  useEffect(() => {
    localStorage.setItem(TEXT_SETS_KEY, JSON.stringify(savedTextSets));
  }, [savedTextSets]);

  // Persist reading progress whenever it changes
  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(readingProgress));
  }, [readingProgress]);

  // Track playback progress for current set
  useEffect(() => {
    if (!currentSetId || !tts.canScrub) return;
    const handle = setTimeout(() => {
      setReadingProgress((prev: Record<string, { audioTime: number; scrollTop: number }>) => ({
        ...prev,
        [currentSetId]: {
          audioTime: tts.currentTime,
          scrollTop: prev[currentSetId]?.scrollTop || 0,
        },
      }));
    }, 1000);
    return () => clearTimeout(handle);
  }, [tts.currentTime, currentSetId, tts.canScrub]);

  // Sync progress to cloud when paused/stopped to avoid spamming the API
  useEffect(() => {
    if (!googleDriveLinked || !driveSync.hasToken() || tts.isPlaying) return;

    // De-bounce the upload to avoid excessive API calls
    const handle = setTimeout(async () => {
      try {
        // Only log in dev to avoid annoying users
        // console.log("☁️ Auto-syncing progress to Google Drive...");
        await driveSync.uploadSyncData(savedTextSets, readingProgress);
      } catch {
        // Silent fail for background progress syncs to not disturb reading
      }
    }, 2000);

    return () => clearTimeout(handle);
  }, [readingProgress, googleDriveLinked, tts.isPlaying, savedTextSets]);

  // --- Scroll progress update ---
  const updateScrollPosition = (scrollTop: number) => {
    if (!currentSetId) return;
    setReadingProgress((prev: Record<string, { audioTime: number; scrollTop: number }>) => ({
      ...prev,
      [currentSetId]: {
        audioTime: prev[currentSetId]?.audioTime || 0,
        scrollTop,
      },
    }));
  };

  // Aggregate state
  const state: AppState = {
    inputText,
    uploadedPDF,
    isExtractingPDF,
    audio: {
      isPlaying: tts.isPlaying,
      isLoading: tts.isLoading,
      currentTime: tts.currentTime,
      duration: tts.duration,
      synthesizedDuration: tts.synthesizedDuration,
      isStreaming: tts.isStreaming,
      canScrub: tts.canScrub,
      synthesisComplete: tts.synthesisComplete,
      wordTimings: tts.wordTimings,
      currentWordIndex: tts.currentWordIndex,
      playbackRate: tts.playbackRate,
    },
    model: {
      isReady: tts.isReady,
      status: tts.status,
      currentDevice: tts.currentDevice,
      detectedHardwareLabel,
      detectedHardwareReason,
      modelAccepted,
      showModelWarning,
      selectedModel,
      preferredDevice,
      preferredDtype,
      autoSelect,
      keepLocal,
    },
    selectedVoice,
    toast,
    isReading,
    currentSentence,
    isSeekingHover,
    hoverTime,
    isDragging,
    pendingRead,
    showOnboarding,
    showHelp,
    savedTextSets,
    currentSetId,
    googleDriveLinked,
    isSyncingToDrive,
    userEmail,
    isPremium,
    readingProgress,
    generationProgress,
    isGenerating,
    generationCheckpoint,
  };

  // Context value
  const contextValue: AppContextType = {
    state,
    actions: {
      setInputText: updateInputText,
      setUploadedPDF,
      setIsExtractingPDF,
      handleStartReading,
      handleStopReading,
      cancelGeneration,
      continueGenerationFromCheckpoint,
      handleWordClick,
      handleDownloadAudio,
      handleAcceptModelDownload,
      handleCancelModelDownload,
      handleFileUpload,
      handlePDFTextExtracted,
      handlePDFError,
      setSelectedVoice: (voice: string) => {
        setSelectedVoice(voice);
        // If actively reading, changing the voice should stop playback so the user can manually restart
        if (isReading) {
          handleStopReading();
        }
      },
      setPreferredDevice: handleDeviceChange,
      setAutoSelect,
      setKeepLocal,
      setToast,
      setIsSeekingHover,
      setHoverTime,
      setIsDragging,
      formatTime,
      handleShowOnboarding,
      handleCloseOnboarding,
      handleShowHelp,
      handleCloseHelp,
      seekToTime: tts.seekToTime,
      togglePlayPause: tts.togglePlayPause,
      skipForward: tts.skipForward,
      skipBackward: tts.skipBackward,
      getAudioBlob: tts.getAudioBlob,
      setPlaybackRate: tts.setPlaybackRate,
      primeAudioContext: tts.primeAudioContext,
      // Library
      saveCurrentTextSet,
      loadTextSet,
      deleteTextSet,
      // Cloud Sync
      linkGoogleDrive,
      disconnectDrive,
      forceSyncDrive,
      // Identity
      loginUser,
      logoutUser,
      updateScrollPosition,
    },
    tts,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Export sample texts for use in components
export { AppContext };