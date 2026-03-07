import React, { type FC, type ChangeEvent, useRef, useEffect, useState } from 'react';
import { useAppContext, sampleTexts } from '../../contexts/AppContext';
import HighlightedText from '../HighlightedText';
import PDFReader from '../PDFReader';
import { cn } from '../../utils/cn';
import { TextSet } from '../../types';

const TextInputPanel: FC = () => {
  const { state, actions } = useAppContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const [showLibrary, setShowLibrary] = useState(false);

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
        className="flex-1 w-full flex flex-col min-h-[40vh]"
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
          <div className="flex flex-col items-center justify-center text-center text-slate-500 text-sm py-20 opacity-60">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-lg font-light mb-1">Your reading canvas is empty</p>
            <p className="text-sm">Type, paste, or upload a document to begin.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-3xl mx-auto pt-8 pb-32">

      {/* Top Header / Actions */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {state.isReading ? (
            <button
              onClick={actions.handleStopReading}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-indigo-300 transition-colors bg-slate-900/50 hover:bg-slate-800 px-4 py-2 rounded-full border border-slate-800 hover:border-indigo-500/30 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Back to Editing
            </button>
          ) : (
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              {showLibrary ? 'Hide Library' : 'Library'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 tracking-wider uppercase font-medium">
            {state.inputText.length.toLocaleString()} chars
          </span>
          {state.inputText.trim().length > 0 && (
            <button
              onClick={() => actions.saveCurrentTextSet()}
              className="text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors"
              title="Save to Library"
            >
              Save Text
            </button>
          )}
        </div>
      </div>

      {/* Library Drawer (Samples & Saved) */}
      {showLibrary && (
        <div className="mb-8 p-6 rounded-2xl bg-slate-900/40 border border-slate-800 animate-in slide-in-from-top-2 fade-in">
          {/* Sample Texts */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Templates</h3>
            <div className="flex flex-wrap gap-2">
              {sampleTexts.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => { actions.setInputText(sample.text); setShowLibrary(false); }}
                  className="text-sm px-4 py-2 rounded-lg bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700/50"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          {/* Saved Texts */}
          {state.savedTextSets.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Saved</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {state.savedTextSets.map((set: TextSet) => (
                  <div key={set.id} className="group relative flex items-center justify-between bg-slate-800/50 hover:bg-slate-700/50 border border-slate-800 hover:border-slate-600 rounded-xl p-3 transition-all cursor-pointer" onClick={() => { actions.loadTextSet(set.id); setShowLibrary(false); }}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={cn("w-2 h-2 rounded-full flex-shrink-0", set.audioGenerated ? "bg-emerald-500" : "bg-slate-600")} />
                      <span className="text-sm text-slate-200 truncate pr-8">{set.title}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); actions.deleteTextSet(set.id); }}
                      className="absolute right-3 opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Reading / Input Area */}
      {!state.isReading && (
        <textarea
          value={state.inputText}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => actions.setInputText(e.target.value)}
          placeholder="Start typing your story here..."
          className="prose-editor w-full min-h-[300px] resize-y bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 md:p-8 mb-8 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none shadow-inner text-lg leading-relaxed text-slate-200 transition-colors"
        />
      )}

      {/* Content Display (Highlighted text during reading) */}
      {state.isReading && renderContent()}

      {/* Inline Generate Button / Loading State */}
      {state.inputText.trim().length > 0 && (
        <div className="flex justify-center mt-8 w-full">
          {state.audio.isLoading || state.isGenerating ? (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-sm space-y-3 z-50 bg-slate-900/90 p-5 rounded-2xl border border-slate-700/80 backdrop-blur-xl shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="flex justify-between text-sm text-slate-300 font-medium tracking-wide">
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {state.isGenerating ? 'Generating Audio...' : (state.model.status || 'Loading Engine...')}
                </span>
                <span className="text-indigo-300">{state.generationProgress}%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-700/50">
                <div
                  className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                  style={{ width: `${state.generationProgress}%` }}
                />
              </div>
            </div>
          ) : !state.isReading ? (
            <button
              onClick={() => {
                actions.primeAudioContext();
                actions.handleStartReading();
              }}
              className="px-10 py-3.5 rounded-full font-medium text-white shadow-lg transition-all transform hover:scale-105 hover:-translate-y-0.5 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25 active:scale-95 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
              Listen
            </button>
          ) : null}
        </div>
      )}

      {/* Hidden PDF Reader */}
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