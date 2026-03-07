import { type FC, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import ModelSelector from '../ModelSelector';
import { BRAND_NAME } from '../../utils/branding';
import { cn } from '../../utils/cn';

const Sidebar: FC = () => {
  const { state, actions, tts } = useAppContext();
  const [showSettings, setShowSettings] = useState(false);
  const [showDriveMenu, setShowDriveMenu] = useState(false);

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
        <div className="flex items-center gap-4">

          {/* Sign In / Google Account */}
          <div className="relative">
            <button
              onClick={() => state.googleDriveLinked ? setShowDriveMenu(!showDriveMenu) : actions.linkGoogleDrive()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all border",
                state.googleDriveLinked
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
              )}
              title="Manage Google Account Connection"
            >
              {state.googleDriveLinked ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Google Account
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 5.963-2.062a1.205 1.205 0 0 0 .339-1.3l-1.32-3.83a2.029 2.029 0 0 0-2.434-1.282l-2.027.506a.75.75 0 0 1-.502 0l-2.027-.506a2.029 2.029 0 0 0-2.434 1.282l-1.32 3.831h-.001Z" /></svg>
                  Sign In
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {showDriveMenu && state.googleDriveLinked && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDriveMenu(false)} />
                <div className="absolute top-full mt-2 right-0 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-800/50 mb-1">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-center">Sync Options</p>
                  </div>
                  <button
                    onClick={() => { setShowDriveMenu(false); actions.forceSyncDrive(); }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-800 transition-colors text-slate-200 text-sm flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                    Force Sync Now
                  </button>
                  <button
                    onClick={() => { setShowDriveMenu(false); actions.disconnectDrive(); }}
                    className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-sm flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>
                    Disconnect Account
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-full transition-all text-sm font-medium border",
              showSettings
                ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20"
                : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-indigo-400 hover:bg-slate-800"
            )}
            title="Engine Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Settings
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