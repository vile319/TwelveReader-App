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
      answer: `${BRAND_NAME} uses advanced AI models to convert text into natural-sounding speech. You can choose fast cloud processing or fully local processing where your text never leaves your device.`
    },
    {
      question: "What file formats are supported?",
      answer: "You can use plain text (type or paste), upload PDF files, or upload EPUB ebooks. We automatically extract text from documents for you."
    },
    {
      question: "How many voices are available?",
      answer: "TwelveReader includes 65+ international AI voices covering American, British, European, Hindi, Italian, Japanese, Portuguese, Chinese, and French accents."
    },
    {
      question: "Can I use this offline?",
      answer: "Yes. When you choose a local processing mode and download a voice model, ${BRAND_NAME} can run offline. Cloud mode requires an internet connection."
    },
    {
      question: "Can I download the generated audio?",
      answer: "Yes. Once audio generation is complete, you can download the speech as an audio file using the download button."
    },
    {
      question: "Is my data safe and private?",
      answer: "Local processing keeps your text on your device. Cloud processing sends text securely to servers to generate audio. You control which mode is used."
    },
    {
      question: "How do I seek to specific parts of the audio?",
      answer: "You can click anywhere on the progress bar to jump to that position, or click on individual words in the highlighted text to seek to that exact moment."
    }
  ];

  const troubleshootingItemsRaw = [
    {
      question: "Audio sounds distorted or too quiet",
      answer: "Check your system volume and output device, and make sure no other app is processing audio (EQ, spatial enhancements, etc.)."
    },
    {
      question: "Model download fails or gets stuck",
      answer: "Check your internet connection, keep the tab open, and try again. If it keeps failing, switch to cloud processing mode instead of local."
    },
    {
      question: "Document upload isn't working",
      answer: "Make sure your PDF or EPUB contains selectable text (not just scanned images). Password-protected or heavily protected files may not be supported."
    },
    {
      question: "Audio generation is very slow",
      answer: "Performance depends on your device and mode. Cloud mode is usually fastest. On local modes, a modern desktop browser with WebGPU support will perform better than mobile devices."
    },
    {
      question: "Text highlighting is not working",
      answer: "Highlighting only appears after audio generation is complete. Make sure to wait for the synthesis to finish, then try playing the audio."
    },
    {
      question: "Browser compatibility issues",
      answer: `${BRAND_NAME} works best in modern desktop browsers (Chrome, Edge, Safari). Some features, especially local processing, may not be available or stable on all mobile browsers.`
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
            Help & Support
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
            { key: 'faq', label: 'FAQ', icon: '' },
            { key: 'troubleshooting', label: 'Troubleshooting', icon: '' },
            { key: 'about', label: 'About', icon: '' }
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
                <strong>New to {BRAND_NAME}?</strong>{' '}
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
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>{BRAND_NAME.charAt(0)}</div>
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
                  <h4 style={{ color: '#e5e5e5', marginBottom: '8px' }}>Mission</h4>
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
                  <h4 style={{ color: '#e5e5e5', marginBottom: '8px' }}>Privacy promise</h4>
                  <p style={{ fontSize: '14px', color: '#a0a0a0', lineHeight: '1.5', margin: 0 }}>
                    Your privacy is our priority. In local modes, {BRAND_NAME} runs on your device with no server uploads. 
                    In cloud mode, text is sent securely to generate audio and is not used for advertising.
                  </p>
                </div>

                <div style={{
                  backgroundColor: '#2d3748',
                  borderRadius: '8px',
                  padding: '16px'
                }}>
                  <h4 style={{ color: '#e5e5e5', marginBottom: '8px' }}>Technology</h4>
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
                    <strong>Open source</strong>
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