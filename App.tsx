import React, { useState } from 'react';
import useKokoroWebWorkerTts from './hooks/useKokoroWebWorkerTts';
import PDFReader from './components/PDFReader';
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
    togglePlayPause
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
      setInputText(''); // Clear manual text when PDF is uploaded
    } else {
      setError({ title: 'Invalid File', message: 'Please upload a PDF file.' });
    }
  };

  const handlePDFTextExtracted = (text: string, chapters: Array<{id: string, title: string, page: number}>) => {
    setInputText(text);
    if (text.length === 0) {
      setError({ title: 'PDF Error', message: 'Could not extract text from this PDF. It may be a scanned document.' });
    }
  };

  const handleClearPDF = () => {
    setUploadedPDF(null);
    setInputText('');
    setInputMode('text');
  };

  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      color: '#e5e5e5',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #333',
        padding: '16px 24px',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          🎯 AI Narrator - Text to Speech
        </h1>
        <p style={{ margin: '8px 0 0 0', color: '#888', fontSize: '14px' }}>
          Type text or upload a PDF to convert to speech
        </p>
      </header>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '32px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        
        {/* Voice Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block',
            fontSize: '16px', 
            fontWeight: '600', 
            marginBottom: '8px',
            color: '#e5e5e5'
          }}>
            Choose Voice:
          </label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '12px 16px',
              backgroundColor: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '8px',
              color: '#e5e5e5',
              fontSize: '16px'
            }}
          >
            {voices.slice(0, 20).map((voice) => (
              <option key={voice.name} value={voice.name}>
                {voice.label}
              </option>
            ))}
          </select>
        </div>

        {/* Input Mode Toggle */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <button
              onClick={() => setInputMode('text')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: inputMode === 'text' ? '#4a90e2' : '#4a5568',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📝 Text Input
            </button>
            <button
              onClick={() => setInputMode('pdf')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: inputMode === 'pdf' ? '#4a90e2' : '#4a5568',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📄 PDF Upload
            </button>
            {uploadedPDF && (
              <button
                onClick={handleClearPDF}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#e53e3e',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕ Clear PDF
              </button>
            )}
          </div>
        </div>

        {/* PDF Upload Section */}
        {inputMode === 'pdf' && !uploadedPDF && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block',
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#e5e5e5'
            }}>
              Upload PDF:
            </label>
            <div style={{
              border: '2px dashed #4a5568',
              borderRadius: '8px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: '#2d3748'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
              <div style={{ marginBottom: '16px', color: '#e5e5e5' }}>
                Drop a PDF file here or click to browse
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{
                  margin: '0 auto',
                  padding: '8px 16px',
                  backgroundColor: '#4a90e2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              />
              <div style={{ marginTop: '12px', fontSize: '14px', color: '#888' }}>
                Supports text-based PDFs only
              </div>
            </div>
          </div>
        )}

        {/* PDF Reader */}
        {inputMode === 'pdf' && uploadedPDF && (
          <div style={{ marginBottom: '24px', minHeight: '400px' }}>
            <PDFReader
              file={uploadedPDF}
              onTextExtracted={handlePDFTextExtracted}
              currentSentence={currentSentence}
              readingProgress={0}
            />
          </div>
        )}

        {/* Text Input */}
        {inputMode === 'text' && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block',
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: '#e5e5e5'
            }}>
              Text to Read:
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter or paste text here to convert to speech..."
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '16px',
                backgroundColor: '#2d3748',
                border: '1px solid #4a5568',
                borderRadius: '8px',
                color: '#e5e5e5',
                fontSize: '16px',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none'
              }}
            />
            <div style={{ marginTop: '8px', fontSize: '14px', color: '#888' }}>
              Characters: {inputText.length}
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ marginBottom: '24px' }}>
          {/* Generation Controls */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px',
            marginBottom: canScrub ? '16px' : '0'
          }}>
            <button
              onClick={isReading ? handleStopReading : handleStartReading}
              disabled={!inputText.trim() || ttsLoading}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isReading ? '#e53e3e' : '#4a90e2',
                color: 'white',
                cursor: (!inputText.trim() || ttsLoading) ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: (!inputText.trim() || ttsLoading) ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {ttsLoading ? '⏳ Loading...' : 
               isReading ? '⏹️ Stop' : 
               canScrub ? '🔄 Regenerate' :
               '▶️ Generate Audio'}
            </button>

            <div style={{ fontSize: '14px', color: '#888' }}>
              {status}
            </div>
          </div>

          {/* Audio Player with Scrubbing */}
          {canScrub && (
            <div style={{
              backgroundColor: '#2d3748',
              border: '1px solid #4a5568',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '16px'
            }}>
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={togglePlayPause}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#4a90e2',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', color: '#e5e5e5' }}>
                      {formatTime(currentTime)}
                    </span>
                    <span style={{ fontSize: '14px', color: '#888' }}>
                      {formatTime(duration)}
                    </span>
                  </div>
                  
                  {/* Progress Bar / Scrubber */}
                  <div 
                    style={{
                      width: '100%',
                      height: '12px',
                      backgroundColor: '#4a5568',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      position: 'relative',
                      padding: '2px 0'
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      const seekTime = percentage * duration;
                      seekToTime(seekTime);
                    }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const hoverX = e.clientX - rect.left;
                      const percentage = Math.max(0, Math.min(1, hoverX / rect.width));
                      const hoverSeconds = percentage * duration;
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
                      backgroundColor: '#4a5568',
                      borderRadius: '2px'
                    }} />
                    
                    {/* Progress fill */}
                    <div 
                      style={{
                        position: 'absolute',
                        top: '4px',
                        left: '0',
                        width: `${(currentTime / duration) * 100}%`,
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
                        left: `${(hoverTime / duration) * 100}%`,
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
                        left: `${(currentTime / duration) * 100}%`,
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
                        left: `${(hoverTime / duration) * 100}%`,
                        transform: 'translateX(-50%)',
                        backgroundColor: '#2d3748',
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
              </div>
              
              <div style={{ fontSize: '12px', color: '#888', textAlign: 'center' }}>
                Click anywhere on the timeline to jump to that position
              </div>
            </div>
          )}
        </div>

        {/* Current Reading Display - Show when audio is available */}
        {(currentSentence || canScrub) && (
          <div style={{
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            border: '1px solid rgba(74, 144, 226, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '14px', color: '#4a90e2', marginBottom: '8px' }}>
              {isPlaying ? '🎵 Now Playing:' : canScrub ? '🎵 Audio Ready:' : '🎵 Generating Audio:'}
            </div>
            <div style={{ fontSize: '16px', color: '#e5e5e5', lineHeight: '1.4' }}>
              {inputText.length > 200 ? inputText.substring(0, 200) + '...' : inputText}
            </div>
          </div>
        )}

        {/* Sample Text Buttons - Only show for text mode */}
        {inputMode === 'text' && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
              Quick Test Samples:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                "Hello, this is a test of the AI narrator text-to-speech system.",
                "The quick brown fox jumps over the lazy dog. This tests all letters.",
                "Welcome to our AI-powered PDF reader and text-to-speech application. Upload a PDF or type text to get started."
              ].map((sample, index) => (
                <button
                  key={index}
                  onClick={() => setInputText(sample)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#4a5568',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#e5e5e5',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Sample {index + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#e53e3e',
          color: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 1000,
          maxWidth: '300px'
        }}>
          <strong>{error.title}</strong>
          {error.message && <div style={{ marginTop: '4px', fontSize: '14px' }}>{error.message}</div>}
          <button
            onClick={() => setError(null)}
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            ✕ Close
          </button>
        </div>
      )}
    </div>
  );
};

export default App;