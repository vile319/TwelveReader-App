import { type FC, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import ModelSelector from '../ModelSelector';
import { BRAND_NAME } from '../../utils/branding';
import { cn } from '../../utils/cn';

const Sidebar: FC = () => {
  const { state, actions, tts } = useAppContext();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="w-full h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-6 sticky top-0 z-40">

        {/* Left: Branding & Status */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-br from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {BRAND_NAME}
          </h1>
          <div className="hidden sm:flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-full",
              state.model.isReady ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 animate-pulse"
            )} />
            <span className="text-xs font-medium text-slate-400">
              {state.model.isReady ? "Ready" : "Loading Engine"}
            </span>
          </div>
        </div>

        {/* Center: Voice Selector (Minimal) */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="relative group">
            <select
              value={state.selectedVoice}
              onChange={(e) => actions.setSelectedVoice(e.target.value)}
              className="appearance-none bg-slate-900/50 border border-slate-700/50 text-slate-300 text-sm font-medium py-1.5 pl-4 pr-8 rounded-full cursor-pointer hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {tts.voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 group-hover:text-slate-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* File Upload Icon */}
          <label className="cursor-pointer p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-all" title="Upload PDF/EPUB">
            <input type="file" accept=".pdf,.epub" onChange={actions.handleFileUpload} className="hidden" />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </label>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-full transition-all",
              showSettings ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10"
            )}
            title="Engine Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Slide-over Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-sm h-full bg-slate-900 border-l border-slate-800 shadow-2xl p-6 overflow-y-auto transform transition-transform animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-200">Engine Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mobile-only voice selector */}
            <div className="md:hidden mb-8">
              <label className="block text-sm font-medium text-slate-400 mb-2">Voice</label>
              <select
                value={state.selectedVoice}
                onChange={(e) => actions.setSelectedVoice(e.target.value)}
                className="w-full bg-slate-800 border-none text-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
              >
                {tts.voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>{voice.label}</option>
                ))}
              </select>
            </div>

            {/* Models */}
            <div className="mb-8">
              <ModelSelector
                selectedModel={state.model.selectedModel}
                onModelChange={actions.setSelectedModel}
                onDeviceChange={actions.setPreferredDevice}
                onDtypeChange={actions.setPreferredDtype}
                disabled={state.audio.isLoading}
                modelKeepLocal={state.model.modelKeepLocal}
                onModelKeepLocalChange={actions.setModelKeepLocal}
              />
            </div>

            {/* Debug & Cache info (Moved from old sidebar) */}
            <div className="space-y-4 pt-6 border-t border-slate-800">
              <button onClick={actions.handleShowHelp} className="w-full p-3 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                <span>❓</span> Help & Tutorials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Error Toast */}
      {state.error && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-900/90 backdrop-blur border border-red-500 text-red-100 p-4 rounded-xl shadow-2xl max-w-sm animate-in slide-in-from-bottom">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="font-semibold text-red-50 mb-1">{state.error.title}</h4>
              <p className="text-sm text-red-200 leading-snug">{state.error.message}</p>
            </div>
            <button onClick={() => actions.setError(null)} className="text-red-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;