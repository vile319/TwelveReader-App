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
  const [isSaving, setIsSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<{ id: string; time: number } | null>(null);
  const currentDeviceLabel =
    state.model.currentDevice === 'webgpu'
      ? 'Local GPU (WebGPU)'
      : state.model.currentDevice === 'wasm'
        ? 'Local CPU (WASM)'
        : state.model.currentDevice === 'cpu'
          ? 'Local CPU Native'
          : state.model.currentDevice === 'serverless'
            ? 'Cloud'
            : 'Detecting...';

  const handleSave = async () => {
    let success = false;
    if (!saveTitle.trim()) {
      success = await actions.saveCurrentTextSet('Untitled');
    } else {
      success = await actions.saveCurrentTextSet(saveTitle);
    }

    setIsSaving(false);
    setSaveTitle('');

    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Restore scroll and prompt for audio resume on load of set
  useEffect(() => {
    if (!contentRef.current) return;
    const setId = state.currentSetId;

    // Clear prompt if we change documents
    if (!setId || resumePrompt?.id !== setId) {
      setResumePrompt(null);
    }
    if (!setId) return;

    const prog = state.readingProgress[setId];
    if (prog) {
      if (typeof prog.scrollTop === 'number') {
        contentRef.current.scrollTop = prog.scrollTop;
      }
      // If we have significant progress (> 5s) and we aren't already playing it, prompt to resume
      if (prog.audioTime > 5 && !state.isReading && state.audio.currentTime < 1) {
        setResumePrompt({ id: setId, time: prog.audioTime });
      }
    }
  }, [state.currentSetId, state.readingProgress]);

  const renderContent = () => {
    return (
      <div
        ref={contentRef}
        onScroll={(e: React.UIEvent<HTMLDivElement>) => actions.updateScrollPosition((e.currentTarget).scrollTop)}
        className="flex-1 w-full flex flex-col min-h-[40vh] relative"
      >
        {/* Resume Prompt Toast */}
        {resumePrompt && resumePrompt.id === state.currentSetId && !state.isReading && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 bg-blue-600 text-white px-5 py-3 rounded-sm shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
            <span className="text-sm font-bold uppercase tracking-wide">Resume from {Math.floor(resumePrompt.time / 60)}:{Math.floor(resumePrompt.time % 60).toString().padStart(2, '0')}?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setResumePrompt(null)}
                className="text-xs bg-blue-800 hover:bg-blue-900 uppercase font-bold px-3 py-1.5 rounded-sm transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={async () => {
                  try {
                    await actions.handleStartReading();
                    // Wait a tiny bit for the engine to initialize before seeking
                    setTimeout(() => actions.handleWordClick(resumePrompt.time), 500);
                  } catch { }
                  setResumePrompt(null);
                }}
                className="text-xs bg-white text-blue-600 hover:bg-slate-100 uppercase font-bold px-3 py-1.5 rounded-sm shadow-none transition-colors"
              >
                Resume
              </button>
            </div>
          </div>
        )}

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
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-[#111827] hover:bg-slate-800 px-4 py-2 rounded-sm border border-slate-700 hover:border-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Editing Mode
            </button>
          ) : (
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-[#111827] px-4 py-2 rounded-sm border border-slate-700 hover:border-slate-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
              {showLibrary ? 'Hide Library' : 'Library'}
            </button>
          )}

          {/* New Explicit PDF Upload Button */}
          {!state.isReading && (
            <label className="cursor-pointer flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors bg-[#111827] px-4 py-2 rounded-sm border border-slate-700 hover:border-slate-500" title="Upload PDF or EPUB document">
              <input type="file" accept=".pdf,.epub" onChange={actions.handleFileUpload} className="hidden" />
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Upload
            </label>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 tracking-wider uppercase font-medium">
            {state.inputText.length.toLocaleString()} chars
          </span>
          {state.inputText.trim().length > 0 && (
            isSaving ? (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-4 fade-in">
                <input
                  type="text"
                  autoFocus
                  placeholder="Story Title..."
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSave();
                    } else if (e.key === 'Escape') {
                      setIsSaving(false);
                      setSaveTitle('');
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1 text-sm text-slate-200 outline-none focus:border-emerald-500 max-w-[150px]"
                />
                <button
                  onClick={handleSave}
                  className="text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors bg-emerald-500/10 px-3 py-1 rounded-md"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsSaving(false);
                    setSaveTitle('');
                  }}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" className="rotate-45 origin-center text-slate-400 hover:text-red-400" /></svg>
                </button>
              </div>
            ) : isSaved ? (
              <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium animate-in zoom-in fade-in transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
                Saved!
              </div>
            ) : (
              <button
                onClick={() => setIsSaving(true)}
                className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors hover:bg-[#111827] px-4 py-2 rounded-sm border border-transparent hover:border-slate-600"
                title="Save to Library"
              >
                Save Text
              </button>
            )
          )}
        </div>
      </div>

      {/* Library Drawer (Samples & Saved) */}
      {showLibrary && (
        <div className="mb-8 p-6 rounded-sm bg-[#0f172a] border border-slate-700 animate-in slide-in-from-top-2 fade-in">
          {/* Sample Texts */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Templates</h3>
            <div className="flex flex-wrap gap-2">
              {sampleTexts.map((sample, index) => (
                <button
                  key={index}
                  onClick={() => { actions.setInputText(sample.text); setShowLibrary(false); }}
                  className="text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-sm bg-[#1e293b] text-slate-300 hover:bg-blue-600 hover:text-white transition-colors border border-slate-700"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          {/* Saved Texts */}
          {state.savedTextSets.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Saved</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {state.savedTextSets.map((set: TextSet) => (
                  <div key={set.id} className="group relative flex items-center justify-between bg-[#1e293b] hover:bg-slate-700 border border-slate-700 hover:border-blue-500 rounded-sm p-3 transition-all cursor-pointer" onClick={() => { actions.loadTextSet(set.id); setShowLibrary(false); }}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={cn("w-2 h-2 rounded-sm flex-shrink-0", set.audioGenerated ? "bg-emerald-500" : "bg-slate-600")} />
                      <span className="text-sm font-semibold text-slate-200 truncate pr-8">{set.title}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); actions.deleteTextSet(set.id); }}
                      className="absolute right-3 opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-sm transition-all"
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
          className="prose-editor w-full min-h-[300px] resize-y bg-[#0a0f1a] border border-slate-800 rounded-sm p-6 md:p-8 mb-8 focus:border-blue-500 outline-none text-lg leading-relaxed text-slate-200 transition-colors"
        />
      )}

      {/* Content Display (Highlighted text during reading) */}
      {state.isReading && renderContent()}

      {/* Inline Generate Button / Loading State */}
      {state.inputText.trim().length > 0 && (
        <div className="flex justify-center mt-8 w-full">
          {state.audio.isLoading || state.isGenerating ? (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-sm space-y-3 z-50 bg-[#0f172a] p-5 rounded-sm border border-slate-700 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {state.isGenerating ? 'Generating Audio...' : (state.model.status || 'Loading Engine...')}
                </span>
                <span className="text-blue-400">{state.generationProgress}%</span>
              </div>
              <div className="w-full bg-[#020617] rounded-sm h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-blue-600 h-2.5 rounded-sm transition-all duration-300 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                  style={{ width: `${state.generationProgress}%` }}
                />
              </div>
              {state.isGenerating && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={actions.cancelGeneration}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 uppercase font-bold px-3 py-1.5 rounded-sm transition-colors border border-slate-700 hover:border-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : !state.isReading ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  actions.primeAudioContext();
                  actions.handleStartReading();
                }}
                className="px-10 py-3.5 rounded-sm font-bold tracking-widest uppercase text-white shadow-none transition-all bg-blue-600 hover:bg-blue-500 active:bg-blue-700 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                Listen
              </button>
              <p className="text-xs text-slate-400">
                Detected: <span className="font-semibold text-slate-200">{state.model.detectedHardwareLabel}</span>
              </p>
              <p className="text-xs text-slate-400">
                Engine: <span className="font-semibold text-slate-200">{currentDeviceLabel}</span>
              </p>
            </div>
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