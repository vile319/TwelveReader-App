import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { cn } from '../../utils/cn';

const AudioPlayer: React.FC = () => {
  const { state, actions } = useAppContext();

  const disabled = !state.audio.canScrub;

  return (
    <div
      className={cn(
        'bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 transition-opacity',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      {/* Main Controls */}
      <div className="flex items-center gap-4 mb-5">
        {/* Skip Back */}
        <button
          onClick={actions.skipBackward}
          className="w-12 h-12 rounded-full bg-slate-700 text-slate-200 text-sm font-semibold flex items-center justify-center hover:bg-slate-600 hover:scale-105 transition-transform"
        >
          -15s
        </button>
        
        {/* Play/Pause */}
        <button
          onClick={actions.togglePlayPause}
          className="w-16 h-16 rounded-full bg-blue-500 text-white text-2xl flex items-center justify-center shadow-lg hover:bg-blue-600 hover:scale-105 transition-transform"
        >
          {state.audio.isPlaying ? '⏸️' : '▶️'}
        </button>
        
        {/* Skip Forward */}
        <button
          onClick={actions.skipForward}
          className="w-12 h-12 rounded-full bg-slate-700 text-slate-200 text-sm font-semibold flex items-center justify-center hover:bg-slate-600 hover:scale-105 transition-transform"
        >
          +15s
        </button>
        
        {/* Time Display */}
        <div className="flex-1 text-center">
          <div className="text-lg font-semibold text-slate-200 mb-1">
            {actions.formatTime(state.audio.currentTime)} / {actions.formatTime(state.audio.duration || state.audio.currentTime)}
          </div>
          {state.isReading && (
            <div className="text-xs text-blue-400">
              Generating audio...
            </div>
          )}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div
        className={cn(
          'w-full h-3 bg-slate-700 rounded-md relative overflow-hidden',
          state.audio.canScrub ? 'cursor-pointer' : 'cursor-not-allowed'
        )}
        onMouseMove={(e) => {
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
        onMouseDown={(e) => {
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
          className="h-full bg-blue-500 rounded-md transition-[width] duration-100 ease-out"
          style={{
            width: `${((state.audio.duration || 0) > 0 ? (state.audio.currentTime / (state.audio.duration || 1)) * 100 : 0)}%`,
          }}
        />
        
        {/* Hover Time Tooltip */}
        {state.isSeekingHover && (
          <div
            className="absolute -top-9 -translate-x-1/2 px-2 py-1 bg-slate-950 text-white text-xs font-medium rounded border border-slate-600 shadow-lg z-10"
            style={{
              left: `${(state.hoverTime / (state.audio.duration || 1)) * 100}%`,
            }}
          >
            {actions.formatTime(state.hoverTime)}
          </div>
        )}
      </div>
      
      {/* Download Button */}
      {state.audio.synthesisComplete && (
        <div className="mt-4 text-center">
          <button
            onClick={actions.handleDownloadAudio}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 hover:-translate-y-0.5 transition-transform"
          >
            💾 Download Audio (WAV)
          </button>
        </div>
      )}

      {/* Playback Speed Controls (always visible) */}
      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-200">
        <span>Speed:</span>
        <select
          value={state.audio.playbackRate}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actions.setPlaybackRate(parseFloat(e.target.value))}
          className="bg-slate-700 rounded px-2 py-1 focus:outline-none"
        >
          <option value="0.5">0.5x</option>
          <option value="0.75">0.75x</option>
          <option value="1">1x</option>
          <option value="1.25">1.25x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>

      {/* Audio Stats */}
      {state.audio.canScrub && (
        <div className="mt-3 text-center text-xs text-slate-400">
          {state.audio.wordTimings.length > 0 && (
            <span>
              {state.audio.wordTimings.length} words tracked • 
              {state.audio.currentWordIndex >= 0 && state.audio.currentWordIndex < state.audio.wordTimings.length && (
                <span className="text-blue-400 font-medium">
                  {' '}highlighting "{state.audio.wordTimings[state.audio.currentWordIndex]?.word}"
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;