import type React from 'react';
import { type FC, useState, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';

const AudioPlayer: FC = () => {
  const { state, actions } = useAppContext();
  const [showDriveMenu, setShowDriveMenu] = useState(false);


  // Close drive menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showDriveMenu) setShowDriveMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDriveMenu]);

  // If there's no text and no audio, don't show the player to keep UI clean
  if (!state.inputText.trim() && !state.audio.canScrub && !state.isReading) {
    return null;
  }

  const disabled = !state.audio.canScrub && !state.isReading;

  // During streaming, use synthesizedDuration (grows per chunk); after synthesis use final duration
  const safeDuration = (state.audio.isStreaming ? state.audio.synthesizedDuration : state.audio.duration) || 0;
  const safeCurrentTime = Math.min(state.audio.currentTime, safeDuration);
  const progressPercent = safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0;

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out",
      "glass-floating-bar px-4 py-3 md:px-8",
      disabled && !state.inputText.trim() ? "translate-y-full" : "translate-y-0"
    )}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8">

        {/* Playback Controls */}
        <div className={cn('flex items-center gap-4 shrink-0', disabled && 'opacity-50 pointer-events-none')}>
          <button
            onClick={actions.skipBackward}
            className="px-3 py-1.5 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
            title="Skip back 15s"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>
            15s
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => {
              actions.primeAudioContext();
              // If synthesis is actively running (chunks being generated), only
              // toggle playback — never call handleStartReading which calls
              // tts.stop() and kills the generation.
              if (state.audio.isSynthesizing) {
                actions.togglePlayPause();
              } else if (!state.isReading && (state.audio.canScrub || state.inputText.trim())) {
                // Not in reading mode yet — enter reading mode properly
                // (handles both pre-loaded audio and fresh text)
                actions.handleStartReading();
              } else if (state.isReading && !state.audio.canScrub && !state.audio.isPlaying) {
                // In reading mode but no audio ready — trigger generation
                actions.handleStartReading();
              } else {
                actions.togglePlayPause();
              }
            }}
            disabled={!state.inputText.trim() && !state.audio.canScrub}
            className={cn(
              "w-12 h-12 rounded-sm flex items-center justify-center transition-all border",
              state.isReading && state.audio.isLoading ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-white text-black hover:bg-gray-200 border-transparent shadow-none"
            )}
            title={state.audio.isPlaying ? 'Pause' : (safeCurrentTime >= safeDuration - 0.3 && safeDuration > 0 ? 'Restart' : 'Play')}
          >
            {state.isReading && state.audio.isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : state.audio.isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25z" clipRule="evenodd" /></svg>
            ) : safeCurrentTime >= safeDuration - 0.3 && safeDuration > 0 ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clipRule="evenodd" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 translate-x-0.5"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={actions.skipForward}
            className="px-3 py-1.5 rounded-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
            title="Skip forward 15s"
          >
            15s
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" /></svg>
          </button>
        </div>

        {/* Progress Bar Area */}
        <div className="flex-1 w-full flex items-center gap-4">
          <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
            {actions.formatTime(safeCurrentTime)}
          </span>

          <div className="relative flex-1 group h-8 flex items-center">
            <div
              className={cn(
                'w-full h-2 bg-slate-800 rounded-sm relative overflow-hidden transition-all group-hover:h-3',
                disabled ? 'opacity-50' : '',
                state.audio.canScrub ? 'cursor-pointer' : 'cursor-not-allowed'
              )}
              onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
                if (!state.audio.canScrub) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const hoverPosition = (e.clientX - rect.left) / rect.width;
                actions.setHoverTime(hoverPosition * safeDuration);
                actions.setIsSeekingHover(true);
              }}
              onMouseLeave={() => {
                if (!state.audio.canScrub) return;
                actions.setIsSeekingHover(false);
              }}
              onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                if (!state.audio.canScrub) return;
                actions.setIsDragging(true);
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPosition = (e.clientX - rect.left) / rect.width;
                actions.seekToTime(clickPosition * safeDuration);
              }}
              onMouseUp={() => { if (!state.audio.canScrub) return; actions.setIsDragging(false); }}
            >
              {/* Progress Fill */}
              <div
                className="absolute left-0 top-0 h-full bg-blue-500 rounded-sm transition-[width] duration-100 ease-out"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Hover Tooltip */}
              {state.isSeekingHover && (
                <div
                  className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 bg-slate-800 text-white text-[10px] font-medium rounded border border-slate-700 shadow-lg z-10"
                  style={{ left: `${(state.hoverTime / (safeDuration || 1)) * 100}%` }}
                >
                  {actions.formatTime(state.hoverTime)}
                </div>
              )}
            </div>
          </div>

          <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
            {actions.formatTime(safeDuration)}
          </span>
        </div>

        {/* Utilities: Speed, Download, Sync */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={state.audio.playbackRate}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actions.setPlaybackRate(parseFloat(e.target.value))}
            className="appearance-none bg-transparent hover:bg-slate-800 text-slate-300 text-xs font-medium py-1.5 px-2 rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          >
            <option value="0.75">0.75×</option>
            <option value="1">1.0×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2.0×</option>
          </select>

          <button
            onClick={actions.handleDownloadAudio}
            disabled={!state.audio.synthesisComplete}
            className={cn(
              'px-3 py-1.5 rounded-sm transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest',
              state.audio.synthesisComplete ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-700 cursor-not-allowed'
            )}
            title="Download Audio (.wav)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            WAV
          </button>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                if (state.googleDriveLinked) setShowDriveMenu(!showDriveMenu);
                else actions.linkGoogleDrive();
              }}
              disabled={state.isSyncingToDrive}
              className={cn(
                'px-3 py-1.5 rounded-sm transition-colors relative flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest',
                state.googleDriveLinked ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
              title={state.googleDriveLinked ? 'Manage Google Drive Sync' : 'Link Google Drive'}
            >
              {state.isSyncingToDrive ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Syncing...
                </>
              ) : state.googleDriveLinked ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
                  Drive Synced
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" /></svg>
                  Link Drive
                </>
              )}
            </button>

            {showDriveMenu && state.googleDriveLinked && (
              <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#0f172a] border border-slate-700 rounded-sm shadow-2xl py-1 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                <button
                  onClick={() => {
                    actions.forceSyncDrive();
                    setShowDriveMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-sm flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                  Force Sync Now
                </button>
                <div className="h-px bg-slate-800 my-1"></div>
                <button
                  onClick={() => {
                    actions.disconnectDrive();
                    setShowDriveMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-sm flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>
                  Disconnect Drive
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AudioPlayer;