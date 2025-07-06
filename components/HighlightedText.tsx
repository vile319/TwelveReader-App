import React, { useMemo } from 'react';

interface HighlightedTextProps {
  text: string;
  wordTimings: Array<{word: string, start: number, end: number}>;
  currentWordIndex: number;
  style?: React.CSSProperties;
  onWordClick?: (time: number) => void;
}

const HighlightedText: React.FC<HighlightedTextProps> = React.memo(({
  text,
  wordTimings,
  currentWordIndex,
  style,
  onWordClick
}) => {
  // Debug logging
  console.log('📝 HighlightedText render:', {
    textLength: text.length,
    wordTimingsLength: wordTimings.length,
    currentWordIndex
  });

  // Memoize the splitting to preserve formatting. This regex splits the text by whitespace,
  // but keeps the whitespace delimiters in the resulting array.
  const parts = useMemo(() => {
    return text.split(/(\s+)/);
  }, [text]);

  const highlightedContent = useMemo(() => {
    let wordIndex = 0;
    return parts.map((part, i) => {
      // Whitespace parts are returned as-is to preserve formatting.
      if (part.trim() === '') {
        return <React.Fragment key={i}>{part}</React.Fragment>;
      }

      // It's a word, so apply highlighting logic.
      const isCurrentWord = wordTimings.length > 0 && wordIndex === currentWordIndex;
      const isPastWord = wordTimings.length > 0 && wordIndex < currentWordIndex;
      const currentWordTiming = wordTimings[wordIndex];
      const canClick = onWordClick && currentWordTiming;

      const span = (
        <span
          key={i}
          onClick={() => canClick && onWordClick(currentWordTiming.start)}
          style={{
            backgroundColor: isCurrentWord ? 'rgba(74, 144, 226, 0.5)' : isPastWord ? 'rgba(144, 238, 144, 0.15)' : 'transparent',
            color: isCurrentWord ? 'white' : isPastWord ? '#90ee90' : '#e5e5e5',
            padding: '2px 1px',
            borderRadius: '4px',
            transition: 'background-color 0.1s ease, color 0.1s ease',
            fontWeight: isCurrentWord ? '600' : 'normal',
            cursor: canClick ? 'pointer' : 'default',
          }}
        >
          {part}
        </span>
      );

      wordIndex++;
      return span;
    });
  }, [parts, currentWordIndex, wordTimings, onWordClick]);

  // Use highlighted content if timings are available, otherwise plain text.
  const content = wordTimings.length > 0 ? highlightedContent : text;

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
      whiteSpace: 'pre-wrap', // Always preserve whitespace to maintain original formatting.
      overflowY: 'auto',
      wordBreak: 'break-word',
      ...style
    }}>
      {content}
    </div>
  );
});

// Add display name for debugging
HighlightedText.displayName = 'HighlightedText';

export default HighlightedText; 