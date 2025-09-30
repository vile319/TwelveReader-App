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
        className="flex-1 bg-slate-800/50 backdrop-blur-sm border-2 border-slate-700/50 rounded-2xl p-6 min-h-[200px] overflow-auto shadow-inner"
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
          <div className="flex flex-col items-center justify-center text-center text-slate-400 text-sm py-16">
            <div className="text-6xl mb-6 opacity-50">📝</div>
            <p className="text-lg font-semibold mb-2 text-slate-300">No text yet</p>
            <p className="text-xs text-slate-500 max-w-md">Enter text in the field above, upload a PDF document, or select a sample text to get started</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-xl border-2 border-slate-700/50 rounded-3xl p-8 flex-1 shadow-2xl shadow-violet-500/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent m-0">
          Text Input
        </h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-400 flex items-center gap-3">
            <span className="font-semibold">{state.inputText.length.toLocaleString()} characters</span>
            {state.inputText.length > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wide border border-emerald-500/30">
                Ready
              </span>
            )}
          </div>
          {/* Save Button */}
          {state.inputText.trim().length > 0 && (
            <button
              onClick={() => actions.saveCurrentTextSet()}
              title="Save this text for later"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold uppercase tracking-wide hover:from-emerald-500 hover:to-teal-500 hover:scale-105 transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 border border-emerald-400/30"
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
        placeholder="Enter or paste your text here to convert it to speech..."
        className={cn(
          'w-full min-h-[140px] resize-y rounded-2xl border-2 border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-5 mb-6',
          'text-sm text-slate-100 placeholder-slate-500 font-sans leading-relaxed',
          'focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-lg'
        )}
      />

      {/* Generate / Stop Button */}
      <div className="flex justify-center mb-6">
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
            'px-12 py-4 rounded-2xl font-bold text-white text-base uppercase tracking-wide transition-all shadow-2xl border-2',
            state.isReading 
              ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border-red-400/30 shadow-red-500/40 hover:shadow-red-500/60' 
              : 'bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 hover:from-violet-500 hover:via-purple-500 hover:to-violet-600 border-violet-400/30 shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-105',
            (!state.inputText.trim() || state.audio.isLoading) && 'opacity-50 cursor-not-allowed hover:scale-100'
          )}
        >
          {state.audio.isLoading ? (
            <span className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Loading Model...
            </span>
          ) :
           state.isReading ? (
            <span className="flex items-center gap-3">
              ⏹️ Stop ({state.generationProgress}%)
            </span>
           ) :
           state.audio.canScrub ? (
            <span className="flex items-center gap-3">
              🔄 Regenerate Audio
            </span>
           ) : (
            <span className="flex items-center gap-3">
              ▶️ Generate Audio
            </span>
           )}
        </button>
      </div>
      
      {/* Content Display */}
      {renderContent()}
      
      {/* Sample Texts */}
      <div className="mt-8">
        <div className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wide flex items-center gap-2">
          <span className="text-lg">📚</span>
          Sample Texts
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
          {sampleTexts.map((sample, index) => (
            <button
              key={index}
              onClick={() => actions.setInputText(sample.text)}
              className="text-left text-sm font-semibold px-5 py-3 rounded-xl border-2 border-slate-700/50 bg-slate-800/50 backdrop-blur-sm text-slate-200 hover:bg-slate-700/50 hover:border-violet-500/50 hover:text-violet-300 transition-all hover:scale-105 hover:shadow-lg hover:shadow-violet-500/20"
            >
              {sample.title}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Texts */}
      {state.savedTextSets.length > 0 && (
        <div className="mt-8">
          <div className="text-sm font-bold text-slate-200 mb-4 uppercase tracking-wide flex items-center gap-2">
            <span className="text-lg">💾</span>
            Your Saved Texts
          </div>
          <div className="flex flex-col gap-3">
            {state.savedTextSets.map((set: TextSet) => (
              <div key={set.id} className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-4 text-sm hover:border-violet-500/50 hover:bg-slate-700/50 transition-all group">
                <button
                  onClick={() => actions.loadTextSet(set.id)}
                  className="text-left flex-1 truncate hover:text-violet-300 flex items-center gap-3 transition-colors font-medium"
                >
                  {/* Indicator for audio availability */}
                  {set.audioGenerated ? (
                    <span title="Audio generated" className="text-emerald-400 text-lg">🔊</span>
                  ) : (
                    <span title="No audio yet" className="text-slate-500 text-lg">📝</span>
                  )}
                  <span className="group-hover:text-violet-300 transition-colors">{set.title}</span>
                </button>
                <button
                  onClick={() => actions.deleteTextSet(set.id)}
                  title="Delete"
                  className="text-red-400 px-3 py-2 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
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
        <div className="mt-8 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-violet-500/10 border-2 border-violet-500/30 rounded-2xl p-6 shadow-xl shadow-violet-500/10">
          <div className="text-xs text-violet-400 font-bold mb-3 uppercase tracking-wide flex items-center gap-2">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            Currently Reading:
          </div>
          <div className="text-sm italic text-slate-200 leading-relaxed font-medium">
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
