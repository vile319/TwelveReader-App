import { type FC } from 'react';

interface KoFiButtonProps {
  /** Ko-fi username (without https://ko-fi.com) */
  username: string;
  /** Optional custom label */
  label?: string;
  style?: React.CSSProperties;
}

/**
 * Simple Ko-fi donation button using the official Ko-fi image.
 */
const KoFiButton: FC<KoFiButtonProps> = ({ username, label = 'Support me on Ko-fi', style }) => {
  const link = `https://ko-fi.com/${username}`;

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      style={{ display: 'inline-block', ...style }}
    >
      {/* Official Ko-fi donate button (blue) */}
      <img
        src="https://ko-fi.com/img/githubbutton_sm.svg"
        alt={label}
        style={{ height: '36px', width: '144px' }}
      />
    </a>
  );
};

export default KoFiButton;