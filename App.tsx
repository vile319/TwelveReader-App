import React, { useState, useEffect } from 'react';
import useKokoroWebWorkerTts from './hooks/useKokoroWebWorkerTts';
import PDFReader from './components/PDFReader';
import HighlightedText from './components/HighlightedText';
import AdSenseBanner from './components/AdSenseBanner';
import AdSensePopup from './components/AdSensePopup';
import { AppError } from './types';

const App: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState('af_heart');
  const [error, setError] = useState<AppError | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [isReading, setIsReading] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);

  // Model download consent
  const [showModelWarning, setShowModelWarning] = useState(false);
  const [modelAccepted, setModelAccepted] = useState(false);

  // Store pending read request during model download
  const [pendingRead, setPendingRead] = useState<{ text: string; voice: string } | null>(null);

  const {
    speak,
    stop,
    isPlaying,
    isLoading: ttsLoading,
    status,
    voices,
    canScrub,
    currentTime,
    duration,
    seekToTime,
    togglePlayPause,
    skipForward,
    skipBackward,
    wordTimings,
    currentWordIndex,
    clearModel,
    checkCacheStatus,
    debugAudioQuality,
    checkAudioQuality,
    normalizeAudio,
    toggleNormalizeAudio,
    synthesisComplete,
    getAudioBlob,
    isReady
  } = useKokoroWebWorkerTts({
    onError: setError,
    enabled: modelAccepted
  });

  const handleStartReading = async () => {
    if (!inputText.trim()) {
      setError({ title: 'No Text', message: 'Please enter some text or upload a PDF to read.' });
      return;
    }
    
    // Stop any previous audio before starting anew
    stop();

    // If model not accepted yet, show warning and remember intention
    if (!modelAccepted) {
      setPendingRead({ text: inputText.trim(), voice: selectedVoice });
      setShowModelWarning(true);
      return;
    }

    // If accepted but model still loading, store pending read and wait
    if (!isReady) {
      setPendingRead({ text: inputText.trim(), voice: selectedVoice });
      return;
    }
    
    console.log('🎵 Starting audio reading...');
    setIsReading(true);
    setCurrentSentence(inputText.trim());
    
    try {
      await speak(inputText.trim(), selectedVoice);
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
    stop();
    setCurrentSentence('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // State for enhanced seeking
  const [isSeekingHover, setIsSeekingHover] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  // Model download modal handlers
  const handleAcceptModelDownload = () => {
    setModelAccepted(true);
    setShowModelWarning(false);
    // pendingRead already stored; when model finishes downloading, useEffect will trigger speak()
  };

  const handleCancelModelDownload = () => {
    setShowModelWarning(false);
  };

  // Download synthesized audio as WAV
  const handleDownloadAudio = () => {
    const blob = getAudioBlob();
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

  // Auto-start reading once model finishes downloading
  useEffect(() => {
    if (isReady && pendingRead) {
      (async () => {
        try {
          await speak(pendingRead.text, pendingRead.voice);
        } catch {}
        setPendingRead(null);
      })();
    }
  }, [isReady, pendingRead, speak]);

  const sampleTexts = [
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

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f1419',
      color: '#e5e5e5',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      display: 'flex'
    }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Model Download Warning Modal */}
      {showModelWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: '#1a1e26',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #4a5568',
            maxWidth: '420px',
            textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '12px' }}>Download Speech Model</h2>
            <p style={{ fontSize: '14px', marginBottom: '24px' }}>
              The speech model (~100&nbsp;MB) needs to be downloaded the first time. Continue?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleAcceptModelDownload}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4a90e2',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Download & Continue
              </button>
              <button
                onClick={handleCancelModelDownload}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #4a5568',
                  borderRadius: '6px',
                  color: '#e5e5e5',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div style={{
        width: '320px',
        backgroundColor: '#1a1e26',
        borderRight: '1px solid #2d3748',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        overflowY: 'auto'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            marginBottom: '4px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            TwelveReader
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: '#a0a0a0',
            margin: 0
          }}>
            AI-powered reading
          </p>
        </div>

        {/* Status */}
        <div style={{
          backgroundColor: '#2d3748',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontSize: '13px',
          color: '#e5e5e5'
        }}>
          {status}
        </div>

        {/* Voice Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#e5e5e5'
          }}>
            🎭 Voice ({voices.length} available)
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '8px',
              color: '#e5e5e5',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {voices.map(voice => (
              <option key={voice.name} value={voice.name}>
                {voice.label}
              </option>
            ))}
          </select>
        </div>

        {/* PDF Upload */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#e5e5e5'
          }}>
            📄 PDF Upload
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '8px',
              color: '#e5e5e5',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          />
          {isExtractingPDF && (
            <div style={{
              fontSize: '12px',
              color: '#4a90e2',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #4a90e2',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Extracting text from PDF...
            </div>
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={isReading ? handleStopReading : handleStartReading}
          disabled={!inputText.trim() || ttsLoading}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isReading ? '#e53e3e' : '#4a90e2',
            color: 'white',
            cursor: (!inputText.trim() || ttsLoading) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            opacity: (!inputText.trim() || ttsLoading) ? 0.5 : 1,
            marginBottom: '16px'
          }}
        >
          {ttsLoading ? '⏳ Generating...' : 
           isReading ? '⏹️ Stop Generation' : 
           canScrub ? '🔄 Regenerate' :
           '▶️ Generate Audio'}
        </button>

        {/* Reset Model Button */}
        <button
          onClick={async () => {
            await clearModel();
            setInputText('');
            setUploadedPDF(null);
          }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #dc2626',
            backgroundColor: 'transparent',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          title="Clear and reload the AI model (fixes stuck states)"
        >
          🔄 Reset Model
        </button>
        
        {/* Cache Status Button */}
        <button
          onClick={async () => {
            const status = await checkCacheStatus();
            alert(`Cache Status:\n${status.cached ? '✅ Model is cached' : '❌ No cache found'}\nFiles: ${status.fileCount}\nSize: ${status.sizeFormatted || 'Unknown'}\n\nCheck console for detailed cache info.`);
          }}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #6b7280',
            backgroundColor: 'transparent',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          title="Check if the AI model is cached in your browser"
        >
          📊 Check Cache
        </button>
        
        {/* Debug Audio Quality Button */}
        <button
          onClick={async () => {
            const debugInfo = await debugAudioQuality();
            const qualityTest = await checkAudioQuality();
            
            let message = `Audio Debug Info:\n\n`;
            message += `🖥️ Platform: ${debugInfo.platform}\n`;
            message += `🤖 Device: ${debugInfo.device}\n`;
            message += `🎵 Sample Rate: ${debugInfo.sampleRate}Hz\n`;
            message += `⚡ WebGPU: ${debugInfo.webgpuSupported ? 'Yes' : 'No'}\n\n`;
            
            if (qualityTest) {
              message += `Test Audio Quality: ${qualityTest.quality}\n`;
              message += `Generation Time: ${qualityTest.generationTime}ms\n`;
              message += `Peak Level: ${qualityTest.peak}\n`;
              message += `RMS Level: ${qualityTest.rms}\n\n`;
            }
            
            message += `Check console (F12) for detailed logs.`;
            alert(message);
          }}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid #f59e0b',
            backgroundColor: 'transparent',
            color: '#f59e0b',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          title="Debug audio quality issues - compare results between computers"
        >
          🔍 Debug Audio
        </button>
        
        {/* Audio Normalization Toggle */}
        <button
          onClick={toggleNormalizeAudio}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '8px',
            border: `1px solid ${normalizeAudio ? '#10b981' : '#6b7280'}`,
            backgroundColor: normalizeAudio ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
            color: normalizeAudio ? '#10b981' : '#6b7280',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          title="Fix audio clipping/scaling issues (enable if audio sounds distorted)"
        >
          {normalizeAudio ? '✅' : '📢'} Audio Fix: {normalizeAudio ? 'ON' : 'OFF'}
        </button>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#fed7d7',
            color: '#c53030',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '24px'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{error.title}</div>
            <div>{error.message}</div>
            <button 
              onClick={() => setError(null)}
              style={{
                marginTop: '8px',
                padding: '4px 8px',
                backgroundColor: 'transparent',
                border: '1px solid #c53030',
                color: '#c53030',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Dismiss
            </button>
          </div>
        )}
        
        {/* Sidebar Banner Ad */}
        <div style={{ marginTop: 'auto' }}>
          <AdSenseBanner 
            adSlot="5566778899" 
            adFormat="rectangle"
            style={{ 
              margin: '16px 0 0 0',
              maxWidth: '280px' 
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: '320px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh'
      }}>
        {/* Top Banner Ad */}
        <AdSenseBanner 
          adSlot="1234567890" 
          adFormat="horizontal"
          style={{ marginBottom: '16px' }}
        />
        
        {/* Audio Player */}
        {canScrub && (
          <div style={{
            backgroundColor: '#1a1e26',
            border: '1px solid #2d3748',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            {/* Main Controls */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginBottom: '20px'
            }}>
              {/* Skip Back */}
              <button
                onClick={skipBackward}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#2d3748',
                  color: '#e5e5e5',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600'
                }}
              >
                -15s
              </button>
              
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#4a90e2',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)'
                }}
              >
                {isPlaying ? '⏸️' : '▶️'}
              </button>
              
              {/* Skip Forward */}
              <button
                onClick={skipForward}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#2d3748',
                  color: '#e5e5e5',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600'
                }}
              >
                +15s
              </button>
              
              {/* Time Display */}
                             <div style={{ flex: 1, textAlign: 'center' }}>
                 <div style={{ 
                   fontSize: '18px', 
                   fontWeight: '600',
                   color: '#e5e5e5',
                   marginBottom: '4px'
                 }}>
                   {formatTime(currentTime)} / {formatTime(duration || currentTime)}
                 </div>
                 {isReading && (
                   <div style={{ fontSize: '12px', color: '#4a90e2' }}>
                     Generating audio...
                   </div>
                 )}
               </div>
            </div>
            
            {/* Progress Bar */}
            <div 
              style={{
                width: '100%',
                height: '12px',
                backgroundColor: '#2d3748',
                borderRadius: '6px',
                cursor: 'pointer',
                position: 'relative',
                padding: '2px 0'
              }}
                               onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const clickX = e.clientX - rect.left;
                   const percentage = clickX / rect.width;
                   const maxTime = duration || currentTime;
                   const seekTime = percentage * maxTime;
                   seekToTime(seekTime);
                 }}
                               onMouseMove={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const hoverX = e.clientX - rect.left;
                   const percentage = Math.max(0, Math.min(1, hoverX / rect.width));
                   const maxTime = duration || currentTime;
                   const hoverSeconds = percentage * maxTime;
                   setHoverTime(hoverSeconds);
                   setIsSeekingHover(true);
                 }}
              onMouseLeave={() => {
                setIsSeekingHover(false);
                setIsDragging(false);
              }}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
            >
              {/* Background track */}
              <div style={{
                position: 'absolute',
                top: '4px',
                left: '0',
                right: '0',
                height: '4px',
                backgroundColor: '#2d3748',
                borderRadius: '2px'
              }} />
              
              {/* Progress fill */}
                               <div 
                   style={{
                     position: 'absolute',
                     top: '4px',
                     left: '0',
                     width: `${((currentTime / (duration || currentTime || 1)) * 100)}%`,
                     height: '4px',
                     backgroundColor: '#4a90e2',
                     borderRadius: '2px',
                     transition: isDragging ? 'none' : 'width 0.1s ease'
                   }}
                 />
              
              {/* Hover position indicator */}
              {isSeekingHover && (
                                   <div style={{
                     position: 'absolute',
                     top: '2px',
                     left: `${(hoverTime / (duration || currentTime || 1)) * 100}%`,
                     width: '2px',
                     height: '8px',
                     backgroundColor: '#e2e8f0',
                     borderRadius: '1px',
                     transform: 'translateX(-50%)',
                     opacity: 0.7
                   }} />
              )}
              
              {/* Scrub handle */}
                               <div 
                   style={{
                     position: 'absolute',
                     top: '50%',
                     left: `${(currentTime / (duration || currentTime || 1)) * 100}%`,
                     width: '20px',
                     height: '20px',
                     backgroundColor: '#4a90e2',
                     borderRadius: '50%',
                     transform: 'translate(-50%, -50%)',
                     cursor: isDragging ? 'grabbing' : 'grab',
                     border: '3px solid white',
                     boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                     transition: isDragging ? 'none' : 'all 0.1s ease',
                     scale: isDragging ? '1.1' : '1'
                   }}
                 />
              
              {/* Time tooltip on hover */}
              {isSeekingHover && (
                                     <div style={{
                       position: 'absolute',
                       top: '-35px',
                       left: `${(hoverTime / (duration || currentTime || 1)) * 100}%`,
                       transform: 'translateX(-50%)',
                       backgroundColor: '#1a1e26',
                       color: 'white',
                       padding: '4px 8px',
                       borderRadius: '4px',
                       fontSize: '12px',
                       fontWeight: '500',
                       boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                       pointerEvents: 'none',
                       zIndex: 10
                     }}>
                       {formatTime(hoverTime)}
                     </div>
              )}
            </div>
          </div>
        )}

        {synthesisComplete && (
          <button
            onClick={handleDownloadAudio}
            style={{
              margin: '16px 0',
              padding: '8px 16px',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              alignSelf: 'flex-start'
            }}
          >
            ⬇️ Download Audio
          </button>
        )}

        {/* Text Input Area */}
        <div style={{ 
          flex: 1,
          backgroundColor: '#1a1e26',
          border: '1px solid #2d3748',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: '600',
              margin: 0,
              color: '#e5e5e5'
            }}>
              Text Input
            </h2>
            <div style={{ 
              fontSize: '14px', 
              color: '#a0a0a0'
            }}>
              {inputText.length} characters
            </div>
          </div>
          
          {(() => {
            // Debug the highlighting condition
            console.log('🔍 Highlighting condition check:', { 
              canScrub, 
              wordTimingsLength: wordTimings.length, 
              currentWordIndex, 
              shouldShowHighlighting: canScrub && wordTimings.length > 0 
            });
            return null;
          })()}
          
          {canScrub ? (
            <HighlightedText 
              text={inputText}
              wordTimings={wordTimings}
              currentWordIndex={currentWordIndex}
              style={{ flex: 1 }}
            />
          ) : (
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter your text here to generate speech... or upload a PDF above to extract text"
              style={{
                flex: 1,
                width: '100%',
                padding: '16px',
                backgroundColor: '#0f1419',
                border: '1px solid #2d3748',
                borderRadius: '8px',
                color: '#e5e5e5',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                lineHeight: '1.6'
              }}
            />
          )}
          
          {/* Sample Texts */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#e5e5e5'
            }}>
              📚 Sample Texts
            </div>
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}>
              {sampleTexts.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setInputText(sample.text)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#2d3748',
                    border: '1px solid #4a5568',
                    borderRadius: '6px',
                    color: '#e5e5e5',
                    cursor: 'pointer',
                    fontSize: '12px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#374151';
                    e.currentTarget.style.borderColor = '#4a90e2';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#2d3748';
                    e.currentTarget.style.borderColor = '#4a5568';
                  }}
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Banner Ad */}
        <AdSenseBanner 
          adSlot="0987654321" 
          adFormat="horizontal"
          style={{ marginTop: '16px' }}
        />

        {/* Hidden PDF Reader for extraction */}
        {uploadedPDF && (
          <div style={{ display: 'none' }}>
            <PDFReader
              file={uploadedPDF}
              onTextExtracted={handlePDFTextExtracted}
              currentSentence={currentSentence}
              readingProgress={0}
              wordTimings={[]}
              currentWordIndex={-1}
            />
          </div>
        )}
      </div>
      
      {/* Popup Ad */}
      <AdSensePopup 
        adSlot="1122334455"
        showInterval={10} // Show every 10 minutes
      />
    </div>
  );
};

export default App;