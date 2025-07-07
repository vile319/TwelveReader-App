import React from 'react';
import { useAppContext, sampleTexts } from '../../contexts/AppContext';
import HighlightedText from '../HighlightedText';
import PDFReader from '../PDFReader';

const TextInputPanel: React.FC = () => {
  const { state, actions } = useAppContext();

  const renderContent = () => {
    return (
      <div style={{
        flex: 1,
        backgroundColor: '#0f1419',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #2d3748',
        minHeight: '200px',
        overflow: 'auto'
      }}>
        {state.inputText.length > 0 ? (
          <HighlightedText 
            text={state.inputText} 
            wordTimings={state.audio.wordTimings}
            currentWordIndex={state.audio.currentWordIndex}
            onWordClick={actions.handleWordClick}
          />
        ) : (
          <div style={{
            textAlign: 'center',
            color: '#718096',
            fontSize: '14px',
            padding: '40px 20px'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>📝</div>
            <div style={{ marginBottom: '8px' }}>
              Enter text above or upload a PDF to get started
            </div>
            <div style={{ fontSize: '12px', color: '#4a5568' }}>
              Your text will appear here with synchronized highlighting during playback
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1a1e26',
      border: '1px solid #2d3748',
      borderRadius: '16px',
      padding: '24px',
    }}>
      {/* Header */}
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
          color: '#a0a0a0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{state.inputText.length.toLocaleString()} characters</span>
          {state.inputText.length > 0 && (
            <span style={{ 
              color: '#4a90e2',
              fontSize: '12px',
              backgroundColor: 'rgba(74, 144, 226, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              Ready
            </span>
          )}
        </div>
      </div>

      {/* Text Input Area */}
      <textarea
        value={state.inputText}
        onChange={(e) => actions.setInputText(e.target.value)}
        placeholder="Enter text here or upload a PDF file..."
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '12px',
          backgroundColor: '#0f1419',
          border: '1px solid #2d3748',
          borderRadius: '8px',
          color: '#e5e5e5',
          fontSize: '14px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          resize: 'vertical',
          marginBottom: '16px',
          lineHeight: '1.5'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#4a90e2';
          e.target.style.boxShadow = '0 0 0 2px rgba(74, 144, 226, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#2d3748';
          e.target.style.boxShadow = 'none';
        }}
      />
      
      {/* Debug highlighting condition */}
      {(() => {
        console.log('🔍 Highlighting condition check:', { 
          canScrub: state.audio.canScrub, 
          wordTimingsLength: state.audio.wordTimings.length, 
          currentWordIndex: state.audio.currentWordIndex, 
          shouldShowHighlighting: state.audio.canScrub && state.audio.wordTimings.length > 0 
        });
        return null;
      })()}
      
      {/* Content Display */}
      {renderContent()}
      
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
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '8px'
        }}>
          {sampleTexts.map((sample, index) => (
            <button
              key={index}
              onClick={() => actions.setInputText(sample.text)}
              style={{
                padding: '8px 12px',
                backgroundColor: '#2d3748',
                border: '1px solid #4a5568',
                borderRadius: '6px',
                color: '#e5e5e5',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.borderColor = '#4a90e2';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#2d3748';
                e.currentTarget.style.borderColor = '#4a5568';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Current Reading Indicator */}
      {state.currentSentence && (
        <div style={{
          marginTop: '16px',
          backgroundColor: 'rgba(74, 144, 226, 0.1)',
          border: '1px solid rgba(74, 144, 226, 0.3)',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#4a90e2', 
            marginBottom: '8px',
            fontWeight: '600'
          }}>
            🎧 Currently Reading:
          </div>
          <div style={{ 
            fontSize: '14px', 
            color: '#e5e5e5', 
            lineHeight: '1.4',
            fontStyle: 'italic'
          }}>
            {state.currentSentence.length > 200 
              ? state.currentSentence.substring(0, 200) + '...' 
              : state.currentSentence}
          </div>
        </div>
      )}

      {/* Hidden PDF Reader for extraction */}
      {state.uploadedPDF && (
        <div style={{ display: 'none' }}>
                  <PDFReader
          file={state.uploadedPDF}
          onTextExtracted={actions.handlePDFTextExtracted}
          currentSentence={state.currentSentence}
          readingProgress={0}
          wordTimings={state.audio.wordTimings}
          currentWordIndex={state.audio.currentWordIndex}
        />
        </div>
      )}
    </div>
  );
};

export default TextInputPanel;