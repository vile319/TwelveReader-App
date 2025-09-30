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
    <div className="sidebar overflow-auto bg-gradient-to-b from-[#1a1a1d] to-[#0e0e0f] border-r border-slate-800/50 p-6 flex flex-col w-full md:w-80 md:fixed md:left-0 md:top-0 md:h-screen">
      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#ff8500] via-[#ffa940] to-[#d4af37] bg-clip-text text-transparent">
            {BRAND_NAME}
          </h1>
          <span className="text-xs font-medium text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
            v{VERSION}
          </span>
        </div>
        <p className="text-sm text-slate-400 m-0 mt-1">Your personal audiobook library</p>
      </div>

      {/* Status */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 text-slate-200 text-sm rounded-xl p-4 mb-6 border border-slate-700/50 shadow-lg">
        {state.model.isReady ? '✅ Ready to generate audio' : 
         state.model.error ? '❌ Model unavailable - please select another' :
         state.model.status}
      </div>

      {/* Voice Selection */}
      <div className="mb-6">
        <label className="block mb-3 text-sm font-semibold text-slate-200">
          🎭 Voice ({tts.voices.length} available)
        </label>
        <select
          value={state.selectedVoice}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actions.setSelectedVoice(e.target.value)}
          className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#ff8500] shadow-sm"
        >
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.label}
            </option>
          ))}
        </select>
      </div>

      {/* File Upload (PDF / EPUB) */}
      <div className="mb-6">
        <label className="block mb-3 text-sm font-semibold text-slate-200">
          📄 File Upload (PDF / EPUB)
        </label>
        <input
          type="file"
          accept=".pdf,.epub"
          onChange={actions.handleFileUpload}
          className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-sm text-slate-200 cursor-pointer file:cursor-pointer shadow-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#ff8500] file:text-white file:font-semibold hover:file:bg-[#ffa940] file:transition-colors"
        />
        {state.isExtractingPDF && (
          <div className="flex items-center gap-2 text-xs text-blue-400 mt-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Extracting text from file...
          </div>
        )}
        {state.error && (
          <div className="bg-red-200 text-red-700 text-xs rounded-lg p-3 mt-2 border border-red-400">
            <div className="font-semibold mb-1">{state.error.title}</div>
            <div className="leading-snug">{state.error.message}</div>
            <button
              onClick={() => actions.setError(null)}
              className="mt-2 px-2 py-0.5 rounded border border-red-700 text-red-700 text-xs font-medium hover:bg-red-700 hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>



      {/* Help Button */}
      <button
        onClick={actions.handleShowHelp}
        className="w-full py-3 rounded-xl border border-[#ff8500]/50 bg-[#ff8500]/10 text-[#ff8500] font-semibold flex items-center justify-center gap-2 mb-6 hover:bg-[#ff8500]/20 transition-colors shadow-sm"
        title="Get help and view tutorial"
      >
        ❓ Help & FAQ
      </button>

      {/* Model Selection */}
      <div className="mb-6">
        <ModelSelector
          selectedModel={state.model.selectedModel}
          onModelChange={actions.setSelectedModel}
          onDeviceChange={actions.setPreferredDevice}
          onDtypeChange={actions.setPreferredDtype}
          disabled={state.audio.isLoading}
        />
      </div>

      {/* Advanced Options (collapsed by default) */}
      <div className="mb-6">
        {/* Toggle */}
        <button
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="w-full py-3 rounded-lg border border-slate-600 text-slate-200 font-semibold flex items-center justify-center gap-2 hover:bg-slate-600/10 transition-colors"
          title="Technical and troubleshooting controls"
        >
          ⚙️ {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>

        {/* Collapsible content */}
        {showAdvanced && (
          <div className="pt-4 space-y-2">
            {/* Model Management */}
            <div className="space-y-2">
              <button
                onClick={async () => {
                  await actions.cleanupUnwantedModels();
                  alert('🧹 Cleaned up unwanted models. Only models you chose to keep are now cached.');
                }}
                className="w-full py-2 rounded-lg border border-green-600 text-green-600 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-green-600/10 transition-colors"
              >
                🧹 Cleanup Models
              </button>

              <button
                onClick={async () => {
                  const cacheInfo = await actions.getModelCacheSize();
                  alert(`Cache Status:\n📦 Total Size: ${cacheInfo.sizeFormatted}\n📁 Files: ${cacheInfo.fileCount}\n\nModels kept: ${Object.keys(state.model.modelKeepLocal).filter(id => state.model.modelKeepLocal[id]).length}`);
                }}
                className="w-full py-2 rounded-lg border border-slate-500 text-slate-500 text-xs font-medium flex items-center justify-center gap-1 hover:bg-slate-500/10 transition-colors"
              >
                📊 Cache Info
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
                className="w-full py-2 rounded-lg border border-red-600 text-red-600 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-600/10 transition-colors"
              >
                🔄 Reset All Models
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
              className="w-full py-2 rounded-lg border border-amber-500 text-amber-500 text-xs font-medium flex items-center justify-center gap-1 hover:bg-amber-500/10 transition-colors"
            >
              🔍 Debug Audio
            </button>

            {/* Audio Normalization */}
            <button
              onClick={actions.toggleNormalizeAudio}
              className={cn(
                'w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors',
                state.model.normalizeAudio
                  ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
                  : 'border-slate-500 text-slate-500 hover:bg-slate-500/10'
              )}
            >
              {state.model.normalizeAudio ? '✅' : '📢'} Audio Fix: {state.model.normalizeAudio ? 'ON' : 'OFF'}
            </button>

            {/* Google Drive Sync */}
            <button
              onClick={actions.linkGoogleDrive}
              className="w-full py-2 rounded-lg border border-sky-500 text-sky-500 text-xs font-medium flex items-center justify-center gap-1 hover:bg-sky-500/10 transition-colors"
            >
              {state.googleDriveLinked ? '☁️ Google Drive: Linked' : '☁️ Link Google Drive'}
            </button>
          </div>
        )}
      </div>
      
      {/* Spacer where error used to be */}
      
      {/* Donation Button */}
      <div className="mt-auto flex flex-col items-center gap-4">
        {/* Ko-fi donation button */}
        <KoFiButton username="Oronto" />

        {/* Sidebar Banner Ad */}
        <AdSenseBanner adSlot="5566778899" adFormat="rectangle" style={{ maxWidth: '280px' }} />
      </div>
    </div>
  );
};

export default Sidebar;