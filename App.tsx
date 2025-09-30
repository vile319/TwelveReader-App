import React, { useState, useRef, useEffect } from 'react';
import VoiceSelector from './components/VoiceSelector';
import AudioControls from './components/AudioControls';
import TextInput from './components/TextInput';

// Available voices for Kokoro TTS
const VOICES = [
  { id: 'af_heart', label: 'AF Heart (Female)', gender: 'F', accent: 'American' },
  { id: 'af_sky', label: 'AF Sky (Female)', gender: 'F', accent: 'American' },
  { id: 'am_adam', label: 'AM Adam (Male)', gender: 'M', accent: 'American' },
  { id: 'am_michael', label: 'AM Michael (Male)', gender: 'M', accent: 'American' },
  { id: 'bf_emma', label: 'BF Emma (Female)', gender: 'F', accent: 'British' },
  { id: 'bf_isabella', label: 'BF Isabella (Female)', gender: 'F', accent: 'British' },
  { id: 'bm_george', label: 'BM George (Male)', gender: 'M', accent: 'British' },
  { id: 'bm_lewis', label: 'BM Lewis (Male)', gender: 'M', accent: 'British' },
];

const SAMPLE_TEXTS = [
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
    text: 'The theory of relativity, developed by Albert Einstein, revolutionized our understanding of space, time, and gravity.'
  },
];

const App: React.FC = () => {
  const [text, setText] = useState(SAMPLE_TEXTS[0].text);
  const [selectedVoice, setSelectedVoice] = useState('af_heart');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first interaction
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
  };

  // Update current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', updateTime);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', updateTime);
    };
  }, []);

  const generateSpeech = async () => {
    if (!text.trim()) {
      setError('Please enter some text');
      return;
    }

    initAudioContext();
    setIsLoading(true);
    setError(null);
    setStatus('Loading TTS model...');

    try {
      // Dynamic import of Kokoro TTS
      const { KokoroTTS } = await import('kokoro-js');
      
      setStatus('Initializing model...');
      
      // Initialize Kokoro TTS
      const tts = new KokoroTTS();
      await tts.init();
      
      setStatus('Generating speech...');
      
      // Generate audio
      const audioData = await tts.generate(text, selectedVoice);
      
      // Create blob and URL
      const blob = new Blob([audioData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      // Set audio source
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.load();
      }
      
      setStatus('Ready to play');
      setIsLoading(false);
    } catch (err) {
      console.error('Error generating speech:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
      setStatus('Error occurred');
      setIsLoading(false);
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
      });
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0);
    }
  };

  const downloadAudio = () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    const a = document.createElement('a');
    a.href = audio.src;
    a.download = 'tts-audio.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            🎧 TTS Reader
          </h1>
          <p className="text-slate-400 mt-2">Simple Text-to-Speech with AI Voices</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Text Input */}
          <div className="lg:col-span-2 space-y-6">
            <TextInput 
              text={text}
              setText={setText}
              sampleTexts={SAMPLE_TEXTS}
            />
            
            {/* Audio Controls */}
            <AudioControls
              isPlaying={isPlaying}
              isLoading={isLoading}
              currentTime={currentTime}
              duration={duration}
              onPlayPause={togglePlayPause}
              onSeek={handleSeek}
              onSkipForward={skipForward}
              onSkipBackward={skipBackward}
              onDownload={downloadAudio}
            />
          </div>

          {/* Right Column - Controls */}
          <div className="space-y-6">
            <VoiceSelector
              voices={VOICES}
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
            />
            
            {/* Generate Button */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <button
                onClick={generateSpeech}
                disabled={isLoading || !text.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 transform hover:scale-105 active:scale-95"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  '🎤 Generate Speech'
                )}
              </button>
              
              <div className="mt-3 text-sm text-slate-400 text-center">
                {status}
              </div>
            </div>

            {/* Status/Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="font-semibold mb-3 text-lg">ℹ️ About</h3>
              <ul className="text-sm text-slate-300 space-y-2">
                <li>• 100% browser-based</li>
                <li>• No data sent to servers</li>
                <li>• AI-powered voices</li>
                <li>• Free to use</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default App;
