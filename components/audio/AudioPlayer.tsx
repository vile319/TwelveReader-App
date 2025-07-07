import React from 'react';
import { useAppContext } from '../../contexts/AppContext';

const AudioPlayer: React.FC = () => {
  const { state, actions, tts } = useAppContext();

  return (
    <div style={{
      backgroundColor: '#1a1e26',
      border: '1px solid #2d3748',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      transition: 'opacity 0.3s',
      opacity: state.audio.canScrub ? 1 : 0.5,
      pointerEvents: state.audio.canScrub ? 'auto' : 'none',
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
          onClick={actions.skipBackward}
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
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#4a5568';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#2d3748';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          -15s
        </button>
        
        {/* Play/Pause */}
        <button
          onClick={actions.togglePlayPause}
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
            boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#357abd';
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(74, 144, 226, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#4a90e2';
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 144, 226, 0.3)';
          }}
        >
          {state.audio.isPlaying ? '⏸️' : '▶️'}
        </button>
        
        {/* Skip Forward */}
        <button
          onClick={actions.skipForward}
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
            fontWeight: '600',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#4a5568';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#2d3748';
            e.currentTarget.style.transform = 'scale(1)';
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
            {actions.formatTime(state.audio.currentTime)} / {actions.formatTime(state.audio.duration || state.audio.currentTime)}
          </div>
          {state.isReading && (
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
          cursor: state.audio.canScrub ? 'pointer' : 'not-allowed',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseMove={(e) => {
          if (!state.audio.canScrub) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const hoverPosition = (e.clientX - rect.left) / rect.width;
          actions.setHoverTime(hoverPosition * (state.audio.duration || 0));
          actions.setIsSeekingHover(true);
        }}
        onMouseLeave={() => {
          if (!state.audio.canScrub) return;
          actions.setIsSeekingHover(false);
        }}
        onMouseDown={(e) => {
          if (!state.audio.canScrub) return;
          actions.setIsDragging(true);
          const rect = e.currentTarget.getBoundingClientRect();
          const clickPosition = (e.clientX - rect.left) / rect.width;
          const newTime = clickPosition * (state.audio.duration || 0);
          actions.seekToTime(newTime);
        }}
        onMouseUp={() => {
          if (!state.audio.canScrub) return;
          actions.setIsDragging(false);
        }}
      >
        {/* Progress Fill */}
        <div style={{
          width: `${((state.audio.duration || 0) > 0 ? (state.audio.currentTime / (state.audio.duration || 1)) * 100 : 0)}%`,
          height: '100%',
          backgroundColor: '#4a90e2',
          borderRadius: '6px',
          transition: 'width 0.1s ease-out'
        }}></div>
        
        {/* Hover Time Tooltip */}
        {state.isSeekingHover && (
          <div style={{
            position: 'absolute',
            left: `${(state.hoverTime / (state.audio.duration || 1)) * 100}%`,
            top: '-35px',
            transform: 'translateX(-50%)',
            padding: '4px 8px',
            backgroundColor: '#0f1419',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            border: '1px solid #4a5568',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 10
          }}>
            {actions.formatTime(state.hoverTime)}
          </div>
        )}
      </div>
      
      {/* Download Button */}
      {state.audio.synthesisComplete && (
        <div style={{
          marginTop: '16px',
          textAlign: 'center'
        }}>
          <button
            onClick={actions.handleDownloadAudio}
            style={{
              padding: '10px 20px',
              backgroundColor: '#10b981',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            💾 Download Audio (WAV)
          </button>
        </div>
      )}

      {/* Audio Stats */}
      {state.audio.canScrub && (
        <div style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#718096'
        }}>
          {state.audio.wordTimings.length > 0 && (
            <span>
              {state.audio.wordTimings.length} words tracked • 
              {state.audio.currentWordIndex >= 0 && state.audio.currentWordIndex < state.audio.wordTimings.length && (
                <span style={{ color: '#4a90e2', fontWeight: '500' }}>
                  {' '}highlighting "{state.audio.wordTimings[state.audio.currentWordIndex]?.word}"
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;