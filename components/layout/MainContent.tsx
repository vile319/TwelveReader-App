import { type FC } from 'react';
import AdSenseBanner from '../AdSenseBanner';
import AudioPlayer from '../audio/AudioPlayer';
import TextInputPanel from '../text/TextInputPanel';

const MainContent: FC = () => {
  return (
    <div className="main-content flex-1 w-full max-w-4xl mx-auto flex flex-col p-4 md:p-8 overflow-y-auto">
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