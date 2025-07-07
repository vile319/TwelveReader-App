// BuyMeACoffeeButton component
import React, { type FC } from 'react';

interface BuyMeACoffeeButtonProps {
  /**
   * Either the full URL to your Buy Me A Coffee page OR just your username.
   * If you pass only a username (e.g. "johnDoe"), the component will
   * automatically create the link `https://www.buymeacoffee.com/johnDoe`.
   * If omitted, it will try to use the environment variable
   * `VITE_BMC_USERNAME` at build-time. This makes it easy to configure
   * without touching the source code.
   */
  linkOrUsername?: string;
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
const BuyMeACoffeeButton: FC<BuyMeACoffeeButtonProps> = ({ linkOrUsername, label = 'Buy me a coffee', style }: BuyMeACoffeeButtonProps) => {
  // Derive the link.
  // Note: Vite adds `import.meta.env` at build-time. Cast to any to satisfy TypeScript without the vite/client types.
  const envUsername = (import.meta as any).env?.VITE_BMC_USERNAME as string | undefined;
  const derivedLink = linkOrUsername
    ? linkOrUsername.startsWith('http')
      ? linkOrUsername
      : `https://www.buymeacoffee.com/${linkOrUsername}`
    : envUsername
      ? `https://www.buymeacoffee.com/${envUsername}`
      : undefined;

  if (!derivedLink) {
    // If no link available, don't render anything (dev reminder in console)
    if (import.meta.env.DEV) {
      console.warn('BuyMeACoffeeButton: No link or username provided. Set VITE_BMC_USERNAME or pass linkOrUsername prop.');
    }
    return null;
  }

  return (
    <a
      href={derivedLink}
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