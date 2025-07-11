import { type FC, useMemo, memo, Fragment } from 'react';
import React from 'react'; // Needed for JSX when linter requires React in scope

interface HighlightedTextProps {
  text: string;
  wordTimings: Array<{word: string, start: number, end: number}>;
  currentWordIndex: number;
  style?: React.CSSProperties;
  onWordClick?: (time: number) => void;
}

const HighlightedText: FC<HighlightedTextProps> = memo(({
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

  // Compute word positions once
  const wordPositions = useMemo(() => {
    const positions: {start: number, end: number}[] = [];
    let i = 0;
    while (i < text.length) {
      // Skip whitespace
      while (i < text.length && /\s/.test(text[i])) i++;
      const start = i;
      // Take word
      while (i < text.length && !/\s/.test(text[i])) i++;
      if (start < i) {
        positions.push({start, end: i});
      }
    }
    return positions;
  }, [text]);

  // Fast path: if no timings, render plain text immediately to avoid
  // splitting the entire document into thousands of <span> nodes.
  if (wordTimings.length === 0) {
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
        overflowY: 'auto',
        wordBreak: 'break-word',
        ...style,
      }}>
        {text}
      </div>
    );
  }

  // Helper to create a span for a word
  const createSpan = (part: string, idx: number, wordIndex: number) => {
    const isCurrentWord = wordTimings.length > 0 && wordIndex === currentWordIndex;
    const isPastWord = wordTimings.length > 0 && wordIndex < currentWordIndex;
    const currentWordTiming = wordTimings[wordIndex];
    const canClick = onWordClick && currentWordTiming;

    return (
      <span
        key={idx}
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
  };

  const highlightedContent = useMemo(() => {
    // If text is small, render everything (fast enough).
    const LARGE_THRESHOLD = 5000; // number of words

    // Fast path for short text
    if (wordPositions.length <= LARGE_THRESHOLD) {
      const parts = text.split(/(\s+)/);
      let wordIndex = 0;
      return parts.map((part, i) => {
        if (part.trim() === '') return <Fragment key={i}>{part}</Fragment>;
        const span = createSpan(part, i, wordIndex);
        wordIndex++;
        return span;
      });
    }

    // For large texts, only render a sliding window of words around the current index.
    const WINDOW_SIZE = 800; // words before/after current word
    const windowStart = Math.max(0, currentWordIndex - WINDOW_SIZE);
    const windowEnd = Math.min(wordPositions.length - 1, currentWordIndex + WINDOW_SIZE);

    const startChar = wordPositions[windowStart].start;
    const endChar = wordPositions[windowEnd].end;
    const windowText = text.slice(startChar, endChar);

    const localParts = windowText.split(/(\s+)/);

    const elements: React.ReactNode[] = [];

    if (windowStart > 0) {
      elements.push(
        <span key="ellipsis-start" style={{ color: '#888' }}>
          …
        </span>
      );
    }

    let localWordIndex = 0;
    localParts.forEach((part, i) => {
      if (part.trim() === '') {
        elements.push(<Fragment key={i}>{part}</Fragment>);
        return;
      }
      const globalWordIndex = windowStart + localWordIndex;
      elements.push(createSpan(part, i, globalWordIndex));
      localWordIndex++;
    });

    if (windowEnd < wordPositions.length - 1) {
      elements.push(
        <span key="ellipsis-end" style={{ color: '#888' }}>
          …
        </span>
      );
    }

    return elements;
  }, [text, wordPositions, currentWordIndex, wordTimings, onWordClick]);

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