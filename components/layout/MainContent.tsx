import React from 'react';
import AdSenseBanner from '../AdSenseBanner';
import AudioPlayer from '../audio/AudioPlayer';
import TextInputPanel from '../text/TextInputPanel';

const MainContent: React.FC = () => {
  return (
    <div className="main-content" style={{
      // margin-left and height are handled responsively via the .main-content rules in App.tsx
      display: 'flex',
      flexDirection: 'column',
      padding: '24px'
    }}>
      {/* Top Banner Ad */}
      <AdSenseBanner 
        adSlot="1234567890" 
        adFormat="horizontal"
        style={{ marginBottom: '16px' }}
      />
      
      {/* Audio Player */}
      <AudioPlayer />
      
      {/* Text Input Panel */}
      <TextInputPanel />

      {/* Bottom Banner Ad */}
      <AdSenseBanner 
        adSlot="0987654321" 
        adFormat="horizontal"
        style={{ marginTop: '16px' }}
      />
    </div>
  );
};

export default MainContent;