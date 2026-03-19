/// <reference types="react" />

export interface AppToast {
  title?: string;
  message: string;
  type: 'success' | 'info' | 'error';
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
  synthesizedDuration: number;
  isStreaming: boolean;
  canScrub: boolean;
  synthesisComplete: boolean;
  wordTimings: WordTiming[];
  currentWordIndex: number;
  playbackRate: number;
}

export interface ModelState {
  isReady: boolean;
  status: string;
  /** Actual runtime backend chosen by the TTS hook */
  currentDevice?: 'webgpu' | 'wasm' | 'cpu' | 'serverless' | null;
  detectedHardwareLabel: string;
  detectedHardwareReason?: string | null;
  modelAccepted: boolean;
  showModelWarning: boolean;
  selectedModel: string;
  preferredDevice: 'webgpu' | 'wasm' | 'cpu' | 'serverless';
  preferredDtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
  autoSelect: boolean;
  keepLocal: boolean;
  modelKeepLocal: Record<string, boolean>; // Per-model local storage preferences
}

export interface TextSet {
  id: string;
  title: string;
  text: string;
  lastPosition?: number; // seconds into the audio where the user left off
  /** Indicates if audio has been generated for this text set */
  audioGenerated?: boolean;
  /** Indicates some (but not all) audio was generated and saved */
  hasPartialAudio?: boolean;
  wordTimings?: WordTiming[];
}

export interface ReadingProgressEntry {
  audioTime: number;
  scrollTop: number;
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
  toast: AppToast | null;
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

  // 💾 Library / Sync
  savedTextSets: TextSet[];
  currentSetId: string | null;
  googleDriveLinked: boolean;
  isSyncingToDrive: boolean;

  // 👤 Identity / Stripe
  userEmail: string | null;
  isPremium: boolean;

  // Progress map
  readingProgress: Record<string, ReadingProgressEntry>;

  /** Progress percentage while generating audio (0-100). 0 when idle */
  generationProgress: number;

  /** True while the TTS models/APIs are actively creating chunks */
  isGenerating: boolean;

  /** Partial-generation checkpoint loaded for current set (if any) */
  generationCheckpoint: { setId: string; resumeChunkIndex: number; totalChunks: number } | null;
}

export interface AppContextType {
  state: AppState;
  actions: {
    // Text actions
    setInputText: (text: string) => void;
    setUploadedPDF: (file: File | null) => void;
    setIsExtractingPDF: (extracting: boolean) => void;

    // Audio actions
    handleStartReading: (text?: string) => void;
    handleStopReading: () => void;
    cancelGeneration: () => void;
    continueGenerationFromCheckpoint: () => void;
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

    // Model selection actions
    setSelectedModel: (modelId: string) => void;
    setPreferredDevice: (device: 'webgpu' | 'wasm' | 'cpu' | 'serverless') => void;
    setPreferredDtype: (dtype: 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16') => void;
    setAutoSelect: (enabled: boolean) => void;
    setKeepLocal: (enabled: boolean) => void;
    setModelKeepLocal: (modelId: string, keepLocal: boolean) => void;

    // UI actions
    setToast: (toast: AppToast | null) => void;
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
    seekToTime: (time: number) => void;
    togglePlayPause: () => void;
    skipForward: () => void;
    skipBackward: () => void;
    getAudioBlob: () => Blob | null;
    setPlaybackRate: (rate: number) => void;
    primeAudioContext: () => void;

    // Library actions
    saveCurrentTextSet: (title?: string) => Promise<boolean>;
    loadTextSet: (id: string) => void;
    deleteTextSet: (id: string) => void;

    // Cloud sync
    linkGoogleDrive: () => void;
    disconnectDrive: () => void;
    forceSyncDrive: () => Promise<void>;

    // Identity
    loginUser: () => void;
    logoutUser: () => void;

    // Scroll progress
    updateScrollPosition: (scrollTop: number) => void;
  };

  // TTS hook data
  tts: {
    voices: Voice[];
    speak: (text: string, voice: string, onProgress?: (progress: number) => void) => Promise<any>;
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
    synthesisComplete: boolean;
    getAudioBlob: () => Blob | null;
    getPartialAudioBlob: () => Blob | null;
    getSynthesisChunkStats: () => { chunksGenerated: number; totalChunks: number; text: string };
    loadAudioFromBlob: (blob: Blob, wordTimings?: WordTiming[]) => Promise<void>;
    isReady: boolean;
    setPlaybackRate: (rate: number) => void;
    playbackRate: number;
    primeAudioContext: () => void;
  };
}
