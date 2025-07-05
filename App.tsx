import React, { useState } from 'react';
import useKokoroWebWorkerTts from './hooks/useKokoroWebWorkerTts';
import PDFReader from './components/PDFReader';
import HighlightedText from './components/HighlightedText';
import { AppError } from './types';

const App: React.FC = () => {
  const [selectedVoice, setSelectedVoice] = useState('af_heart');
  const [error, setError] = useState<AppError | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [isReading, setIsReading] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'pdf'>('text');
  const [uploadedPDF, setUploadedPDF] = useState<File | null>(null);

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
    checkAudioQuality
  } = useKokoroWebWorkerTts({
    onError: setError
  });

  const handleStartReading = async () => {
    if (!inputText.trim()) {
      setError({ title: 'No Text', message: 'Please enter some text or upload a PDF to read.' });
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedPDF(file);
      setInputMode('pdf');
    } else {
      setError({ title: 'Invalid File', message: 'Please upload a PDF file.' });
    }
  };

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

        {/* Input Mode Toggle */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '12px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#e5e5e5'
          }}>
            📝 Input Mode
          </label>
          <div style={{
            backgroundColor: '#2d3748',
            padding: '4px',
            borderRadius: '8px',
            display: 'flex',
            border: '1px solid #4a5568'
          }}>
            <button
              onClick={() => {
                setInputMode('text');
                setUploadedPDF(null);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: inputMode === 'text' ? '#4a90e2' : 'transparent',
                color: inputMode === 'text' ? 'white' : '#a0a0a0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Text
            </button>
            <button
              onClick={() => setInputMode('pdf')}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: inputMode === 'pdf' ? '#4a90e2' : 'transparent',
                color: inputMode === 'pdf' ? 'white' : '#a0a0a0',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              PDF
            </button>
          </div>
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
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          title="Debug audio quality issues - compare results between computers"
        >
          🔍 Debug Audio
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
          {inputMode === 'text' ? (
            <>
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
                  placeholder="Enter your text here to generate speech..."
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
            </>
          ) : (
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                fontSize: '18px', 
                fontWeight: '600',
                marginBottom: '16px',
                color: '#e5e5e5'
              }}>
                PDF Upload
              </h2>
                             {uploadedPDF ? (
                 <PDFReader
                   file={uploadedPDF}
                   onTextExtracted={(text) => setInputText(text)}
                   currentSentence={currentSentence}
                   readingProgress={0}
                   wordTimings={wordTimings}
                   currentWordIndex={currentWordIndex}
                 />
               ) : (
                 <div style={{
                   flex: 1,
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   flexDirection: 'column',
                   gap: '16px',
                   border: '2px dashed #4a5568',
                   borderRadius: '8px',
                   backgroundColor: '#0f1419'
                 }}>
                   <div style={{ fontSize: '48px' }}>📄</div>
                   <div style={{ color: '#e5e5e5', marginBottom: '16px' }}>
                     Upload a PDF file to extract text
                   </div>
                   <input
                     type="file"
                     accept=".pdf"
                     onChange={handleFileUpload}
                     style={{
                       padding: '8px 16px',
                       backgroundColor: '#4a90e2',
                       color: 'white',
                       border: 'none',
                       borderRadius: '6px',
                       cursor: 'pointer'
                     }}
                   />
                   <div style={{ fontSize: '14px', color: '#888' }}>
                     Supports text-based PDFs only
                   </div>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;