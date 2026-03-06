import type React from 'react';
import { type FC } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';

const AudioPlayer: FC = () => {
  const { state, actions } = useAppContext();

  const disabled = !state.audio.canScrub;

  // FIX: clamp currentTime so it never exceeds duration
  const safeDuration = state.audio.duration || 0;
  const safeCurrentTime = Math.min(state.audio.currentTime, safeDuration);
  const progressPercent = safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0;

  return (
    <div
      className={cn(
        'bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 transition-opacity',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Progress Bar — above controls for more prominent placement */}
      <div
        className={cn(
          'w-full h-2 bg-slate-700 rounded-full relative overflow-hidden mb-5',
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
          const newTime = clickPosition * safeDuration;
          actions.seekToTime(newTime);
        }}
        onMouseUp={() => {
          if (!state.audio.canScrub) return;
          actions.setIsDragging(false);
        }}
      >
        {/* Progress Fill */}
        <div
          className="h-full bg-blue-500 rounded-full transition-[width] duration-100 ease-out"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Hover Time Tooltip */}
        {state.isSeekingHover && (
          <div
            className="absolute -top-9 -translate-x-1/2 px-2 py-1 bg-slate-950 text-white text-xs font-medium rounded border border-slate-600 shadow-lg z-10"
            style={{ left: `${(state.hoverTime / (safeDuration || 1)) * 100}%` }}
          >
            {actions.formatTime(state.hoverTime)}
          </div>
        )}
      </div>

      {/* Main Controls Row */}
      <div className="flex items-center justify-center gap-6">
        {/* Skip Back */}
        <button
          onClick={actions.skipBackward}
          className="w-12 h-12 rounded-full bg-slate-700/60 text-slate-300 text-sm font-semibold flex items-center justify-center hover:bg-slate-600 hover:text-white hover:scale-110 active:scale-95 transition-all"
          title="Skip back 15s"
        >
          <span className="text-xs leading-none">-15s</span>
        </button>

        {/* Play/Pause — large prominent button */}
        <button
          onClick={actions.togglePlayPause}
          className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-900/40 hover:bg-blue-500 hover:scale-110 active:scale-95 transition-all"
          title={state.audio.isPlaying ? 'Pause' : (safeCurrentTime >= safeDuration - 0.3 && safeDuration > 0 ? 'Restart' : 'Play')}
        >
          {state.audio.isPlaying ? (
            /* Pause icon — two bars */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25z" clipRule="evenodd" />
            </svg>
          ) : safeCurrentTime >= safeDuration - 0.3 && safeDuration > 0 ? (
            /* Restart icon */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clipRule="evenodd" />
            </svg>
          ) : (
            /* Play icon */
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 translate-x-0.5">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Skip Forward */}
        <button
          onClick={actions.skipForward}
          className="w-12 h-12 rounded-full bg-slate-700/60 text-slate-300 text-sm font-semibold flex items-center justify-center hover:bg-slate-600 hover:text-white hover:scale-110 active:scale-95 transition-all"
          title="Skip forward 15s"
        >
          <span className="text-xs leading-none">+15s</span>
        </button>
      </div>

      {/* Time + Status row */}
      <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
        <span className="font-mono tabular-nums">{actions.formatTime(safeCurrentTime)}</span>
        {state.isReading && (
          <span className="text-blue-400 text-xs animate-pulse">Generating audio…</span>
        )}
        <span className="font-mono tabular-nums">{actions.formatTime(safeDuration)}</span>
      </div>

      {/* Speed + Download + Google Drive row */}
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="text-slate-500">Speed</span>
          <select
            value={state.audio.playbackRate}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actions.setPlaybackRate(parseFloat(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="0.5">0.5×</option>
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {state.audio.synthesisComplete && (
            <button
              onClick={actions.handleDownloadAudio}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
              title="Download audio as WAV file"
            >
              💾 Download WAV
            </button>
          )}
          <button
            onClick={actions.linkGoogleDrive}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${state.googleDriveLinked
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
            title="Link Google Drive to sync your saved texts across devices"
          >
            ☁️ {state.googleDriveLinked ? 'Drive: Linked' : 'Link Drive'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;