import { type FC, type ChangeEvent, type FocusEvent } from 'react';

interface KokoroVoice {
  name: string;
  label: string;
  nationality: string;
  gender: string;
}

interface KokoroVoiceSelectorProps {
  voices: KokoroVoice[];
  selectedVoice: string;
  onVoiceChange: (voiceName: string) => void;
  disabled: boolean;
}

const KokoroVoiceSelector: FC<KokoroVoiceSelectorProps> = ({ 
  voices, 
  selectedVoice, 
  onVoiceChange, 
  disabled
}) => {
  const handleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedName = event.target.value;
    onVoiceChange(selectedName);
  };

  // Group voices by nationality for better organization
  const groupedVoices = voices.reduce((groups, voice) => {
    const nationality = voice.nationality;
    if (!groups[nationality]) {
      groups[nationality] = [];
    }
    groups[nationality].push(voice);
    return groups;
  }, {} as Record<string, KokoroVoice[]>);

  return (
    <div style={{ marginBottom: '24px' }}>
      <label 
        htmlFor="kokoro-voice-selector" 
        style={{ 
          display: 'block', 
          fontSize: '14px', 
          fontWeight: '500', 
          color: '#4a5568',
          marginBottom: '8px'
        }}
      >
        Choose a Kokoro AI Voice ({voices.length} international voices)
      </label>
      <select
        id="kokoro-voice-selector"
        value={selectedVoice}
        onChange={handleSelect}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px',
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          backgroundColor: disabled ? '#f7fafc' : 'white',
          color: disabled ? '#a0aec0' : '#2d3748',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          transition: 'border-color 0.2s ease',
          outline: 'none'
        }}
        onFocus={(e: FocusEvent<HTMLSelectElement>) => {
          if (!disabled) {
            e.target.style.borderColor = '#3182ce';
            e.target.style.boxShadow = '0 0 0 3px rgba(49, 130, 206, 0.1)';
          }
        }}
        onBlur={(e: FocusEvent<HTMLSelectElement>) => {
          e.target.style.borderColor = '#e1e5e9';
          e.target.style.boxShadow = 'none';
        }}
      >
        {voices.length === 0 && <option>Loading Kokoro voices...</option>}
        
        {/* Render voices grouped by nationality */}
        {Object.entries(groupedVoices)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([nationality, nationalityVoices]) => (
            <optgroup key={nationality} label={`${nationality} (${nationalityVoices.length})`}>
              {nationalityVoices
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.label}
                  </option>
                ))}
            </optgroup>
          ))}
      </select>
      
      {/* Voice preview info */}
      {selectedVoice && voices.length > 0 && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: '#f7fafc',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#4a5568'
        }}>
          {(() => {
            const currentVoice = voices.find(v => v.name === selectedVoice);
            return currentVoice ? (
              <>
                <strong>{currentVoice.gender}</strong> • {currentVoice.nationality} • 
                High-quality neural voice synthesis
              </>
            ) : 'Voice information loading...';
          })()}
        </div>
      )}
    </div>
  );
};

export default KokoroVoiceSelector; 