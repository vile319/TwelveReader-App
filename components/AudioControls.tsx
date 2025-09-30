import React from 'react';

interface AudioControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onDownload: () => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({
  isPlaying,
  isLoading,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
  onSkipForward,
  onSkipBackward,
  onDownload,
}) => {
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    onSeek(time);
  };

  const hasAudio = duration > 0;

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h3 className="font-semibold mb-4 text-lg">🎵 Audio Player</h3>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSliderChange}
          disabled={!hasAudio}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed slider"
          style={{
            background: hasAudio
              ? `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${(currentTime / duration) * 100}%, rgb(51, 65, 85) ${(currentTime / duration) * 100}%, rgb(51, 65, 85) 100%)`
              : 'rgb(51, 65, 85)'
          }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        {/* Skip Backward */}
        <button
          onClick={onSkipBackward}
          disabled={!hasAudio}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          title="Skip backward 15s"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            <text x="12" y="16" fontSize="8" textAnchor="middle" fill="currentColor">15</text>
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          disabled={!hasAudio}
          className="p-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-110 active:scale-95"
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Skip Forward */}
        <button
          onClick={onSkipForward}
          disabled={!hasAudio}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          title="Skip forward 15s"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            <text x="12" y="16" fontSize="8" textAnchor="middle" fill="currentColor">15</text>
          </svg>
        </button>

        {/* Download */}
        <button
          onClick={onDownload}
          disabled={!hasAudio}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 ml-2"
          title="Download audio"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AudioControls;
