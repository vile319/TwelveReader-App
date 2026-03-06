import { type FC } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import AdSenseBanner from '../AdSenseBanner';
import KoFiButton from '../KoFiButton';
import ModelSelector from '../ModelSelector';
import { BRAND_NAME } from '../../utils/branding';

// Voice object coming from Kokoro hook
interface Voice {
  name: string;
  label: string;
}

const Sidebar: FC = () => {
  const { state, actions, tts } = useAppContext();
  const voices: Voice[] = tts.voices as Voice[];

  return (
    <div className="sidebar overflow-auto bg-slate-900 border-r border-slate-800 p-6 flex flex-col w-full md:w-80 md:fixed md:left-0 md:top-0 md:h-screen">
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
          {BRAND_NAME}
        </h1>
        <p className="text-sm text-gray-400 m-0">AI-powered reading</p>
      </div>

      {/* Status */}
      <div className="bg-slate-700 text-slate-200 text-sm rounded-lg p-3 mb-6">
        {state.model.isReady ? '✅ Ready to generate audio' : state.model.status}
      </div>

      {/* Voice Selection */}
      <div className="mb-6">
        <label className="block mb-3 text-sm font-semibold text-slate-200">
          🎭 Voice ({tts.voices.length} available)
        </label>
        <select
          value={state.selectedVoice}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => actions.setSelectedVoice(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-200 cursor-pointer file:cursor-pointer"
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
        className="w-full py-3 rounded-lg border border-blue-500 bg-blue-500/10 text-blue-500 font-semibold flex items-center justify-center gap-2 mb-6 hover:bg-blue-500/20 transition-colors"
        title="Get help and view tutorial"
      >
        ❓ Help &amp; FAQ
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

      {/* Google Drive Sync */}
      <div className="mb-6">
        <button
          onClick={actions.linkGoogleDrive}
          className="w-full py-3 rounded-lg border border-sky-500 text-sky-500 font-semibold flex items-center justify-center gap-2 hover:bg-sky-500/10 transition-colors"
        >
          {state.googleDriveLinked ? '☁️ Google Drive: Linked' : '☁️ Link Google Drive'}
        </button>
      </div>

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