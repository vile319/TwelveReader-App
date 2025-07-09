import { type FC, useState, useEffect, type MouseEvent } from 'react';

interface AdSensePopupProps {
  adSlot: string;
  showInterval?: number; // minutes
  onClose?: () => void;
}

const AdSensePopup: FC<AdSensePopupProps> = ({ 
  adSlot, 
  showInterval = 15, // Show every 15 minutes
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShownOnce, setHasShownOnce] = useState(false);

  useEffect(() => {
    const checkAndShowAd = () => {
      // Only show if user has interacted with the app
      if (!hasShownOnce) {
        setHasShownOnce(true);
        return;
      }

      // Show the popup
      setIsVisible(true);
      
      // Auto-close after 10 seconds
      const autoCloseTimer = setTimeout(() => {
        setIsVisible(false);
      }, 10000);

      return () => clearTimeout(autoCloseTimer);
    };

    // Initial delay before first popup (5 minutes)
    const initialTimer = setTimeout(() => {
      checkAndShowAd();
    }, 5 * 60 * 1000);

    // Recurring timer
    const recurringTimer = setInterval(checkAndShowAd, showInterval * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringTimer);
    };
  }, [showInterval, hasShownOnce]);

  useEffect(() => {
    if (isVisible) {
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
      } catch (error) {
        console.error('AdSense popup error:', error);
      }
    }
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        backgroundColor: '#1a1e26',
        border: '1px solid #2d3748',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
        maxWidth: '320px',
        animation: 'slideIn 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <span style={{
          fontSize: '12px',
          color: '#a0a0a0',
          fontWeight: '500'
        }}>
          Sponsored
        </span>
        <button
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#a0a0a0',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = '#2d3748';
            e.currentTarget.style.color = '#e5e5e5';
          }}
          onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#a0a0a0';
          }}
        >
          ×
        </button>
      </div>
      
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7907977784876827"
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSensePopup; 