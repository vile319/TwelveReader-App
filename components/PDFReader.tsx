import { type FC, useEffect } from 'react';

interface PDFReaderProps {
  file: File;
  onTextExtracted: (text: string) => void;
  onError?: (message: string) => void;
  onProgress?: (page: number, totalPages: number) => void;
}

const PDFReader: FC<PDFReaderProps> = ({
  file,
  onTextExtracted,
  onError,
  onProgress
}) => {
  useEffect(() => {
    if (file) {
      extractPDFText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const extractPDFText = async () => {
    let pdf: any = null;
    
    try {
      console.log('📄 Starting PDF text extraction...');
      
      // Lazy-load pdf.js only when a PDF is actually uploaded — keeps ~350KB
      // out of the initial bundle so first paint stays fast (esp. on iOS).
      // Vite bundles the worker locally so extraction works offline.
      const [pdfjsLib, { default: pdfWorkerUrl }] = await Promise.all([
        import('pdfjs-dist'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ]);
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      } catch {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
      }

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
            // Preserve page boundaries as paragraph breaks so the reader view
            // can split into multiple virtual rows (prevents single-line clipping).
            allText += pageText + '\n\n';
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
        // Clean up the final text for TTS (preserve paragraph breaks).
        const finalText = allText
          .replace(/[ \t]+/g, ' ') // Normalize horizontal whitespace, keep \n
          .replace(/[ \t]*\n[ \t]*/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/([.!?])\s*([A-Z])/g, '$1 $2') // Ensure proper sentence spacing
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
      const message = error instanceof Error ? error.message : 'Unable to extract text from this PDF.';
      onError?.(message);
      onTextExtracted(''); // Keep legacy contract; caller shows error via onError/toast
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