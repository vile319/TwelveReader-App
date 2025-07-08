import { type FC, useEffect, useState } from 'react';
import HighlightedText from './HighlightedText';

// --- New Robust PDF.js Loader ---
// This promise ensures we only try to load the script once.
let pdfjsLibPromise: Promise<any> | null = null;

const loadPdfJs = () => {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = new Promise((resolve, reject) => {
      const scriptId = 'pdfjs-script';
      
      // If the script is already in the DOM, assume it's loaded or loading.
      if (document.getElementById(scriptId)) {
        // A simple polling mechanism to wait for the library to be available.
        const interval = setInterval(() => {
          if ((window as any).pdfjsLib) {
            clearInterval(interval);
            resolve((window as any).pdfjsLib);
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.min.mjs';
      script.type = 'module';
      script.onload = () => {
        console.log('✅ pdf.js script loaded.');
        // Poll to ensure the library is attached to the window object.
        const interval = setInterval(() => {
          if ((window as any).pdfjsLib) {
            clearInterval(interval);
            resolve((window as any).pdfjsLib);
          }
        }, 100);
      };
      script.onerror = () => {
        console.error('❌ Failed to load pdf.js script.');
        reject(new Error('Could not load the PDF processing library. Please check your internet connection and try again.'));
      };
      document.body.appendChild(script);
    });
  }
  return pdfjsLibPromise;
};

interface PDFReaderProps {
  file: File;
  onTextExtracted: (text: string) => void;
  currentSentence: string;
  wordTimings?: Array<{word: string, start: number, end: number}>;
  currentWordIndex?: number;
}

const PDFReader: FC<PDFReaderProps> = ({ 
  file, 
  onTextExtracted, 
  currentSentence,
  wordTimings = [],
  currentWordIndex = -1
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [extractedText, setExtractedText] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (file) {
      extractPDFText();
    }
  }, [file]);

  const extractPDFText = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      console.log('📄 Starting PDF text extraction...');
      
      const pdfjsLib = await loadPdfJs();
      
      // Configure worker to use CDN version that matches the library version
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0 
      }).promise;
      
      console.log(`📚 PDF loaded: ${pdf.numPages} pages`);
      
      let allText = '';
      const maxPages = Math.min(pdf.numPages, 50); // Limit for performance
      
      for (let i = 1; i <= maxPages; i++) {
        try {
          console.log(`📖 Extracting page ${i}/${maxPages}...`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .filter((item: any) => item.str && typeof item.str === 'string' && item.str.trim())
            .map((item: any) => item.str.trim())
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
            
          if (pageText && pageText.length > 0) {
            allText += pageText + ' ';
            console.log(`✅ Page ${i}: ${pageText.length} characters`);
          }
        } catch (pageError) {
          console.warn(`⚠️ Failed to extract page ${i}:`, pageError);
          continue;
        }
      }
      
      if (allText.trim() && allText.length > 50 && allText.length < 1000000) { // Reasonable text length
        // Clean up the final text for TTS
        const finalText = allText
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure proper sentence spacing
          .replace(/([a-z])([A-Z])/g, '$1. $2') // Add periods between sentences
          .trim();
          
        setExtractedText(finalText);
        
        // Create chapters if you wish to use them by uncommenting below
        // const chapters = createChapters(finalText);
        
        console.log(`🎯 Final text ready: ${finalText.length} characters`);
        onTextExtracted(finalText);
        
      } else {
        throw new Error('Could not extract readable text from this PDF');
      }
      
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      const errorMessage = 'Unable to extract text from this PDF. This might be a scanned PDF (image-based) or password-protected. Please try a different PDF file that contains selectable text.';
      setError(errorMessage);
      onTextExtracted(''); // Pass empty text instead of error message
    } finally {
      setIsLoading(false);
    }
  };

  // const createChapters = (text: string): Array<{id: string, title: string, page: number}> => {
  //   const chapters: Array<{id: string, title: string, page: number}> = [];
  //   
  //   // Split text into roughly equal chunks for chapters
  //   const wordsPerChapter = Math.max(500, Math.floor(text.split(' ').length / 5));
  //   const words = text.split(' ');
  //   
  //   for (let i = 0; i < words.length; i += wordsPerChapter) {
  //     const chapterNumber = Math.floor(i / wordsPerChapter) + 1;
  //     const startWords = words.slice(i, i + 10).join(' ');
  //     const title = startWords.length > 50 
  //       ? startWords.substring(0, 47) + '...'
  //       : startWords;
  //       
  //     chapters.push({
  //       id: `chapter-${chapterNumber}`,
  //       title: `Chapter ${chapterNumber}: ${title}`,
  //       page: chapterNumber
  //     });
  //   }
  //   
  //   return chapters.length > 0 ? chapters : [
  //     { id: 'full-document', title: 'Full Document', page: 1 }
  //   ];
  // };

  if (isLoading) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: '#888'
      }}>
        <div style={{ fontSize: '32px' }}>📄</div>
        <div>Extracting text from PDF...</div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          Using PDF.js to properly extract readable text...
        </div>
        <div style={{ 
          width: '200px', 
          height: '4px', 
          backgroundColor: '#333', 
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#4a90e2',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: '#888',
        padding: '32px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', color: '#ff6b6b' }}>⚠️</div>
        <div style={{ fontSize: '18px', marginBottom: '8px' }}>PDF Processing Failed</div>
        <div style={{ fontSize: '14px', color: '#666', maxWidth: '400px', lineHeight: '1.4' }}>
          {error}
        </div>
        <div style={{ fontSize: '12px', color: '#555', marginTop: '16px' }}>
          Try uploading a different PDF file, or a PDF that was created from text (not scanned images).
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#1a1e26',
      overflow: 'hidden',
      width: '100%'
    }}>
      {/* Text Stats */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid #2d3748',
        backgroundColor: '#1a1e26',
        fontSize: '14px',
        color: '#a0a0a0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          📝 {extractedText.length.toLocaleString()} characters extracted • Ready for audio
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {file.name} • {(file.size / 1024 / 1024).toFixed(1)} MB
        </div>
      </div>

      {/* Content Display */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px',
        backgroundColor: '#0f1419'
      }}>
        <div style={{
          width: '100%',
          backgroundColor: '#1a1e26',
          borderRadius: '12px',
          padding: '32px',
          border: '1px solid #2d3748'
        }}>
          {/* Success Message */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
            <div style={{ fontSize: '20px', color: '#e5e5e5', marginBottom: '8px' }}>
              PDF Text Extracted Successfully!
            </div>
            <div style={{ fontSize: '14px', color: '#888' }}>
              {extractedText.length.toLocaleString()} characters ready for audio reading
            </div>
          </div>

          {/* Text Preview */}
          <div style={{
            backgroundColor: '#0f1419',
            border: '1px solid #2d3748',
            borderRadius: '8px',
            padding: '20px',
            maxHeight: '400px',
            overflow: 'auto',
            width: '100%'
          }}>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '12px' }}>
              Text Preview:
            </div>
            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#e5e5e5',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {wordTimings.length > 0 ? (
                <HighlightedText 
                  text={extractedText.substring(0, 2000)}
                  wordTimings={wordTimings}
                  currentWordIndex={currentWordIndex}
                />
              ) : (
                <>
                  {extractedText.substring(0, 2000)}
                  {extractedText.length > 2000 && (
                    <span style={{ color: '#888' }}>
                      ... ({(extractedText.length - 2000).toLocaleString()} more characters)
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Current Reading Indicator */}
          {currentSentence && (
            <div style={{
              marginTop: '24px',
              backgroundColor: 'rgba(74, 144, 226, 0.1)',
              border: '1px solid rgba(74, 144, 226, 0.3)',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#4a90e2', marginBottom: '8px' }}>
                Currently Reading:
              </div>
              <div style={{ fontSize: '14px', color: '#e5e5e5', lineHeight: '1.4' }}>
                {currentSentence}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#888'
          }}>
            Click the <strong>Play</strong> button below to start audio reading
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFReader; 