import React, { useMemo } from 'react';

interface HighlightedTextProps {
  text: string;
  wordTimings: Array<{word: string, start: number, end: number}>;
  currentWordIndex: number;
  style?: React.CSSProperties;
}

const HighlightedText: React.FC<HighlightedTextProps> = React.memo(({ 
  text, 
  wordTimings, 
  currentWordIndex, 
  style 
}) => {
  // Debug logging
  console.log('📝 HighlightedText render:', {
    textLength: text.length,
    wordTimingsLength: wordTimings.length,
    currentWordIndex,
    firstFewWords: text.split(/\s+/).slice(0, 3)
  });

  // Memoize the words splitting to avoid recalculating on every render
  const words = useMemo(() => {
    return text.split(/\s+/).filter(word => word.length > 0);
  }, [text]);

  // If no word timings, just display the text normally
  if (wordTimings.length === 0) {
    console.log('📝 No word timings, displaying plain text');
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#0f1419',
        border: '1px solid #2d3748',
        borderRadius: '8px',
        color: '#e5e5e5',
        fontSize: '16px',
        fontFamily: 'inherit',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap',
        ...style
      }}>
        {text}
      </div>
    );
  }

  console.log('📝 Rendering highlighted text with', words.length, 'words, current index:', currentWordIndex);
  
  // Debug: Check if word counts match
  if (words.length !== wordTimings.length) {
    console.warn(`📝 Word count mismatch! Text has ${words.length} words, timings have ${wordTimings.length}`);
    console.log('📝 Text words:', words.slice(0, 10));
    console.log('📝 Timing words:', wordTimings.slice(0, 10).map(t => t.word));
  }

  // Memoize the highlighted words to prevent unnecessary re-renders
  const highlightedWords = useMemo(() => {
    return words.map((word, index) => {
      const isCurrentWord = index === currentWordIndex;
      const isPastWord = index < currentWordIndex;
      
      return (
        <span
          key={index}
          style={{
            backgroundColor: isCurrentWord ? '#4a90e2' : isPastWord ? '#2d4a22' : 'transparent',
            color: isCurrentWord ? 'white' : isPastWord ? '#90ee90' : '#e5e5e5',
            padding: '2px 4px',
            borderRadius: '4px',
            margin: '0 2px',
            transition: 'background-color 0.1s ease, color 0.1s ease', // Faster transitions
            fontWeight: isCurrentWord ? '600' : 'normal',
            // Remove animation to reduce lag
          }}
        >
          {word}
        </span>
      );
    });
  }, [words, currentWordIndex]);
  
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#0f1419',
      border: '1px solid #2d3748',
      borderRadius: '8px',
      color: '#e5e5e5',
      fontSize: '16px',
      fontFamily: 'inherit',
      lineHeight: '1.6',
      ...style
    }}>
      {highlightedWords}
    </div>
  );
});

// Add display name for debugging
HighlightedText.displayName = 'HighlightedText';

export default HighlightedText; 