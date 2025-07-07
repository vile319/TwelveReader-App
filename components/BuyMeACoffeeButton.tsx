// BuyMeACoffeeButton component
import React, { type FC } from 'react';

interface BuyMeACoffeeButtonProps {
  /**
   * The full URL to your Buy Me A Coffee page, e.g. "https://www.buymeacoffee.com/myusername".
   */
  link: string;
  /**
   * Optional custom label (defaults to "Buy me a coffee").
   */
  label?: string;
  /**
   * Override for inline style if you need to tweak spacing / sizing.
   */
  style?: React.CSSProperties;
}

/**
 * Lightweight wrapper around the **Buy Me A Coffee** donation button.
 *
 * Uses the official button image so it works even without JavaScript enabled.
 */
const BuyMeACoffeeButton: FC<BuyMeACoffeeButtonProps> = ({ link, label = 'Buy me a coffee', style }: BuyMeACoffeeButtonProps) => {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      style={{ display: 'inline-block', ...style }}
    >
      {/* Official BMC button image (yellow) – 217×60px */}
      <img
        src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
        alt={label}
        style={{ height: '60px', width: '217px', borderRadius: '8px' }}
      />
    </a>
  );
};

export default BuyMeACoffeeButton;