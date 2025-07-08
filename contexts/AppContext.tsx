import React, { createContext, useContext, useState, useEffect } from 'react';
import useKokoroWebWorkerTts from '../hooks/useKokoroWebWorkerTts';
import { BRAND_NAME } from '../utils/branding';
import { AppContextType, AppState, AppError, SampleText, TextSet } from '../types';
import { driveHelpers } from '../utils/googleDrive';

const AppContext = createContext<AppContextType | undefined>(undefined);

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
  const [error, setError] = useState<AppError | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [isReading, setIsReading] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);

  // Model download consent
  const [showModelWarning, setShowModelWarning] = useState(false);
  const [modelAccepted, setModelAccepted] = useState(false);
  
  // Model selection state
  const [selectedModel, setSelectedModel] = useState('kokoro-82m');
  const [autoSelect, setAutoSelect] = useState(true);
  const [keepLocal, setKeepLocal] = useState(true);

  // Store pending read request during model download
  const [pendingRead, setPendingRead] = useState<{ text: string; voice: string } | null>(null);

  // Seeking state
  const [isSeekingHover, setIsSeekingHover] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Generation progress (0-100)
  const [generationProgress, setGenerationProgress] = useState<number>(0);

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
    } catch {}
    return [];
  });

  // Which set is currently loaded
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);

  // Reading progress map { setId: { audioTime: number; scrollTop: number } }
  const [readingProgress, setReadingProgress] = useState<Record<string, { audioTime: number; scrollTop: number }>>(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) return JSON.parse(raw) as Record<string, { audioTime: number; scrollTop: number }>;
    } catch {}
    return {};
  });

  // Google Drive linked flag (stub)
  const [googleDriveLinked, setGoogleDriveLinked] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Initialize TTS hook
  const tts = useKokoroWebWorkerTts({
    onError: setError,
    enabled: modelAccepted
  });

  // Action handlers
  const handleStartReading = async (providedText?: string) => {
    const textToRead = (providedText ?? inputText).trim();

    if (!textToRead) {
      setError({ title: 'No Text', message: 'Please enter some text or upload a PDF to read.' });
      return;
    }
    
    // Reset generation progress
    setGenerationProgress(0);

    // Stop any previous audio before starting anew
    tts.stop();

    // If model not accepted yet, show warning and remember intention
    if (!modelAccepted) {
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
    
    try {
      await tts.speak(textToRead, selectedVoice, (p: number) => setGenerationProgress(Math.round(p)));
      console.log('✅ Audio generation completed');
      
      // Ensure progress shows complete
      setGenerationProgress(100);
      
      // Audio is ready, user can now use play/pause controls
      setIsReading(false);
      
    } catch (error) {
      console.error('❌ Error during reading:', error);
      setError({ title: 'Reading Error', message: 'Failed to read the text. Please try again.' });
      setIsReading(false);
      setCurrentSentence('');
    }
  };

  const handleStopReading = () => {
    setIsReading(false);
    tts.stop();
    setCurrentSentence('');

    // Reset progress
    setGenerationProgress(0);
  };

  // --- New: Reset playback when input text changes directly ---
  const updateInputText = (text: string) => {
    // Stop any ongoing synthesis or playback to avoid conflicts
    handleStopReading();

    // Clear any previously uploaded PDF context
    setUploadedPDF(null);

    // Update the input text normally
    setInputText(text);

    // Reset error state (if any)
    setError(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // If audio is currently playing or a synthesis is in progress, stop it first
    handleStopReading();

    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedPDF(file);
      setIsExtractingPDF(true);
      setError(null);
    } else {
      setError({ title: 'Invalid File', message: 'Please upload a PDF file.' });
    }
  };

  const handlePDFTextExtracted = (text: string) => {
    if (text.trim()) {
      setInputText(text);
      setError(null);
      // Automatically start reading the newly extracted text using the freshly extracted text
      handleStartReading(text);
    } else {
      setError({ title: 'PDF Error', message: 'Unable to extract text from this PDF. It might be a scanned PDF or password-protected.' });
    }
    setIsExtractingPDF(false);
    setUploadedPDF(null); // Clear PDF after extraction
  };

  const handlePDFError = (errorMsg: string) => {
    setError({ title: 'PDF Error', message: errorMsg });
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
        } catch {}
        setPendingRead(null);
      })();
    }
  }, [tts.isReady, pendingRead, tts.speak]);

  // -------- Library actions --------
  const saveCurrentTextSet = (title?: string) => {
    const cleaned = inputText.trim();
    if (!cleaned) {
      alert('Nothing to save. Please enter or load some text first.');
      return;
    }
    const finalTitle = title || prompt('Enter a title for this text:', 'Untitled') || 'Untitled';
    const newSet: TextSet = {
      id: crypto.randomUUID(),
      title: finalTitle,
      text: cleaned,
      lastPosition: 0,
      audioGenerated: tts.synthesisComplete,
    };
    // Check storage limit (~4.5MB)
    try {
      const prospective = JSON.stringify([...savedTextSets, newSet]);
      const bytes = new Blob([prospective]).size;
      if (bytes > 4.5 * 1024 * 1024) {
        alert('Cannot save: local storage limit exceeded. Please delete existing items or use Google Drive sync.');
        return;
      }
    } catch {}
    setSavedTextSets((prev: TextSet[]) => [...prev, newSet]);
    setCurrentSetId(newSet.id);
  };

  const loadTextSet = (id: string) => {
    const set = savedTextSets.find((s: TextSet) => s.id === id);
    if (!set) return;
    updateInputText(set.text);
    setCurrentSetId(id);
    // If we have stored progress, seek after generation is ready
    const prog = readingProgress[id];
    if (prog?.audioTime && tts.canScrub) {
      tts.seekToTime(prog.audioTime);
    }
  };

  const deleteTextSet = (id: string) => {
    if (!confirm('Delete this saved text permanently?')) return;
    setSavedTextSets((prev: TextSet[]) => prev.filter((s: TextSet) => s.id !== id));
    // Clear progress
    setReadingProgress((prev: Record<string, { audioTime: number; scrollTop: number }>) => {
      const copy = { ...prev } as Record<string, { audioTime: number; scrollTop: number }>;
      delete copy[id];
      return copy;
    });
    if (currentSetId === id) {
      setCurrentSetId(null);
      updateInputText('');
    }
  };

  // -------- Cloud sync (Google Drive) --------
  const linkGoogleDrive = async () => {
    try {
      await driveHelpers.signIn();
      setGoogleDriveLinked(true);
      const remoteSets = await driveHelpers.fetchTextSets();
      if (remoteSets && remoteSets.length > 0) {
        // Merge unique sets (by id)
        setSavedTextSets((prev: TextSet[]) => {
          const merged = [...prev];
          remoteSets.forEach((r: TextSet) => {
            if (!merged.find((s) => s.id === r.id)) merged.push(r);
          });
          return merged;
        });
      }
      alert('Google Drive linked! Your library will now sync.');
    } catch (err) {
      console.error(err);
      alert('Failed to link Google Drive. See console for details.');
    }
  };

  // Sync to Drive whenever savedTextSets change
  useEffect(() => {
    (async () => {
      if (!googleDriveLinked) return;
      if (!driveHelpers.isSignedIn()) return;
      try {
        await driveHelpers.uploadTextSets(savedTextSets);
      } catch (e) {
        console.warn('Drive sync failed', e);
      }
    })();
  }, [savedTextSets, googleDriveLinked]);

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
      canScrub: tts.canScrub,
      synthesisComplete: tts.synthesisComplete,
      wordTimings: tts.wordTimings,
      currentWordIndex: tts.currentWordIndex,
      playbackRate: tts.playbackRate,
    },
    model: {
      isReady: tts.isReady,
      status: tts.status,
      modelAccepted,
      showModelWarning,
      normalizeAudio: tts.normalizeAudio,
      selectedModel,
      autoSelect,
      keepLocal,
    },
    selectedVoice,
    error,
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
    readingProgress,
    generationProgress,
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
      handleWordClick,
      handleDownloadAudio,
      handleAcceptModelDownload,
      handleCancelModelDownload,
      handleFileUpload,
      handlePDFTextExtracted,
      handlePDFError,
      setSelectedVoice,
      setSelectedModel,
      setAutoSelect,
      setKeepLocal,
      setError,
      setIsSeekingHover,
      setHoverTime,
      setIsDragging,
      formatTime,
      handleShowOnboarding,
      handleCloseOnboarding,
      handleShowHelp,
      handleCloseHelp,
      clearModel: tts.clearModel,
      checkCacheStatus: tts.checkCacheStatus,
      debugAudioQuality: tts.debugAudioQuality,
      checkAudioQuality: tts.checkAudioQuality,
      toggleNormalizeAudio: tts.toggleNormalizeAudio,
      seekToTime: tts.seekToTime,
      togglePlayPause: tts.togglePlayPause,
      skipForward: tts.skipForward,
      skipBackward: tts.skipBackward,
      getAudioBlob: tts.getAudioBlob,
      setPlaybackRate: tts.setPlaybackRate,
      // Library
      saveCurrentTextSet,
      loadTextSet,
      deleteTextSet,
      // Cloud Sync
      linkGoogleDrive,
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