import { type FC, useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import ModelSelector from '../ModelSelector';
import { BRAND_NAME } from '../../utils/branding';
import { cn } from '../../utils/cn';

const Sidebar: FC = () => {
  const { state, actions, tts } = useAppContext();
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

  return (
    <>
      <header className="w-full h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-6 sticky top-0 z-40">

        {/* Left: Branding & Status */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-widest text-[#a3b1c6] uppercase">
            {BRAND_NAME}
          </h1>
          <div className="hidden sm:flex items-center gap-2">
            <span className={cn(
              "w-2 h-2 rounded-sm",
              state.model.isReady ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
            )} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {state.model.isReady ? "Ready" : "Engine Standby"}
            </span>
          </div>
        </div>

        {/* Center: Voice Selector (Minimal) */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="relative group">
            <select
              value={state.selectedVoice}
              onChange={(e) => actions.setSelectedVoice(e.target.value)}
              className="appearance-none bg-[#111827] border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wide py-1.5 pl-4 pr-8 rounded-sm cursor-pointer hover:bg-slate-800 transition-colors focus:outline-none focus:border-blue-500"
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

          {/* Identity / Sign In */}
          <div className="relative">
            <button
              onClick={() => state.userEmail ? setShowUserMenu(!showUserMenu) : actions.loginUser()}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-sm font-bold text-xs uppercase tracking-wider transition-all border",
                state.userEmail
                  ? "bg-[#111827] text-slate-200 border-slate-700 hover:bg-slate-800"
                  : "bg-blue-600 border-blue-500 text-white hover:bg-blue-500 hover:border-blue-400"
              )}
              title="Manage Account"
            >
              {state.userEmail ? (
                <>
                  <div className="w-5 h-5 rounded-sm bg-blue-600 flex items-center justify-center text-white text-xs font-bold uppercase overflow-hidden ring-1 ring-slate-800">
                    {state.userEmail.charAt(0)}
                  </div>
                  {state.isPremium && <span className="ml-1 text-[10px] text-amber-400 font-bold tracking-widest pl-1 border-l border-slate-700">PRO</span>}
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 5.963-2.062a1.205 1.205 0 0 0 .339-1.3l-1.32-3.83a2.029 2.029 0 0 0-2.434-1.282l-2.027.506a.75.75 0 0 1-.502 0l-2.027-.506a2.029 2.029 0 0 0-2.434 1.282l-1.32 3.831h-.001Z" /></svg>
                  Sign In
                </>
              )}
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && state.userEmail && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute top-full mt-2 right-0 w-56 bg-[#0f172a] border border-slate-700 rounded-sm shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-slate-800/50 mb-1 flex flex-col items-center">
                    <p className="text-sm font-semibold text-slate-200 truncate w-full text-center">{state.userEmail}</p>
                    {state.isPremium ? (
                      <span className="text-xs text-amber-400 font-bold tracking-widest uppercase mt-1">Premium Member</span>
                    ) : (
                      <span className="text-xs text-slate-500 mt-1">Free Tier</span>
                    )}
                  </div>

                  {!state.isPremium && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        const paymentLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK || '#';
                        if (paymentLink === '#') {
                          actions.setToast({ title: 'Coming Soon', message: 'Premium checkout is not yet configured.', type: 'info' });
                        } else {
                          window.open(`${paymentLink}?prefilled_email=${encodeURIComponent(state.userEmail || '')}`, '_blank');
                        }
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-800 transition-colors text-amber-400 hover:text-amber-300 text-sm flex items-center gap-2 font-medium"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" /></svg>
                      Upgrade to Premium
                    </button>
                  )}

                  <button
                    onClick={() => { setShowUserMenu(false); actions.logoutUser(); }}
                    className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-sm flex items-center gap-2 mt-1 border-t border-slate-800 pt-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded-sm transition-all text-xs font-bold uppercase tracking-wider border",
              showSettings
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-[#111827] text-slate-400 border-slate-700 hover:text-white hover:bg-slate-800 hover:border-slate-600"
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-sm h-full bg-[#0f172a] border-l border-slate-700 shadow-2xl p-6 overflow-y-auto transform transition-transform animate-in slide-in-from-right duration-200">
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
              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full p-3 rounded-lg bg-indigo-600/20 text-indigo-300 text-sm font-medium hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Install App (Offline Mode)
                </button>
              )}
              <button onClick={actions.handleShowHelp} className="w-full p-3 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                <span>❓</span> Help & Tutorials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {state.toast && (
        <div className={cn(
          "fixed top-6 right-6 z-50 p-4 rounded-sm shadow-2xl max-w-sm animate-in slide-in-from-top flex justify-between items-start gap-4 border",
          state.toast.type === 'error' ? "bg-red-950 border-red-500/80 text-red-100" :
            state.toast.type === 'success' ? "bg-emerald-950 border-emerald-500/80 text-emerald-100" :
              "bg-[#0f172a] border-blue-500/80 text-blue-100"
        )}>
          <div>
            {state.toast.title && <h4 className="font-semibold mb-1 text-white">{state.toast.title}</h4>}
            <p className="text-sm opacity-90 leading-snug">{state.toast.message}</p>
          </div>
          <button onClick={() => actions.setToast(null)} className="opacity-70 hover:opacity-100 hover:text-white transition-opacity">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
};

export default Sidebar;