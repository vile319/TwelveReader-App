import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import AdSenseBanner from '../AdSenseBanner';

const Sidebar: React.FC = () => {
  const { state, actions, tts } = useAppContext();

  return (
    <div className="sidebar" style={{
      width: '320px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      overflow: 'auto',
      backgroundColor: '#1a1e26',
      borderRight: '1px solid #2d3748',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
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
        {state.model.status}
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
          🎭 Voice ({tts.voices.length} available)
        </label>
        <select
          value={state.selectedVoice}
          onChange={(e) => actions.setSelectedVoice(e.target.value)}
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
          {tts.voices.map(voice => (
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
          onChange={actions.handleFileUpload}
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
        {state.isExtractingPDF && (
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
        onClick={state.isReading ? actions.handleStopReading : actions.handleStartReading}
        disabled={!state.inputText.trim() || state.audio.isLoading}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: state.isReading ? '#e53e3e' : '#4a90e2',
          color: 'white',
          cursor: (!state.inputText.trim() || state.audio.isLoading) ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: '600',
          opacity: (!state.inputText.trim() || state.audio.isLoading) ? 0.5 : 1,
          marginBottom: '16px',
          transition: 'all 0.2s'
        }}
      >
        {state.audio.isLoading ? '⏳ Generating...' : 
         state.isReading ? '⏹️ Stop Generation' : 
         state.audio.canScrub ? '🔄 Regenerate' :
         '▶️ Generate Audio'}
      </button>

      {/* Reset Model Button */}
      <button
        onClick={async () => {
          await actions.clearModel();
          actions.setInputText('');
          actions.setUploadedPDF(null);
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
          gap: '8px',
          transition: 'all 0.2s'
        }}
        title="Clear and reload the AI model (fixes stuck states)"
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        🔄 Reset Model
      </button>
      
      {/* Cache Status Button */}
      <button
        onClick={async () => {
          const status = await actions.checkCacheStatus();
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
          gap: '4px',
          transition: 'all 0.2s'
        }}
        title="Check if the AI model is cached in your browser"
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        📊 Check Cache
      </button>
      
      {/* Debug Audio Quality Button */}
      <button
        onClick={async () => {
          const debugInfo = await actions.debugAudioQuality();
          const qualityTest = await actions.checkAudioQuality();
          
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
          gap: '4px',
          transition: 'all 0.2s'
        }}
        title="Debug audio quality issues - compare results between computers"
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        🔍 Debug Audio
      </button>
      
      {/* Audio Normalization Toggle */}
      <button
        onClick={actions.toggleNormalizeAudio}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: '8px',
          border: `1px solid ${state.model.normalizeAudio ? '#10b981' : '#6b7280'}`,
          backgroundColor: state.model.normalizeAudio ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
          color: state.model.normalizeAudio ? '#10b981' : '#6b7280',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '500',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          transition: 'all 0.2s'
        }}
        title="Fix audio clipping/scaling issues (enable if audio sounds distorted)"
        onMouseOver={(e) => {
          if (!state.model.normalizeAudio) {
            e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
          }
        }}
        onMouseOut={(e) => {
          if (!state.model.normalizeAudio) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {state.model.normalizeAudio ? '✅' : '📢'} Audio Fix: {state.model.normalizeAudio ? 'ON' : 'OFF'}
      </button>

      {/* Help Button */}
      <button
        onClick={actions.handleShowHelp}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #4a90e2',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          color: '#4a90e2',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s'
        }}
        title="Get help and view tutorial"
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(74, 144, 226, 0.2)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(74, 144, 226, 0.1)';
        }}
      >
        ❓ Help & FAQ
      </button>

      {/* Error Display */}
      {state.error && (
        <div style={{
          backgroundColor: '#fed7d7',
          color: '#c53030',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '24px',
          border: '1px solid #fc8181'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{state.error.title}</div>
          <div style={{ marginBottom: '8px', lineHeight: '1.4' }}>{state.error.message}</div>
          <button 
            onClick={() => actions.setError(null)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: '1px solid #c53030',
              color: '#c53030',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#c53030';
              e.currentTarget.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#c53030';
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
  );
};

export default Sidebar;