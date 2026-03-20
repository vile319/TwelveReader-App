import { type FC, useMemo, memo, Fragment, useRef, useEffect } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import React from 'react';

interface HighlightedTextProps {
  text: string;
  wordTimings: Array<{ word: string, start: number, end: number }>;
  currentWordIndex: number;
  style?: React.CSSProperties;
  onWordClick?: (time: number) => void;
}

// Passed through itemData — kept stable by the parent with useMemo so
// react-window only re-renders lines that actually changed.
interface LineData {
  textLines: string[];
  lineWordRanges: Array<{ startWord: number, wordCount: number }>;
  currentWordIndex: number;
  wordTimings: Array<{ word: string, start: number, end: number }>;
  onWordClick?: (time: number) => void;
}

// Inline styles instead of Tailwind transition classes — avoids the
// browser re-computing CSS transitions on every rAF tick for thousands of spans.
const wordStyleCurrent: React.CSSProperties = {
  color: '#818cf8',       // indigo-400
  backgroundColor: 'rgba(99, 102, 241, 0.10)',
  borderRadius: '2px',
};
const wordStylePast: React.CSSProperties = {
  color: '#64748b',       // slate-500
};
const wordStyleFuture: React.CSSProperties = {
  color: '#e2e8f0',       // slate-200
  cursor: 'pointer',
};

const RenderLine = memo(({ index, style: rowStyle, data }: ListChildComponentProps) => {
  const { textLines, lineWordRanges, currentWordIndex, wordTimings, onWordClick } = data as LineData;
  const line = textLines[index];
  if (!line) return null;

  const range = lineWordRanges[index];
  if (!range) {
    return (
      <div style={{ ...rowStyle, padding: '0 24px' }}
        className="text-slate-300 font-serif text-xl md:text-2xl leading-relaxed py-2 md:py-3 tracking-wide">
        {line}
      </div>
    );
  }

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
    const isPast = globalWordIndex < currentWordIndex;
    const timing = wordTimings[globalWordIndex];

    // Use inline style objects (no CSS transitions) — swapping styles is
    // much cheaper than triggering the browser's transition machinery each frame.
    elements.push(
      <span
        key={i}
        onClick={() => timing && onWordClick?.(timing.start)}
        style={isCurrent ? wordStyleCurrent : isPast ? wordStylePast : wordStyleFuture}
      >
        {part}
      </span>
    );
    localWordIndex++;
  });

  return (
    <div style={{ ...rowStyle, padding: '0 24px' }}
      className="font-serif text-xl md:text-2xl leading-relaxed py-2 md:py-3 tracking-wide whitespace-pre-wrap">
      {elements}
    </div>
  );
});

RenderLine.displayName = 'RenderLine';

const HighlightedText: FC<HighlightedTextProps> = memo((props) => {
  const textLines = useMemo(() => props.text.split('\n'), [props.text]);
  const listRef = useRef<FixedSizeList>(null);

  // lineWordRanges[i] = { startWord, wordCount } for line i
  const lineWordRanges = useMemo(() => {
    const ranges: Array<{ startWord: number, wordCount: number }> = [];
    let wordIdx = 0;
    textLines.forEach(line => {
      const wordCount = line.split(/\s+/).filter(w => w.trim()).length;
      ranges.push({ startWord: wordIdx, wordCount });
      wordIdx += wordCount;
    });
    return ranges;
  }, [textLines]);

  // Precomputed reverse map: wordIndex -> lineIndex, built once per text.
  // Allows O(1) lookup of which line a word belongs to.
  const wordToLineIndex = useMemo(() => {
    const map = new Int32Array(
      Math.max(0, lineWordRanges.reduce((acc, r) => acc + r.wordCount, 0))
    );
    lineWordRanges.forEach((r, lineIdx) => {
      for (let w = 0; w < r.wordCount; w++) {
        map[r.startWord + w] = lineIdx;
      }
    });
    return map;
  }, [lineWordRanges]);

  // Auto-scroll the virtual list so the current word stays visible.
  // We use "smart" mode so react-window does nothing when the item is already in view.
  useEffect(() => {
    const lineIdx = wordToLineIndex[props.currentWordIndex];
    if (lineIdx != null && lineIdx >= 0 && listRef.current) {
      listRef.current.scrollToItem(lineIdx, 'smart');
    }
  }, [props.currentWordIndex, wordToLineIndex]);

  // Stable itemData reference: only rebuild when the underlying data changes,
  // not on every parent re-render. This prevents react-window from re-rendering
  // every visible row on every rAF tick during playback.
  const itemData = useMemo<LineData>(() => ({
    textLines,
    lineWordRanges,
    currentWordIndex: props.currentWordIndex,
    wordTimings: props.wordTimings,
    onWordClick: props.onWordClick,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [textLines, lineWordRanges, props.currentWordIndex, props.wordTimings, props.onWordClick]);

  if (props.wordTimings.length === 0) {
    return (
      <div className="w-full relative fade-edges" style={props.style}>
        <FixedSizeList
          height={500}
          itemCount={textLines.length}
          itemSize={60}
          width='100%'
          ref={listRef}
        >
          {({ index, style }) => (
            <div style={{ ...style, padding: '0 24px' }}
              className="text-slate-300 font-serif text-xl md:text-2xl leading-relaxed py-2 md:py-3 tracking-wide">
              {textLines[index]}
            </div>
          )}
        </FixedSizeList>
      </div>
    );
  }

  return (
    <div className="w-full relative fade-edges" style={props.style}>
      <FixedSizeList
        height={500}
        itemCount={textLines.length}
        itemSize={60}
        width='100%'
        itemData={itemData}
        ref={listRef}
      >
        {RenderLine}
      </FixedSizeList>
    </div>
  );
});

HighlightedText.displayName = 'HighlightedText';

export default HighlightedText;