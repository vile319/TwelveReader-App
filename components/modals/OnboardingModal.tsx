import React, { useState } from 'react';
import { BRAND_NAME } from '../../utils/branding';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: `Welcome to ${BRAND_NAME}`,
      icon: "🎉",
      content: (
        <div>
          <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
            Transform any text into natural speech with AI-powered voices. 
            Perfect for studying, accessibility, or just enjoying content hands-free.
          </p>
          <div style={{
            backgroundColor: 'rgba(74, 144, 226, 0.1)',
            border: '1px solid rgba(74, 144, 226, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '14px'
          }}>
            <strong>🔒 Privacy First:</strong> Everything runs locally in your browser. 
            Your text and audio never leave your device.
          </div>
        </div>
      )
    },
    {
      title: "How to Get Started",
      icon: "📝",
      content: (
        <div>
          <div style={{ fontSize: '16px', marginBottom: '20px' }}>
            You can add text in two ways:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px',
              backgroundColor: '#2d3748',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '24px' }}>✍️</span>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Type or Paste Text</div>
                <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
                  Write directly in the text area or paste from anywhere
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px',
              backgroundColor: '#2d3748',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '24px' }}>📄</span>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Upload PDF</div>
                <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
                  Upload any PDF and we'll extract the text automatically
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Choose Your Voice",
      icon: "🎭",
      content: (
        <div>
          <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
            Select from 65+ international AI voices including:
          </p>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ padding: '8px', backgroundColor: '#2d3748', borderRadius: '6px', textAlign: 'center' }}>
              🇺🇸 American
            </div>
            <div style={{ padding: '8px', backgroundColor: '#2d3748', borderRadius: '6px', textAlign: 'center' }}>
              🇬🇧 British
            </div>
            <div style={{ padding: '8px', backgroundColor: '#2d3748', borderRadius: '6px', textAlign: 'center' }}>
              🇯🇵 Japanese
            </div>
            <div style={{ padding: '8px', backgroundColor: '#2d3748', borderRadius: '6px', textAlign: 'center' }}>
              🇫🇷 French
            </div>
          </div>
          <div style={{
            fontSize: '14px',
            color: '#a0a0a0',
            textAlign: 'center'
          }}>
            And many more languages and accents!
          </div>
        </div>
      )
    },
    {
      title: "Smart Audio Controls",
      icon: "🎧",
      content: (
        <div>
          <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '16px' }}>
            {BRAND_NAME} offers advanced audio features:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <div>
                <strong>Word-level highlighting</strong> - Follow along as each word is spoken
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>⏯️</span>
              <div>
                <strong>Smart controls</strong> - Play, pause, skip forward/backward 15 seconds
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>📍</span>
              <div>
                <strong>Click to seek</strong> - Click any word to jump to that position
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px' }}>💾</span>
              <div>
                <strong>Download audio</strong> - Save generated speech as WAV files
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "You're All Set!",
      icon: "🚀",
      content: (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '20px' }}>
            Ready to start reading with your ears? Let's go!
          </p>
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>
              <strong>💡 Pro Tip:</strong>
            </div>
            <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
              Try the sample texts below to test different voices and see how highlighting works!
            </div>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#718096'
          }}>
            You can access this tutorial anytime from the Help button in the sidebar.
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

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
        borderRadius: '16px',
        border: '1px solid #2d3748',
        maxWidth: '480px',
        width: '100%',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid #2d3748',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {currentStepData.icon}
          </div>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '700',
            margin: 0,
            color: '#e5e5e5'
          }}>
            {currentStepData.title}
          </h2>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px',
          color: '#e5e5e5',
          minHeight: '200px'
        }}>
          {currentStepData.content}
        </div>

        {/* Progress Bar */}
        <div style={{
          padding: '0 24px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            {steps.map((_, index) => (
              <div
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: index <= currentStep ? '#4a90e2' : '#2d3748',
                  transition: 'background-color 0.3s'
                }}
              />
            ))}
          </div>
          <div style={{
            textAlign: 'center',
            fontSize: '12px',
            color: '#718096'
          }}>
            Step {currentStep + 1} of {steps.length}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={isFirstStep}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: '1px solid #4a5568',
              borderRadius: '8px',
              color: isFirstStep ? '#4a5568' : '#e5e5e5',
              cursor: isFirstStep ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: isFirstStep ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (!isFirstStep) {
                e.currentTarget.style.backgroundColor = '#2d3748';
              }
            }}
            onMouseOut={(e) => {
              if (!isFirstStep) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            ← Previous
          </button>

          <button
            onClick={() => {
              if (isLastStep) {
                onClose();
              } else {
                setCurrentStep(currentStep + 1);
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4a90e2',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#357abd';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#4a90e2';
            }}
          >
            {isLastStep ? '🎉 Get Started!' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;