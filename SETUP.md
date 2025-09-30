# Setup Instructions

## Prerequisites

- Node.js 16+ and npm installed
- Modern web browser (Chrome, Firefox, Safari, or Edge)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will open automatically at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

## Features

- Simple text input with sample texts
- 8 AI voices (American & British accents)
- Audio playback controls (play/pause, skip ±15s)
- Progress bar with seek capability
- Download generated audio as WAV
- 100% browser-based, no server required
- Privacy-focused (all processing happens locally)

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling (via CDN)
- **Kokoro JS** - Text-to-speech engine

## Troubleshooting

### Dependencies not found
Run `npm install` to install all dependencies.

### Port already in use
Edit `vite.config.ts` to change the port number.

### Audio generation fails
Make sure you have a stable internet connection for the first load (to download the TTS model).

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires modern JavaScript support and Web Audio API.
