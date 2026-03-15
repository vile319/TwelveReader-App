import React from 'react';
import { useAppContext } from '../../contexts/AppContext';

import { getModelInfo } from '../../components/ModelSelector';

const ModelWarningModal: React.FC = () => {
  const { state, actions } = useAppContext();

  if (!state.model.showModelWarning) return null;

  const modelInfo = getModelInfo(state.model.selectedModel);
  const sizeText = modelInfo?.size || '~100MB';

  return (
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
        <h2 style={{ marginBottom: '12px', color: '#e5e5e5' }}>
          Enable Local Speech Engine
        </h2>
        <p style={{
          fontSize: '14px',
          marginBottom: '24px',
          color: '#a0a0a0',
          lineHeight: '1.4'
        }}>
          A <strong>high-quality voice engine</strong> ({sizeText}) needs to be securely downloaded to your browser cache.
          This one-time process enables offline, private text-to-speech that never leaves your device.
        </p>
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={actions.handleAcceptModelDownload}
            style={{
              padding: '12px 20px',
              backgroundColor: '#4a90e2',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#357abd';
            }}
            onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#4a90e2';
            }}
          >
            Download and continue
          </button>
          <button
            onClick={actions.handleCancelModelDownload}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              border: '1px solid #4a5568',
              borderRadius: '8px',
              color: '#e5e5e5',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = '#2d3748';
              e.currentTarget.style.borderColor = '#718096';
            }}
            onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#4a5568';
            }}
          >
            Cancel
          </button>
        </div>
        <div style={{
          marginTop: '16px',
          fontSize: '12px',
          color: '#718096',
          lineHeight: '1.3'
        }}>
          <strong>Privacy note:</strong> Local models guarantee your text never leaves your device. Cloud processing (if selected) requires sending text securely to external servers.
        </div>
      </div>
    </div>
  );
};

export default ModelWarningModal;