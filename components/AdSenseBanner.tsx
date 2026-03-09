import { type FC, useEffect, useState, type CSSProperties } from 'react';

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only render ads if adsbygoogle script is present (i.e. on production with AdSense approved)
    const hasAdSense = typeof (window as any).adsbygoogle !== 'undefined' ||
      document.querySelector('script[src*="adsbygoogle"]') !== null;

    if (!hasAdSense) return; // Hide entirely on localhost or when AdSense blocked

    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
      setVisible(true);
    } catch (error) {
      // Silently fail — don't show a broken container
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`adsense-banner ${className}`}
      style={{
        textAlign: 'center',
        margin: '16px 0',
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