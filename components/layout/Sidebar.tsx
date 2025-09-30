import { FC, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import AdSenseBanner from '../AdSenseBanner';
import KoFiButton from '../KoFiButton';
import ModelSelector from '../ModelSelector';
import { BRAND_NAME, VERSION } from '../../utils/branding';

// Small helper – joins classes conditionally
const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

// Voice object coming from Kokoro hook
interface Voice {
  name: string;
  label: string;
}

const Sidebar: FC = () => {
  const { state, actions, tts } = useAppContext();
  // Local toggle to show/hide rarely-used technical controls
  const [showAdvanced, setShowAdvanced] = useState(false);
  const voices: Voice[] = tts.voices as Voice[];

  return (
    <div className="sidebar overflow-auto bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 p-8 flex flex-col w-full md:w-80 md:fixed md:left-0 md:top-0 md:h-screen shadow-2xl">
      {/* Logo with animated gradient */}
      <div className="mb-10">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-violet-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
            {BRAND_NAME}
          </h1>
          <span className="text-xs font-semibold text-slate-400 bg-slate-700/50 px-2.5 py-1 rounded-full border border-slate-600/50 shadow-sm">
            v{VERSION}
          </span>
        </div>
        <p className="text-sm text-slate-400 m-0 mt-2 font-medium">AI-powered audiobook experience</p>
      </div>

      {/* Status Card */}
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm text-slate-100 text-sm rounded-2xl p-5 mb-8 border border-slate-700/50 shadow-xl">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            state.model.isReady ? "bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" :
            state.model.error ? "bg-red-400 shadow-lg shadow-red-400/50" :
            "bg-amber-400 shadow-lg shadow-amber-400/50 animate-pulse"
          )} />
          <span className="font-medium">
            {state.model.isReady ? '✓ Ready to synthesize' : 
             state.model.error ? '⚠ Model error' :
             state.model.status}
          </span>
        </div>
      </div>

      {/* Voice Selection */}
      <div className="mb-8">
        <label className="block mb-3 text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
          <span className="text-lg">🎭</span>
          Voice Selection
        </label>
        <select
          value={state.selectedVoice}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actions.setSelectedVoice(e.target.value)}
          className="w-full p-4 rounded-xl bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-sm text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent shadow-lg hover:bg-slate-700/80 cursor-pointer"
        >
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.label}
            </option>
          ))}
        </select>
        <div className="mt-2 text-xs text-slate-400 font-medium">
          {tts.voices.length} voices available
        </div>
      </div>

      {/* File Upload (PDF / EPUB) */}
      <div className="mb-8">
        <label className="block mb-3 text-sm font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
          <span className="text-lg">📚</span>
          Upload Document
        </label>
        <input
          type="file"
          accept=".pdf,.epub"
          onChange={actions.handleFileUpload}
          className="w-full p-4 rounded-xl bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 text-sm text-slate-100 cursor-pointer shadow-lg hover:bg-slate-700/80 file:cursor-pointer file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-violet-600 file:to-purple-600 file:text-white file:font-bold file:text-xs file:uppercase file:tracking-wide hover:file:from-violet-500 hover:file:to-purple-500 file:shadow-lg file:shadow-violet-500/30"
        />
        {state.isExtractingPDF && (
          <div className="flex items-center gap-3 text-xs text-cyan-400 mt-3 bg-cyan-400/10 rounded-lg p-3 border border-cyan-400/30">
            <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="font-semibold">Extracting text...</span>
          </div>
        )}
        {state.error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl p-4 mt-3 shadow-lg">
            <div className="font-bold mb-2 text-red-200">{state.error.title}</div>
            <div className="leading-relaxed mb-3">{state.error.message}</div>
            <button
              onClick={() => actions.setError(null)}
              className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-xs font-bold uppercase tracking-wide hover:bg-red-500/30 transition-all"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Help Button */}
      <button
        onClick={actions.handleShowHelp}
        className="w-full py-4 rounded-xl border-2 border-violet-500/50 bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-300 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-3 mb-8 hover:from-violet-500/20 hover:to-purple-500/20 hover:scale-[1.02] transition-all shadow-lg hover:shadow-violet-500/20"
        title="Get help and view tutorial"
      >
        <span className="text-xl">❓</span>
        Help & FAQ
      </button>

      {/* Model Selection */}
      <div className="mb-8">
        <ModelSelector
          selectedModel={state.model.selectedModel}
          onModelChange={actions.setSelectedModel}
          onDeviceChange={actions.setPreferredDevice}
          onDtypeChange={actions.setPreferredDtype}
          disabled={state.audio.isLoading}
        />
      </div>

      {/* Advanced Options (collapsed by default) */}
      <div className="mb-8">
        {/* Toggle */}
        <button
          onClick={() => setShowAdvanced((prev: boolean) => !prev)}
          className="w-full py-3 rounded-xl border-2 border-slate-600/50 bg-slate-800/50 backdrop-blur-sm text-slate-200 font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-3 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all shadow-lg"
          title="Technical and troubleshooting controls"
        >
          <span className="text-lg">⚙️</span>
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>

        {/* Collapsible content */}
        {showAdvanced && (
          <div className="pt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Model Management */}
            <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <button
                onClick={async () => {
                  await actions.cleanupUnwantedModels();
                  alert('🧹 Cleaned up unwanted models. Only models you chose to keep are now cached.');
                }}
                className="w-full py-2.5 rounded-lg border-2 border-emerald-500/50 bg-emerald-500/10 text-emerald-300 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all shadow-md hover:shadow-emerald-500/20"
              >
                <span>🧹</span> Cleanup Models
              </button>

              <button
                onClick={async () => {
                  const cacheInfo = await actions.getModelCacheSize();
                  alert(`Cache Status:\n📦 Total Size: ${cacheInfo.sizeFormatted}\n📁 Files: ${cacheInfo.fileCount}\n\nModels kept: ${Object.keys(state.model.modelKeepLocal).filter(id => state.model.modelKeepLocal[id]).length}`);
                }}
                className="w-full py-2.5 rounded-lg border-2 border-cyan-500/50 bg-cyan-500/10 text-cyan-300 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-cyan-500/20 transition-all shadow-md hover:shadow-cyan-500/20"
              >
                <span>📊</span> Cache Info
              </button>

              <button
                onClick={async () => {
                  if (confirm('⚠️ This will reset ALL model data and clear all caches. Are you sure?')) {
                    await actions.resetAllModelData();
                    actions.setInputText('');
                    actions.setUploadedPDF(null);
                    alert('🔄 All model data has been reset.');
                  }
                }}
                className="w-full py-2.5 rounded-lg border-2 border-red-500/50 bg-red-500/10 text-red-300 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all shadow-md hover:shadow-red-500/20"
              >
                <span>🔄</span> Reset All Models
              </button>
            </div>

            {/* Debug Audio */}
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
              className="w-full py-2.5 rounded-lg border-2 border-amber-500/50 bg-amber-500/10 text-amber-300 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-amber-500/20 transition-all shadow-md hover:shadow-amber-500/20"
            >
              <span>🔍</span> Debug Audio
            </button>

            {/* Audio Normalization */}
            <button
              onClick={actions.toggleNormalizeAudio}
              className={cn(
                'w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-md',
                state.model.normalizeAudio
                  ? 'border-2 border-emerald-500/50 text-emerald-300 bg-emerald-500/20 hover:shadow-emerald-500/20'
                  : 'border-2 border-slate-500/50 text-slate-400 bg-slate-500/10 hover:bg-slate-500/20'
              )}
            >
              {state.model.normalizeAudio ? '✅' : '📢'} Audio Fix: {state.model.normalizeAudio ? 'ON' : 'OFF'}
            </button>

            {/* Google Drive Sync */}
            <button
              onClick={actions.linkGoogleDrive}
              className="w-full py-2.5 rounded-lg border-2 border-sky-500/50 bg-sky-500/10 text-sky-300 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-sky-500/20 transition-all shadow-md hover:shadow-sky-500/20"
            >
              <span>☁️</span> {state.googleDriveLinked ? 'Google Drive: Linked' : 'Link Google Drive'}
            </button>
          </div>
        )}
      </div>
      
      {/* Donation Button */}
      <div className="mt-auto flex flex-col items-center gap-6 pt-6 border-t border-slate-700/50">
        {/* Ko-fi donation button */}
        <KoFiButton username="Oronto" />

        {/* Sidebar Banner Ad */}
        <AdSenseBanner adSlot="5566778899" adFormat="rectangle" style={{ maxWidth: '280px' }} />
      </div>
    </div>
  );
};

export default Sidebar;
