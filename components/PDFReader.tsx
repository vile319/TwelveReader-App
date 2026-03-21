import { type FC, useEffect } from 'react';

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
  onProgress?: (page: number, totalPages: number) => void;
}

const PDFReader: FC<PDFReaderProps> = ({ 
  file, 
  onTextExtracted, 
  onProgress
}) => {
  useEffect(() => {
    if (file) {
      extractPDFText();
    }
  }, [file]);

  const extractPDFText = async () => {
    let pdf: any = null;
    
    try {
      console.log('📄 Starting PDF text extraction...');
      
      const pdfjsLib = await loadPdfJs();
      
      // Configure worker to use CDN version that matches the library version
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.269/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0 
      }).promise;
      
      console.log(`📚 PDF loaded: ${pdf.numPages} pages`);
      
      let allText = '';
      const totalPages = pdf.numPages;
      
      for (let i = 1; i <= totalPages; i++) {
        try {
          onProgress?.(i, totalPages);
          console.log(`📖 Extracting page ${i}/${totalPages}...`);
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

          // Yield occasionally to keep the UI responsive on large PDFs.
          if (i % 5 === 0) {
            await new Promise<void>((r) => setTimeout(() => r(), 0));
          }
        } catch (pageError) {
          console.warn(`⚠️ Failed to extract page ${i}:`, pageError);
          continue;
        }
      }
      
      if (allText.trim() && allText.length > 50) {
        // Clean up the final text for TTS
        const finalText = allText
          .replace(/\s+/g, ' ') // Normalize whitespace
          .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure proper sentence spacing
          .replace(/([a-z])([A-Z])/g, '$1. $2') // Add periods between sentences
          .trim();
          
        console.log(`🎯 Final text ready: ${finalText.length} characters`);
        onTextExtracted(finalText);
        
      } else {
        throw new Error('Could not extract readable text from this PDF');
      }
      
      // Cleanup PDF resources to free memory
      try {
        await pdf.cleanup?.();
        await pdf.destroy?.();
      } catch {}
      
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      onTextExtracted(''); // Pass empty text instead of error message
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

  // No UI returns necessary — this component is rendered inside a hidden div solely for its side effects (extraction).
  return null;
};

export default PDFReader; 