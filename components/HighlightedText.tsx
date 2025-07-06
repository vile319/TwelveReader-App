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

  // Memoize the highlighted words (even if no timings) to keep hooks consistent
  const highlightedWords = useMemo(() => {
    return words.map((word, index) => {
      const isCurrentWord = wordTimings.length > 0 && index === currentWordIndex;
      const isPastWord = wordTimings.length > 0 && index < currentWordIndex;
      return (
        <span
          key={index}
          style={{
            backgroundColor: isCurrentWord ? '#4a90e2' : isPastWord ? '#2d4a22' : 'transparent',
            color: isCurrentWord ? 'white' : isPastWord ? '#90ee90' : '#e5e5e5',
            padding: '2px 4px',
            borderRadius: '4px',
            margin: '0 2px',
            transition: 'background-color 0.1s ease, color 0.1s ease',
            fontWeight: isCurrentWord ? '600' : 'normal'
          }}
        >
          {word}
        </span>
      );
    });
  }, [words, currentWordIndex, wordTimings.length]);

  // Decide output
  const content = wordTimings.length === 0 ? text : highlightedWords;

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
      whiteSpace: wordTimings.length === 0 ? 'pre-wrap' : undefined,
      ...style
    }}>
      {content}
    </div>
  );
});

// Add display name for debugging
HighlightedText.displayName = 'HighlightedText';

export default HighlightedText; 