/// <reference types="react" />

export interface AppError {
  title: string;
  message: string;
}

export interface Voice {
  name: string;
  label: string;
  nationality: string;
  gender: string;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface SampleText {
  title: string;
  text: string;
}

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  canScrub: boolean;
  synthesisComplete: boolean;
  wordTimings: WordTiming[];
  currentWordIndex: number;
  playbackRate: number;
}

export interface ModelState {
  isReady: boolean;
  status: string;
  modelAccepted: boolean;
  showModelWarning: boolean;
  normalizeAudio: boolean;
}

export interface AppState {
  // Text and PDF state
  inputText: string;
  uploadedPDF: File | null;
  isExtractingPDF: boolean;
  
  // Audio state
  audio: AudioState;
  
  // Model state
  model: ModelState;
  
  // UI state
  selectedVoice: string;
  error: AppError | null;
  isReading: boolean;
  currentSentence: string;
  
  // Seeking state
  isSeekingHover: boolean;
  hoverTime: number;
  isDragging: boolean;
  
  // Pending read state
  pendingRead: { text: string; voice: string } | null;
  
  // Modal states
  showOnboarding: boolean;
  showHelp: boolean;
}

export interface AppContextType {
  state: AppState;
  actions: {
    // Text actions
    setInputText: (text: string) => void;
    setUploadedPDF: (file: File | null) => void;
    setIsExtractingPDF: (extracting: boolean) => void;
    
    // Audio actions
    handleStartReading: () => void;
    handleStopReading: () => void;
    handleWordClick: (time: number) => void;
    handleDownloadAudio: () => void;
    
    // Model actions
    handleAcceptModelDownload: () => void;
    handleCancelModelDownload: () => void;
    
    // PDF actions
    handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handlePDFTextExtracted: (text: string) => void;
    handlePDFError: (errorMsg: string) => void;
    
    // Voice actions
    setSelectedVoice: (voice: string) => void;
    
    // UI actions
    setError: (error: AppError | null) => void;
    setIsSeekingHover: (hover: boolean) => void;
    setHoverTime: (time: number) => void;
    setIsDragging: (dragging: boolean) => void;
    
    // Utility functions
    formatTime: (seconds: number) => string;
    
    // Modal actions
    handleShowOnboarding: () => void;
    handleCloseOnboarding: () => void;
    handleShowHelp: () => void;
    handleCloseHelp: () => void;
    
    // TTS functions (from hook)
    clearModel: () => Promise<void>;
    checkCacheStatus: () => Promise<any>;
    debugAudioQuality: () => Promise<any>;
    checkAudioQuality: () => Promise<any>;
    toggleNormalizeAudio: () => void;
    seekToTime: (time: number) => void;
    togglePlayPause: () => void;
    skipForward: () => void;
    skipBackward: () => void;
    getAudioBlob: () => Blob | null;
    setPlaybackRate: (rate: number) => void;
  };
  
  // TTS hook data
  tts: {
    voices: Voice[];
    speak: (text: string, voice: string) => Promise<void>;
    stop: () => void;
    isPlaying: boolean;
    isLoading: boolean;
    status: string;
    canScrub: boolean;
    currentTime: number;
    duration: number;
    seekToTime: (time: number) => void;
    togglePlayPause: () => void;
    skipForward: () => void;
    skipBackward: () => void;
    wordTimings: WordTiming[];
    currentWordIndex: number;
    clearModel: () => Promise<void>;
    checkCacheStatus: () => Promise<any>;
    debugAudioQuality: () => Promise<any>;
    checkAudioQuality: () => Promise<any>;
    normalizeAudio: boolean;
    toggleNormalizeAudio: () => void;
    synthesisComplete: boolean;
    getAudioBlob: () => Blob | null;
    isReady: boolean;
    setPlaybackRate: (rate: number) => void;
  };
}
