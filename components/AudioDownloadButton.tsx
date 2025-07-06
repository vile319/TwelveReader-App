import React from 'react';

interface AudioDownloadButtonProps {
  audioBuffer: Float32Array | null;
  sampleRate: number;
  filename?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const AudioDownloadButton: React.FC<AudioDownloadButtonProps> = ({ 
  audioBuffer, 
  sampleRate = 24000, 
  filename = 'generated-audio.wav',
  disabled = false,
  style = {}
}) => {
  const downloadAudio = () => {
    if (!audioBuffer || audioBuffer.length === 0) {
      console.error('No audio data available for download');
      return;
    }

    try {
      // Create WAV file from Float32Array
      const wavBuffer = createWAVFile(audioBuffer, sampleRate);
      
      // Create blob and download
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the URL
      URL.revokeObjectURL(url);
      
      console.log('✅ Audio downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading audio:', error);
    }
  };

  // Create WAV file buffer from Float32Array
  const createWAVFile = (audioData: Float32Array, sampleRate: number): ArrayBuffer => {
    const length = audioData.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    // RIFF header
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    
    // fmt chunk
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    
    // data chunk
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float32 to int16 and write to buffer
    const offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset + i * 2, sample * 0x7FFF, true);
    }
    
    return buffer;
  };

  const isDisabled = disabled || !audioBuffer || audioBuffer.length === 0;

  return (
    <button
      onClick={downloadAudio}
      disabled={isDisabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: isDisabled ? '#374151' : '#10b981',
        border: 'none',
        borderRadius: '8px',
        color: isDisabled ? '#6b7280' : 'white',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.backgroundColor = '#059669';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.backgroundColor = '#10b981';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
      title={isDisabled ? 'No audio generated yet' : 'Download generated audio as WAV file'}
    >
      <span style={{ fontSize: '16px' }}>📁</span>
      Download Audio
    </button>
  );
};

export default AudioDownloadButton; 