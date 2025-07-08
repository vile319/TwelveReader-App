import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import useKokoroWebWorkerTts from '../hooks/useKokoroWebWorkerTts';
import { AppContextType, AppState, AppError, SampleText } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

/* eslint-disable @typescript-eslint/no-empty-object-type */
type AppProviderProps = PropsWithChildren<{}>;

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

  // Store pending read request during model download
  const [pendingRead, setPendingRead] = useState<{ text: string; voice: string } | null>(null);

  // Seeking state
  const [isSeekingHover, setIsSeekingHover] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Modal states
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Show onboarding for first-time users
    return !localStorage.getItem('twelvereader-onboarding-completed');
  });
  const [showHelp, setShowHelp] = useState(false);

  // Initialize TTS hook
  const tts = useKokoroWebWorkerTts({
    onError: setError,
    enabled: modelAccepted
  });

  // Action handlers
  const handleStartReading = async () => {
    if (!inputText.trim()) {
      setError({ title: 'No Text', message: 'Please enter some text or upload a PDF to read.' });
      return;
    }
    
    // Stop any previous audio before starting anew
    tts.stop();

    // If model not accepted yet, show warning and remember intention
    if (!modelAccepted) {
      setPendingRead({ text: inputText.trim(), voice: selectedVoice });
      setShowModelWarning(true);
      return;
    }

    // If accepted but model still loading, store pending read and wait
    if (!tts.isReady) {
      setPendingRead({ text: inputText.trim(), voice: selectedVoice });
      return;
    }
    
    console.log('🎵 Starting audio reading...');
    setIsReading(true);
    setCurrentSentence(inputText.trim());
    
    try {
      await tts.speak(inputText.trim(), selectedVoice);
      console.log('✅ Audio generation completed');
      
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
      // Automatically start reading the newly extracted text
      // This ensures a seamless flow: upload → extract → listen
      handleStartReading();
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
    a.download = 'twelve_reader_audio.wav';
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
    localStorage.setItem('twelvereader-onboarding-completed', 'true');
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