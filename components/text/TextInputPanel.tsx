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
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-5 min-h-[200px] overflow-auto"
      >
        {state.inputText.length > 0 ? (
          <HighlightedText 
            text={state.inputText} 
            wordTimings={state.audio.wordTimings}
            currentWordIndex={state.audio.currentWordIndex}
            onWordClick={actions.handleWordClick}
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
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-200 m-0">Text Input</h2>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-400 flex items-center gap-2">
            <span>{state.inputText.length.toLocaleString()} characters</span>
            {state.inputText.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">Ready</span>
            )}
          </div>
          {/* Save Button */}
          {state.inputText.trim().length > 0 && (
            <button
              onClick={() => actions.saveCurrentTextSet()}
              title="Save this text for later"
              className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
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
        placeholder="Enter text here or upload a PDF file..."
        className={cn(
          'w-full min-h-[120px] resize-y rounded-lg border border-slate-700 bg-slate-800 p-3 mb-4',
          'text-sm text-slate-200 placeholder-slate-500 font-sans',
          'focus:outline-none focus:ring-2 focus:ring-blue-500'
        )}
      />

      {/* Generate Button */}
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
            'px-8 py-3 rounded-lg font-semibold text-white transition-colors',
            state.isReading ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-600',
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
              className="text-left text-xs font-medium px-3 py-2 rounded-md border border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 transition-transform hover:-translate-y-0.5"
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
              <div key={set.id} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-md p-2 text-xs">
                <button
                  onClick={() => actions.loadTextSet(set.id)}
                  className="text-left flex-1 truncate hover:text-blue-400 flex items-center gap-2"
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
        <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="text-xs text-blue-400 font-semibold mb-2">🎧 Currently Reading:</div>
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