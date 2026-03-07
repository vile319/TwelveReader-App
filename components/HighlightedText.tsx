import { type FC, useMemo, memo, Fragment, useRef } from 'react';
import { FixedSizeList, type ListChildComponentProps } from 'react-window';
import React from 'react';

interface HighlightedTextProps {
  text: string;
  wordTimings: Array<{ word: string, start: number, end: number }>;
  currentWordIndex: number;
  style?: React.CSSProperties;
  onWordClick?: (time: number) => void;
}

interface LineProps extends ListChildComponentProps {
  textLines: string[];
  lineWordRanges: Array<{ startWord: number, wordCount: number }>;
  currentWordIndex: number;
  wordTimings: Array<{ word: string, start: number, end: number }>;
  onWordClick?: (time: number) => void;
}

const RenderLine = memo(({ index, style: rowStyle, data }: ListChildComponentProps) => {
  const { textLines, lineWordRanges, currentWordIndex, wordTimings, onWordClick } = data as LineProps;
  const line = textLines[index];
  if (!line) return null;

  const range = lineWordRanges[index];
  if (!range) return <div style={rowStyle} className="text-slate-300 font-serif text-xl md:text-2xl leading-relaxed py-2 md:py-3">{line}</div>;

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

    elements.push(
      <span
        key={i}
        onClick={() => timing && onWordClick?.(timing.start)}
        className={`transition-colors duration-200 ${isCurrent
            ? 'text-indigo-400 bg-indigo-500/10 rounded-sm'
            : isPast
              ? 'text-slate-500'
              : 'text-slate-200 hover:text-indigo-300 cursor-pointer'
          }`}
      >
        {part}
      </span>
    );
    localWordIndex++;
  });

  return (
    <div style={{
      ...rowStyle,
      padding: '0 24px'
    }} className="font-serif text-xl md:text-2xl leading-relaxed py-2 md:py-3 tracking-wide flex flex-wrap">
      {elements}
    </div>
  );
});

RenderLine.displayName = 'RenderLine';

const HighlightedText: FC<HighlightedTextProps> = memo((props) => {
  const textLines = useMemo(() => props.text.split('\n'), [props.text]);
  const listRef = useRef<FixedSizeList>(null);

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
            <div style={{
              ...style,
              padding: '0 24px'
            }} className="text-slate-300 font-serif text-xl md:text-2xl leading-relaxed py-2 md:py-3 tracking-wide">
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

HighlightedText.displayName = 'HighlightedText';

export default HighlightedText; 