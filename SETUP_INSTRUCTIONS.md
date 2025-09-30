# VerbaReader Setup Instructions

## 🚀 Quick Start

VerbaReader is now a **state-of-the-art audiobook/EPUB reader** with intelligent device detection and Google Drive integration.

### Key Features

✨ **Smart Model Selection** - Automatically selects the best TTS model for your device
- **iPhones/iPads**: KittenTTS (25MB, guaranteed compatibility)
- **Desktop with WebGPU**: Kokoro FP32 (310MB, highest quality)
- **Desktop without WebGPU**: Kokoro Q8 (82MB, balanced quality)
- **Android Mobile**: Kokoro Q8 (optimized for mobile)

📚 **EPUB & PDF Support** - Full text extraction with chapter detection

🎧 **High-Quality TTS** - 65+ international voices with word-level highlighting

☁️ **Google Drive Sync** - Save and load processed audiobooks to/from Google Drive

🎯 **Audible-like Experience** - Library management, progress tracking, seamless playback

---

## 🔧 Setup Google Drive Integration (Optional)

To enable Google Drive sync for audiobooks, you'll need to set up Google Cloud credentials:

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Drive API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure consent screen (if not done already):
   - User Type: External (for testing)
   - App name: "VerbaReader"
   - Add your email as test user
4. Application type: **Web application**
5. Authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - Your production domain (e.g., `https://verbareader.com`)
6. Authorized redirect URIs:
   - `http://localhost:5173` (for development)
   - Your production domain
7. Click "Create"
8. Copy the **Client ID**

### Step 3: (Optional) Create an API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the **API Key**
4. Restrict the key to Google Drive API (recommended)

### Step 4: Update Configuration

Edit `/workspace/utils/googleDrive.ts`:

```typescript
const CLIENT_ID = 'YOUR_GOOGLE_DRIVE_CLIENT_ID.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY'; // Optional
```

Replace:
- `YOUR_GOOGLE_DRIVE_CLIENT_ID` with your OAuth Client ID
- `YOUR_API_KEY` with your API Key (optional, for higher quota)

---

## 📱 Device-Specific Behavior

### iPhone/iPad
- **Automatic model**: KittenTTS (25MB)
- **Why**: Kokoro models have known compatibility issues with iOS Safari
- **Quality**: Good quality, fast inference, works reliably
- **Note**: You can manually switch to Kokoro, but it may not work

### Desktop with WebGPU
- **Automatic model**: Kokoro FP32 (310MB)
- **Why**: Best quality, GPU-accelerated
- **Requirements**: Chrome 113+, Edge 113+, or compatible browser
- **Fallback**: If WebGPU fails, automatically falls back to Kokoro Q8 on WASM

### Desktop without WebGPU
- **Automatic model**: Kokoro Q8 (82MB)
- **Why**: Balanced quality and performance on CPU
- **Browsers**: Firefox, Safari, older Chrome

### Android
- **Automatic model**: Kokoro Q8 (82MB)
- **Why**: Good quality, works well on mobile CPUs
- **Note**: Kokoro is more reliable on Android than iOS

---

## 🎯 How It Works

1. **Device Detection** (automatic on first load):
   ```
   🔍 Detecting device capabilities...
   📱 Device detected: iPhone (Safari) - 4 cores
   🎯 Recommended model: kitten
   ✨ Auto-selecting model: kitten-nano
   ```

2. **Model Download** (first time only):
   - Model is downloaded and cached in browser
   - Subsequent visits load instantly from cache
   - Models persist between sessions (if enabled)

3. **Audio Generation**:
   - Upload EPUB/PDF or paste text
   - Select voice (65+ options)
   - Click "Generate Audio"
   - Audio streams as it generates
   - Full scrubbing support when complete

4. **Google Drive Sync** (if configured):
   - Click "Link Google Drive" in sidebar
   - Authorize the app
   - Save audiobooks with one click
   - Load saved audiobooks from any device
   - Progress tracking and resumption

---

## 💾 Storage

### Local Storage
- **Text Library**: Up to ~4.5MB of text/metadata
- **Model Cache**: 25MB - 310MB depending on model
- **Progress Tracking**: Resume where you left off

### Google Drive Storage
- **Audiobooks**: Audio files + metadata + word timings
- **Sync**: Automatic sync across devices
- **Unlimited**: No size limits (uses your Google Drive quota)

---

## 🎨 User Interface

### Sidebar
- 🎤 Voice selection (65+ voices)
- 🤖 Model selection (auto or manual)
- 📚 Text library
- ☁️ Google Drive link
- ⚙️ Settings

### Main Area
- 📝 Text input / EPUB/PDF upload
- 🎵 Audio player with scrubbing
- 📊 Word-level highlighting
- ⏯️ Play/pause, skip, speed control

### Library View
- 📚 Saved audiobooks grid
- 🖼️ Cover images (auto-generated)
- 📈 Progress indicators
- 🔄 Sync status

---

## 🐛 Troubleshooting

### "Model failed to load"
- **Solution**: Clear browser cache and reload
- **iPhone**: Try refreshing the page
- **Desktop**: Check if WebGPU is enabled in browser settings

### "Audio quality is poor"
- **Solution**: Try a different model (FP32 > FP16 > Q8 > Q4)
- **iPhone**: KittenTTS is the best option for iOS
- **Desktop**: Use FP32 with WebGPU for best quality

### "Google Drive not working"
- **Solution**: Check CLIENT_ID in `googleDrive.ts`
- Make sure app is in "Testing" mode in Google Cloud Console
- Add your email as a test user
- Check browser console for detailed errors

### "Out of memory"
- **Solution**: Use a smaller model (Q8 or Q4)
- **iPhone**: KittenTTS is already optimized
- **Desktop**: Close other tabs, try Q8 model

---

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📄 License

This project uses:
- **Kokoro TTS** (82M parameters) - Apache 2.0 License
- **KittenTTS** (15M parameters) - MIT License
- **React** - MIT License
- **ONNX Runtime** - MIT License

---

## 🙏 Credits

- Kokoro TTS by [hexgrad](https://huggingface.co/hexgrad/Kokoro-82M)
- KittenTTS by [KittenML](https://github.com/KittenML/KittenTTS)
- ONNX models hosted on Hugging Face
- PDF.js by Mozilla
- Tailwind CSS by Tailwind Labs

---

## 🌟 Future Enhancements

- [ ] MP3 export (currently WAV only)
- [ ] Multiple languages for KittenTTS
- [ ] Book cover AI generation
- [ ] Speed dial presets
- [ ] Chapter navigation for EPUB
- [ ] Audiobook sharing
- [ ] Offline PWA mode

---

**Need help?** Open an issue on GitHub or check the console logs for detailed diagnostics.
