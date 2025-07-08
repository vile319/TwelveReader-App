import { type FC, useEffect, type CSSProperties } from 'react';

interface AdSenseBannerProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  style?: CSSProperties;
  className?: string;
}

const AdSenseBanner: FC<AdSenseBannerProps> = ({ 
  adSlot, 
  adFormat = 'auto', 
  style = {},
  className = ''
}) => {
  useEffect(() => {
    try {
      // Load the ad
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <div 
      className={`adsense-banner ${className}`}
      style={{
        textAlign: 'center',
        margin: '16px 0',
        padding: '8px',
        backgroundColor: '#1a1e26',
        borderRadius: '8px',
        border: '1px solid #2d3748',
        ...style
      }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7907977784876827"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSenseBanner; 