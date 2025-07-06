import React from 'react';

interface ModelDownloadWarningProps {
  isVisible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const ModelDownloadWarning: React.FC<ModelDownloadWarningProps> = ({ 
  isVisible, 
  onAccept, 
  onDecline 
}) => {
  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1a1e26',
        border: '1px solid #2d3748',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '32px',
            marginRight: '12px'
          }}>
            ⚠️
          </div>
          <h3 style={{
            color: '#e5e5e5',
            fontSize: '20px',
            fontWeight: '600',
            margin: 0
          }}>
            Model Download Required
          </h3>
        </div>
        
        <div style={{
          color: '#a0a0a0',
          fontSize: '14px',
          lineHeight: '1.6',
          marginBottom: '24px'
        }}>
          <p style={{ margin: '0 0 16px 0' }}>
            TwelveReader needs to download the <strong>Kokoro AI model</strong> to provide text-to-speech functionality.
          </p>
          
          <div style={{
            backgroundColor: '#2d3748',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <h4 style={{
              color: '#e5e5e5',
              fontSize: '14px',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              📋 What you need to know:
            </h4>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              fontSize: '13px',
              lineHeight: '1.4'
            }}>
              <li>Model size: ~82MB (one-time download)</li>
              <li>Will be cached in your browser for future use</li>
              <li>Supports 40+ international voices</li>
              <li>Runs entirely in your browser (no data sent to servers)</li>
              <li>May take 1-2 minutes on slower connections</li>
            </ul>
          </div>
          
          <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
            <strong>Device Detection:</strong> The app will automatically choose the best processing method:
          </p>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>
            • <strong>⚡ GPU-accelerated</strong> (if WebGPU is available)<br/>
            • <strong>🖥️ CPU-optimized</strong> (fallback mode)
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onDecline}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: '1px solid #4a5568',
              borderRadius: '8px',
              color: '#a0a0a0',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2d3748';
              e.currentTarget.style.borderColor = '#6b7280';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#4a5568';
            }}
          >
            Maybe Later
          </button>
          <button
            onClick={onAccept}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4a90e2',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(74, 144, 226, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#357abd';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4a90e2';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Download & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelDownloadWarning; 