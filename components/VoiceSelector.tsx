import React from 'react';

interface Voice {
  id: string;
  label: string;
  gender: string;
  accent: string;
}

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoice: string;
  onVoiceChange: (voiceId: string) => void;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ voices, selectedVoice, onVoiceChange }) => {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h3 className="font-semibold mb-4 text-lg">🎤 Select Voice</h3>
      
      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {voices.map((voice) => (
          <button
            key={voice.id}
            onClick={() => onVoiceChange(voice.id)}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
              selectedVoice === voice.id
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }`}
          >
            <div className="font-medium">{voice.label}</div>
            <div className="text-xs opacity-75 mt-1">
              {voice.accent} • {voice.gender}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VoiceSelector;
