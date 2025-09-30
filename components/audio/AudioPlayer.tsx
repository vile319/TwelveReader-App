import type React from 'react';
import { type FC } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';

const AudioPlayer: FC = () => {
  const { state, actions } = useAppContext();

  const disabled = !state.audio.canScrub;

  return (
    <div
      className={cn(
        'bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90 backdrop-blur-xl border-2 border-slate-700/50 rounded-3xl p-8 mb-8 transition-all shadow-2xl',
        disabled ? 'opacity-50 pointer-events-none' : 'shadow-violet-500/10 hover:shadow-violet-500/20'
      )}
    >
      {/* Header */}
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          Audio Player
        </h3>
      </div>

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-6 mb-8">
        {/* Skip Back */}
        <button
          onClick={actions.skipBackward}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border-2 border-slate-600/50 text-slate-200 text-sm font-bold flex flex-col items-center justify-center hover:from-slate-600/80 hover:to-slate-700/80 hover:border-violet-500/50 hover:scale-110 hover:shadow-lg hover:shadow-violet-500/30 transition-all active:scale-95"
        >
          <span className="text-lg">⏪</span>
          <span className="text-xs">15s</span>
        </button>
        
        {/* Play/Pause */}
        <button
          onClick={actions.togglePlayPause}
          className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-violet-700 text-white text-3xl flex items-center justify-center shadow-2xl shadow-violet-500/40 hover:scale-110 hover:shadow-violet-500/60 transition-all active:scale-95 border-2 border-violet-400/30"
        >
          {state.audio.isPlaying ? '⏸' : '▶️'}
        </button>
        
        {/* Skip Forward */}
        <button
          onClick={actions.skipForward}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700/80 to-slate-800/80 backdrop-blur-sm border-2 border-slate-600/50 text-slate-200 text-sm font-bold flex flex-col items-center justify-center hover:from-slate-600/80 hover:to-slate-700/80 hover:border-violet-500/50 hover:scale-110 hover:shadow-lg hover:shadow-violet-500/30 transition-all active:scale-95"
        >
          <span className="text-lg">⏩</span>
          <span className="text-xs">15s</span>
        </button>
      </div>

      {/* Time Display */}
      <div className="text-center mb-6">
        <div className="text-2xl font-bold text-slate-100 mb-2 tracking-wide">
          {actions.formatTime(state.audio.currentTime)} / {actions.formatTime(state.audio.duration || state.audio.currentTime)}
        </div>
        {state.isReading && (
          <div className="inline-flex items-center gap-2 text-sm text-violet-400 bg-violet-400/10 px-4 py-2 rounded-full border border-violet-400/30">
            <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            <span className="font-semibold">Generating audio...</span>
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div
        className={cn(
          'w-full h-4 bg-slate-700/50 backdrop-blur-sm rounded-full relative overflow-hidden border border-slate-600/50 shadow-inner mb-6',
          state.audio.canScrub ? 'cursor-pointer' : 'cursor-not-allowed'
        )}
        onMouseMove={(e: React.MouseEvent<HTMLDivElement>) => {
          if (!state.audio.canScrub) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const hoverPosition = (e.clientX - rect.left) / rect.width;
          actions.setHoverTime(hoverPosition * (state.audio.duration || 0));
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
          const newTime = clickPosition * (state.audio.duration || 0);
          actions.seekToTime(newTime);
        }}
        onMouseUp={() => {
          if (!state.audio.canScrub) return;
          actions.setIsDragging(false);
        }}
      >
        {/* Progress Fill */}
        <div
          className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-500 rounded-full transition-[width] duration-100 ease-out shadow-lg shadow-violet-500/50"
          style={{
            width: `${((state.audio.duration || 0) > 0 ? (state.audio.currentTime / (state.audio.duration || 1)) * 100 : 0)}%`,
          }}
        />
        
        {/* Hover Time Tooltip */}
        {state.isSeekingHover && (
          <div
            className="absolute -top-12 -translate-x-1/2 px-4 py-2 bg-slate-900 backdrop-blur-xl text-white text-sm font-bold rounded-xl border-2 border-violet-500/50 shadow-2xl shadow-violet-500/30 z-10"
            style={{
              left: `${(state.hoverTime / (state.audio.duration || 1)) * 100}%`,
            }}
          >
            {actions.formatTime(state.hoverTime)}
          </div>
        )}
      </div>

      {/* Playback Speed Controls */}
      <div className="flex items-center justify-center gap-4 mb-6 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
        <span className="text-sm font-bold text-slate-300 uppercase tracking-wide">Speed:</span>
        <select
          value={state.audio.playbackRate}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actions.setPlaybackRate(parseFloat(e.target.value))}
          className="bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 border border-slate-600/50 cursor-pointer hover:from-slate-600 hover:to-slate-700 transition-all shadow-lg"
        >
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1">1.0x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2.0x</option>
        </select>
      </div>
      
      {/* Download Button */}
      {state.audio.synthesisComplete && (
        <div className="text-center mb-6">
          <button
            onClick={actions.handleDownloadAudio}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold uppercase tracking-wide hover:from-emerald-500 hover:to-teal-500 hover:scale-105 transition-all shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 border-2 border-emerald-400/30"
          >
            <span className="text-xl">💾</span>
            Download Audio (WAV)
          </button>
        </div>
      )}

      {/* Audio Stats */}
      {state.audio.canScrub && (
        <div className="text-center text-sm text-slate-400 bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
          {state.audio.wordTimings.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-300">
                {state.audio.wordTimings.length} words tracked
              </span>
              {state.audio.currentWordIndex >= 0 && state.audio.currentWordIndex < state.audio.wordTimings.length && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-violet-400 font-bold">
                    highlighting "{state.audio.wordTimings[state.audio.currentWordIndex]?.word}"
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;
