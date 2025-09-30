import React, { type FC, type ChangeEvent, useRef, useEffect } from 'react';
import { useAppContext, sampleTexts } from '../../contexts/AppContext';
import HighlightedText from '../HighlightedText';
import PDFReader from '../PDFReader';
import { cn } from '../../utils/cn';
import { TextSet } from '../../types';

const TextInputPanel: FC = () => {
  const { state, actions } = useAppContext();

  const contentRef = useRef<HTMLDivElement>(null);

  // Restore scroll on load of set
  useEffect(() => {
    if (!contentRef.current) return;
    const setId = state.currentSetId;
    if (!setId) return;
    const prog = state.readingProgress[setId];
    if (prog && typeof prog.scrollTop === 'number') {
      contentRef.current.scrollTop = prog.scrollTop;
    }
  }, [state.currentSetId]);

  const renderContent = () => {
    return (
      <div
        ref={contentRef}
        onScroll={(e: React.UIEvent<HTMLDivElement>) => actions.updateScrollPosition((e.currentTarget).scrollTop)}
        className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl p-5 min-h-[200px] overflow-auto shadow-inner"
      >
        {state.inputText.length > 0 ? (
          <HighlightedText
            text={state.inputText}
            wordTimings={state.audio.wordTimings}
            currentWordIndex={state.audio.currentWordIndex}
            onWordClick={actions.handleWordClick}
            style={{ overflowY: 'visible' }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-slate-500 text-sm py-10">
            <div className="text-3xl mb-4">📝</div>
            <p className="mb-1">Enter text above or upload a PDF to get started</p>
            <p className="text-xs text-slate-600">Your text will appear here with synchronized highlighting during playback</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-slate-800/50 rounded-2xl p-6 flex-1 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200 m-0">Text Input</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <span>{state.inputText.length.toLocaleString()} characters</span>
            {state.inputText.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-[#ff8500]/20 text-[#ff8500] font-medium">Ready</span>
            )}
          </div>
          {/* Save Button */}
          {state.inputText.trim().length > 0 && (
            <button
              onClick={() => actions.saveCurrentTextSet()}
              title="Save this text for later"
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs font-semibold hover:shadow-lg hover:scale-105 transition-all"
            >
              💾 Save
            </button>
          )}
        </div>
      </div>

      {/* Text Input Area */}
      <textarea
        value={state.inputText}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => actions.setInputText(e.target.value)}
        placeholder="Enter or paste text here..."
        className={cn(
          'w-full min-h-[120px] resize-y rounded-xl border border-slate-700/50 bg-slate-800/80 p-3 mb-4',
          'text-sm text-slate-200 placeholder-slate-500 font-sans',
          'focus:outline-none focus:ring-2 focus:ring-[#ff8500] shadow-sm'
        )}
      />

      {/* Generate / Stop Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => {
            if (state.isReading) {
              actions.handleStopReading();
            } else {
              actions.handleStartReading();
            }
          }}
          disabled={!state.inputText.trim() || state.audio.isLoading}
          className={cn(
            'px-8 py-3 rounded-xl font-semibold text-white transition-all shadow-lg',
            state.isReading ? 'bg-gradient-to-r from-red-600 to-red-700 hover:shadow-red-500/50' : 'bg-gradient-to-r from-[#ff8500] to-[#ea580c] hover:shadow-[#ff8500]/50 hover:scale-105',
            (!state.inputText.trim() || state.audio.isLoading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {state.audio.isLoading ? '⏳ Loading Model...' :
           state.isReading ? `⏹️ Stop (${state.generationProgress}%)` :
           state.audio.canScrub ? '🔄 Regenerate' :
           '▶️ Generate Audio'}
        </button>
      </div>
      
      {/* Content Display */}
      {renderContent()}
      
      {/* Sample Texts */}
      <div className="mt-4">
        <div className="text-sm font-semibold text-slate-200 mb-3">📚 Sample Texts</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
          {sampleTexts.map((sample, index) => (
            <button
              key={index}
              onClick={() => actions.setInputText(sample.text)}
              className="text-left text-xs font-medium px-3 py-2 rounded-lg border border-slate-700/50 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:border-[#ff8500]/50 transition-all hover:-translate-y-0.5"
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Texts */}
      {state.savedTextSets.length > 0 && (
        <div className="mt-6">
          <div className="text-sm font-semibold text-slate-200 mb-3">💾 Your Saved Texts</div>
          <div className="flex flex-col gap-2">
            {state.savedTextSets.map((set: TextSet) => (
              <div key={set.id} className="flex items-center justify-between bg-slate-800/80 border border-slate-700/50 rounded-lg p-2 text-xs hover:border-[#ff8500]/50 transition-colors">
                <button
                  onClick={() => actions.loadTextSet(set.id)}
                  className="text-left flex-1 truncate hover:text-[#ff8500] flex items-center gap-2 transition-colors"
                >
                  {/* Indicator for audio availability */}
                  {set.audioGenerated ? (
                    <span title="Audio generated" className="text-emerald-400">🔊</span>
                  ) : (
                    <span title="No audio yet" className="text-slate-500">📝</span>
                  )}
                  {set.title}
                </button>
                <button
                  onClick={() => actions.deleteTextSet(set.id)}
                  title="Delete"
                  className="text-red-500 px-2 py-0.5 hover:text-red-600"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Reading Indicator */}
      {state.currentSentence && (
        <div className="mt-4 bg-[#ff8500]/10 border border-[#ff8500]/30 rounded-xl p-4">
          <div className="text-xs text-[#ff8500] font-semibold mb-2">🎧 Currently Reading:</div>
          <div className="text-sm italic text-slate-200 leading-relaxed">
            {state.currentSentence.length > 200 ? state.currentSentence.substring(0, 200) + '…' : state.currentSentence}
          </div>
        </div>
      )}

      {/* Hidden PDF Reader for extraction */}
      {state.uploadedPDF && (
        <div className="hidden">
          <PDFReader
            file={state.uploadedPDF}
            onTextExtracted={actions.handlePDFTextExtracted}
            currentSentence={state.currentSentence}
            wordTimings={state.audio.wordTimings}
            currentWordIndex={state.audio.currentWordIndex}
          />
        </div>
      )}
    </div>
  );
};

export default TextInputPanel;