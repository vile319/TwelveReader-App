import React, { useState } from 'react';
import { BRAND_NAME } from '../../utils/branding';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowOnboarding: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, onShowOnboarding }) => {
  const [activeSection, setActiveSection] = useState<'faq' | 'troubleshooting' | 'about'>('faq');

  const faqItemsRaw = [
    {
      question: `How does ${BRAND_NAME} work?`,
      answer: `${BRAND_NAME} uses advanced AI models that run entirely in your browser to convert text into natural-sounding speech. All processing happens locally - your text never leaves your device.`
    },
    {
      question: "What file formats are supported?",
      answer: "You can use plain text (type or paste) or upload PDF files. We automatically extract text from PDFs using PDF.js technology."
    },
    {
      question: "How many voices are available?",
      answer: "TwelveReader includes 65+ international AI voices covering American, British, European, Hindi, Italian, Japanese, Portuguese, Chinese, and French accents."
    },
    {
      question: "Can I use this offline?",
      answer: "Yes! After the initial model download (~100MB), TwelveReader works completely offline. Your privacy is protected and no internet connection is required."
    },
    {
      question: "Can I download the generated audio?",
      answer: "Absolutely! Once audio generation is complete, you can download the speech as a high-quality WAV file using the download button."
    },
    {
      question: "Is my data safe and private?",
      answer: "Yes, completely. TwelveReader is privacy-first - all text processing and speech generation happens locally in your browser. No data is sent to any servers."
    },
    {
      question: "How do I seek to specific parts of the audio?",
      answer: "You can click anywhere on the progress bar to jump to that position, or click on individual words in the highlighted text to seek to that exact moment."
    }
  ];

  const troubleshootingItemsRaw = [
    {
      question: "Audio sounds distorted or too quiet",
      answer: "Try enabling the 'Audio Fix' toggle in the sidebar. This normalizes audio levels and can resolve scaling issues on some systems."
    },
    {
      question: "Model download fails or gets stuck",
      answer: "Check your internet connection and try the 'Reset Model' button. This clears the cache and downloads the model fresh."
    },
    {
      question: "PDF upload isn't working",
      answer: "Make sure your PDF contains selectable text (not scanned images). Password-protected PDFs are not supported. Try a different PDF file."
    },
    {
      question: "Audio generation is very slow",
      answer: "Performance depends on your device. Check the Debug Audio button for system info. WebGPU-enabled browsers typically perform better than WASM fallback."
    },
    {
      question: "Text highlighting is not working",
      answer: "Highlighting only appears after audio generation is complete. Make sure to wait for the synthesis to finish, then try playing the audio."
    },
    {
      question: "Browser compatibility issues",
      answer: "TwelveReader works best in modern browsers (Chrome, Firefox, Safari, Edge). Older browsers may have limited support for AI models."
    }
  ];

  const faqItems = faqItemsRaw.map((item) => ({
    question: item.question.replace(/TwelveReader/g, BRAND_NAME),
    answer: item.answer.replace(/TwelveReader/g, BRAND_NAME),
  }));

  const troubleshootingItems = troubleshootingItemsRaw.map((item) => ({
    question: item.question.replace(/TwelveReader/g, BRAND_NAME),
    answer: item.answer.replace(/TwelveReader/g, BRAND_NAME),
  }));

  if (!isOpen) return null;

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
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #2d3748',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '700',
            margin: 0,
            color: '#e5e5e5'
          }}>
            ❓ Help & Support
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #4a5568',
              backgroundColor: 'transparent',
              color: '#e5e5e5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #2d3748'
        }}>
          {[
            { key: 'faq', label: '❓ FAQ', icon: '❓' },
            { key: 'troubleshooting', label: '🔧 Troubleshooting', icon: '🔧' },
            { key: 'about', label: 'ℹ️ About', icon: 'ℹ️' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as any)}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: activeSection === tab.key ? '#2d3748' : 'transparent',
                border: 'none',
                borderBottom: activeSection === tab.key ? '2px solid #4a90e2' : '2px solid transparent',
                color: activeSection === tab.key ? '#e5e5e5' : '#a0a0a0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {activeSection === 'faq' && (
            <div>
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                border: '1px solid rgba(74, 144, 226, 0.3)',
                borderRadius: '8px',
                fontSize: '14px'
              }}>
                <strong>💡 New to {BRAND_NAME}?</strong>{' '}
                <button
                  onClick={() => {
                    onClose();
                    onShowOnboarding();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4a90e2',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Take the guided tour
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {faqItems.map((item, index) => (
                  <div key={index} style={{
                    backgroundColor: '#2d3748',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    <div style={{
                      fontWeight: '600',
                      marginBottom: '8px',
                      color: '#e5e5e5'
                    }}>
                      {item.question}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      lineHeight: '1.5',
                      color: '#a0a0a0'
                    }}>
                      {item.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'troubleshooting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {troubleshootingItems.map((item, index) => (
                <div key={index} style={{
                  backgroundColor: '#2d3748',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <div style={{
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#e5e5e5'
                  }}>
                    {item.question}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: '#a0a0a0'
                  }}>
                    {item.answer}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection === 'about' && (
            <div>
              <div style={{
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {BRAND_NAME}
                </h3>
                <div style={{ fontSize: '14px', color: '#a0a0a0' }}>
                  AI-Powered Reading Assistant
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  backgroundColor: '#2d3748',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <h4 style={{ color: '#e5e5e5', marginBottom: '8px' }}>🎯 Mission</h4>
                  <p style={{ fontSize: '14px', color: '#a0a0a0', lineHeight: '1.5', margin: 0 }}>
                    Make reading accessible to everyone through advanced AI voice technology. 
                    Perfect for students, people with visual impairments, language learners, 
                    or anyone who prefers listening.
                  </p>
                </div>

                <div style={{
                  backgroundColor: '#2d3748',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <h4 style={{ color: '#e5e5e5', marginBottom: '8px' }}>🔒 Privacy Promise</h4>
                  <p style={{ fontSize: '14px', color: '#a0a0a0', lineHeight: '1.5', margin: 0 }}>
                    Your privacy is our priority. {BRAND_NAME} runs entirely in your browser 
                    with no data collection, no tracking, and no server uploads. 
                    What you read stays with you.
                  </p>
                </div>

                <div style={{
                  backgroundColor: '#2d3748',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <h4 style={{ color: '#e5e5e5', marginBottom: '8px' }}>⚡ Technology</h4>
                  <p style={{ fontSize: '14px', color: '#a0a0a0', lineHeight: '1.5', margin: 0 }}>
                    Powered by Kokoro AI and modern web technologies including WebGPU acceleration, 
                    Web Workers for smooth performance, and PDF.js for document processing.
                  </p>
                </div>

                <div style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#e5e5e5' }}>
                    <strong>💚 Open Source</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>
                    {BRAND_NAME} is built with open technologies and community support
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #2d3748',
          textAlign: 'center'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              backgroundColor: '#4a90e2',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;