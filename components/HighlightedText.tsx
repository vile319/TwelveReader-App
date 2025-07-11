import { type FC, useMemo, memo, Fragment, useRef } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import React from 'react'; // Needed for JSX when linter requires React in scope

interface HighlightedTextProps {
  text: string;
  wordTimings: Array<{word: string, start: number, end: number}>;
  currentWordIndex: number;
  style?: React.CSSProperties;
  onWordClick?: (time: number) => void;
}

interface LineProps extends ListChildComponentProps {
  textLines: string[];
  lineWordRanges: Array<{startWord: number, wordCount: number}>;
  currentWordIndex: number;
  wordTimings: Array<{word: string, start: number, end: number}>;
  onWordClick?: (time: number) => void;
}

const RenderLine = memo(({ index, style: rowStyle, data }: ListChildComponentProps) => {
  const { textLines, lineWordRanges, currentWordIndex, wordTimings, onWordClick } = data as LineProps;
  const line = textLines[index];
  if (!line) return null;

  const range = lineWordRanges[index];
  if (!range) return <div style={rowStyle}>{line}</div>;

  const parts = line.split(/(\s+)/);
  const elements: React.ReactNode[] = [];
  let localWordIndex = 0;

  parts.forEach((part, i) => {
    if (part.trim() === '') {
      elements.push(<Fragment key={i}>{part}</Fragment>);
      return;
    }

    const globalWordIndex = range.startWord + localWordIndex;
    const isCurrent = globalWordIndex === currentWordIndex;
    const timing = wordTimings[globalWordIndex];

    elements.push(
      <span
        key={i}
        onClick={() => timing && onWordClick?.(timing.start)}
        style={{
          backgroundColor: isCurrent ? 'rgba(74, 144, 226, 0.5)' : 'transparent',
          cursor: timing && onWordClick ? 'pointer' : 'default',
        }}
      >
        {part}
      </span>
    );
    localWordIndex++;
  });

  return (
    <div style={{
      ...rowStyle,
      color: '#e5e5e5',
      fontSize: '16px',
      lineHeight: '1.6',
      fontFamily: 'inherit',
      padding: '0 16px'
    }}>
      {elements}
    </div>
  );
});

RenderLine.displayName = 'RenderLine';

const HighlightedText: FC<HighlightedTextProps> = memo((props) => {
  // Debug logging
  console.log('📝 HighlightedText render:', {
    textLength: props.text.length,
    wordTimingsLength: props.wordTimings.length,
    currentWordIndex: props.currentWordIndex
  });

  // Split text into lines for virtualization
  const textLines = useMemo(() => props.text.split('\n'), [props.text]);
  const listRef = useRef<FixedSizeList>(null);

  const lineWordRanges = useMemo(() => {
    const ranges: Array<{startWord: number, wordCount: number}> = [];
    let wordIdx = 0;
    textLines.forEach(line => {
      const wordCount = line.split(/\s+/).filter(w => w.trim()).length;
      ranges.push({startWord: wordIdx, wordCount});
      wordIdx += wordCount;
    });
    return ranges;
  }, [textLines]);

  // For no timings, virtualize plain lines
  if (props.wordTimings.length === 0) {
    return (
      <div style={{
        backgroundColor: '#0f1419',
        border: '1px solid #2d3748',
        borderRadius: '8px',
        ...props.style
      }}>
        <FixedSizeList
          height={400} // Adjust to container height
          itemCount={textLines.length}
          itemSize={24} // Approximate line height
          width='100%'
          ref={listRef}
        >
          {({ index, style }) => (
            <div style={{
              ...style,
              color: '#e5e5e5',
              fontSize: '16px',
              lineHeight: '1.6',
              fontFamily: 'inherit',
              padding: '0 16px'
            }}>
              {textLines[index]}
            </div>
          )}
        </FixedSizeList>
      </div>
    );
  }

  // For highlighted, pass data to RenderLine
  return (
    <div style={{
      backgroundColor: '#0f1419',
      border: '1px solid #2d3748',
      borderRadius: '8px',
      ...props.style
    }}>
      <FixedSizeList
        height={400}
        itemCount={textLines.length}
        itemSize={24}
        width='100%'
        itemData={{ 
          textLines, 
          lineWordRanges, 
          currentWordIndex: props.currentWordIndex, 
          wordTimings: props.wordTimings, 
          onWordClick: props.onWordClick 
        }}
        ref={listRef}
      >
        {RenderLine}
      </FixedSizeList>
    </div>
  );
});

// Add display name for debugging
HighlightedText.displayName = 'HighlightedText';

export default HighlightedText; 