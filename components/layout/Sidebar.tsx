import React, { type FC } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import AdSenseBanner from '../AdSenseBanner';
void React;

// Small helper – joins classes conditionally
const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// Voice object coming from Kokoro hook
interface Voice {
  name: string;
  label: string;
}

const Sidebar: FC = () => {
  const { state, actions, tts } = useAppContext();

  const isGenerateDisabled = !state.inputText.trim() || state.audio.isLoading;
  const voices: Voice[] = tts.voices as Voice[];

  return (
    <div className="sidebar overflow-auto bg-slate-900 border-r border-slate-800 p-6 flex flex-col w-full md:w-80 md:fixed md:left-0 md:top-0 md:h-screen">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          TwelveReader
        </h1>
        <p className="text-sm text-gray-400 m-0">AI-powered reading</p>
      </div>

      {/* Status */}
      <div className="bg-slate-700 text-slate-200 text-sm rounded-lg p-3 mb-6">
        {state.model.status}
      </div>

      {/* Voice Selection */}
      <div className="mb-6">
        <label className="block mb-3 text-sm font-semibold text-slate-200">
          🎭 Voice ({tts.voices.length} available)
        </label>
        <select
          value={state.selectedVoice}
          onChange={(e) => actions.setSelectedVoice(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.label}
            </option>
          ))}
        </select>
      </div>

      {/* PDF Upload */}
      <div className="mb-6">
        <label className="block mb-3 text-sm font-semibold text-slate-200">
          📄 PDF Upload
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={actions.handleFileUpload}
          className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-200 cursor-pointer file:cursor-pointer"
        />
        {state.isExtractingPDF && (
          <div className="flex items-center gap-2 text-xs text-blue-400 mt-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Extracting text from PDF...
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={state.isReading ? actions.handleStopReading : actions.handleStartReading}
        disabled={isGenerateDisabled}
        className={cn(
          'w-full py-4 rounded-lg font-semibold text-white mb-4 transition-colors',
          state.isReading ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-600',
          isGenerateDisabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {state.audio.isLoading ? '⏳ Generating...' : 
         state.isReading ? '⏹️ Stop Generation' : 
         state.audio.canScrub ? '🔄 Regenerate' :
         '▶️ Generate Audio'}
      </button>

      {/* Reset Model Button */}
      <button
        onClick={async () => {
          await actions.clearModel();
          actions.setInputText('');
          actions.setUploadedPDF(null);
        }}
        className="w-full py-3 rounded-lg border border-red-600 text-red-600 font-semibold flex items-center justify-center gap-2 mb-2 hover:bg-red-600/10 transition-colors"
        title="Clear and reload the AI model (fixes stuck states)"
      >
        🔄 Reset Model
      </button>
      
      {/* Cache Status Button */}
      <button
        onClick={async () => {
          const status = await actions.checkCacheStatus();
          alert(`Cache Status:\n${status.cached ? '✅ Model is cached' : '❌ No cache found'}\nFiles: ${status.fileCount}\nSize: ${status.sizeFormatted || 'Unknown'}\n\nCheck console for detailed cache info.`);
        }}
        className="w-full py-2 rounded-lg border border-slate-500 text-slate-500 text-xs font-medium flex items-center justify-center gap-1 mb-2 hover:bg-slate-500/10 transition-colors"
        title="Check if the AI model is cached in your browser"
      >
        📊 Check Cache
      </button>
      
      {/* Debug Audio Quality Button */}
      <button
        onClick={async () => {
          const debugInfo = await actions.debugAudioQuality();
          const qualityTest = await actions.checkAudioQuality();
          
          let message = `Audio Debug Info:\n\n`;
          message += `🖥️ Platform: ${debugInfo.platform}\n`;
          message += `🤖 Device: ${debugInfo.device}\n`;
          message += `🎵 Sample Rate: ${debugInfo.sampleRate}Hz\n`;
          message += `⚡ WebGPU: ${debugInfo.webgpuSupported ? 'Yes' : 'No'}\n\n`;
          
          if (qualityTest) {
            message += `Test Audio Quality: ${qualityTest.quality}\n`;
            message += `Generation Time: ${qualityTest.generationTime}ms\n`;
            message += `Peak Level: ${qualityTest.peak}\n`;
            message += `RMS Level: ${qualityTest.rms}\n\n`;
          }
          
          message += `Check console (F12) for detailed logs.`;
          alert(message);
        }}
        className="w-full py-2 rounded-lg border border-amber-500 text-amber-500 text-xs font-medium flex items-center justify-center gap-1 mb-2 hover:bg-amber-500/10 transition-colors"
        title="Debug audio quality issues - compare results between computers"
      >
        🔍 Debug Audio
      </button>
      
      {/* Audio Normalization Toggle */}
      <button
        onClick={actions.toggleNormalizeAudio}
        className={cn(
          'w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 mb-6 transition-colors',
          state.model.normalizeAudio
            ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
            : 'border-slate-500 text-slate-500 hover:bg-slate-500/10'
        )}
        title="Fix audio clipping/scaling issues (enable if audio sounds distorted)"
      >
        {state.model.normalizeAudio ? '✅' : '📢'} Audio Fix: {state.model.normalizeAudio ? 'ON' : 'OFF'}
      </button>

      {/* Help Button */}
      <button
        onClick={actions.handleShowHelp}
        className="w-full py-3 rounded-lg border border-blue-500 bg-blue-500/10 text-blue-500 font-semibold flex items-center justify-center gap-2 mb-6 hover:bg-blue-500/20 transition-colors"
        title="Get help and view tutorial"
      >
        ❓ Help & FAQ
      </button>

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-200 text-red-700 text-sm rounded-lg p-3 mb-6 border border-red-400">
          <div className="font-semibold mb-1">{state.error.title}</div>
          <div className="mb-2 leading-snug">{state.error.message}</div>
          <button
            onClick={() => actions.setError(null)}
            className="px-2 py-1 rounded border border-red-700 text-red-700 text-xs font-medium hover:bg-red-700 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Sidebar Banner Ad */}
      <div className="mt-auto">
        <AdSenseBanner adSlot="5566778899" adFormat="rectangle" style={{ maxWidth: '280px', marginTop: '16px' }} />
      </div>
    </div>
  );
};

export default Sidebar;