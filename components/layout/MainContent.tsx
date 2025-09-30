import { type FC } from 'react';
import AdSenseBanner from '../AdSenseBanner';
import AudioPlayer from '../audio/AudioPlayer';
import TextInputPanel from '../text/TextInputPanel';

const MainContent: FC = () => {
  return (
    <div className="main-content flex-1 w-full flex flex-col p-8 md:ml-80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
      {/* Top Banner Ad */}
      <AdSenseBanner 
        adSlot="1234567890" 
        adFormat="horizontal"
        style={{ marginBottom: '24px' }}
      />
      
      {/* Audio Player */}
      <AudioPlayer />
      
      {/* Text Input Panel */}
      <TextInputPanel />

      {/* Bottom Banner Ad */}
      <AdSenseBanner 
        adSlot="0987654321" 
        adFormat="horizontal"
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default MainContent;
