# TwelveReader 📚

**AI-Powered Reading Assistant**

Transform any text into natural speech with advanced AI voices. Perfect for studying, accessibility, language learning, or simply enjoying content hands-free.

---

## ✨ Features

### 🎧 **Advanced Text-to-Speech**
- **65+ International AI Voices** - American, British, European, Hindi, Italian, Japanese, Portuguese, Chinese, and French accents
- **Word-Level Highlighting** - Follow along as each word is spoken with precise synchronization
- **Smart Audio Controls** - Play, pause, skip 15s forward/backward, and click-to-seek
- **High-Quality Export** - Download generated speech as WAV files

### 📄 **Document Support**
- **Text Input** - Type, paste, or edit text directly
- **PDF Upload** - Automatic text extraction from PDF documents
- **Sample Texts** - Quick-start templates for testing voices

### 🔒 **Privacy-First Design**
- **100% Offline** - All processing happens locally in your browser
- **No Data Collection** - Your text and audio never leave your device
- **No Account Required** - Start reading immediately, no sign-up needed

### 🎨 **Modern Interface**
- **Dark Mode** - Beautiful, eye-friendly interface
- **Responsive Design** - Works perfectly on desktop and mobile
- **Intuitive Controls** - Clean, accessible user interface
- **Guided Onboarding** - Step-by-step tutorial for new users

---

## 🚀 Quick Start

1. **Open TwelveReader** in your modern browser (Chrome, Firefox, Safari, Edge)
2. **Add Your Text**:
   - Type or paste text into the input area, OR
   - Upload a PDF file for automatic text extraction
3. **Choose a Voice** from 65+ available options
4. **Click "Generate Audio"** to create speech
5. **Use Audio Controls** to play, pause, seek, and follow along with highlighting

### 🎯 **First Time?**
Take the **guided tour** that appears on your first visit, or click "Help & FAQ" anytime for assistance.

---

## 🛠️ Technical Details

### **Built With**
- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Kokoro AI** - Advanced neural voice synthesis
- **PDF.js** - Client-side PDF processing
- **Tailwind CSS** - Utility-first styling
- **Vite** - Lightning-fast build tool

### **Browser Requirements**
- **Modern Browser** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **WebGPU Support** - For optimal performance (automatic fallback to WebAssembly)
- **150MB+ Available Space** - For model caching

### **Performance**
- **Model Size**: ~100MB (downloaded once, cached locally)
- **Generation Speed**: Varies by device (WebGPU > WASM)
- **Audio Quality**: 24kHz, neural synthesis

---

## 🎓 Use Cases

### **Students & Researchers**
- Study while walking, exercising, or commuting
- Process academic papers and textbooks
- Improve focus and retention through multi-sensory learning

### **Accessibility**
- Support for visual impairments
- Reading difficulties and dyslexia assistance
- Fatigue reduction for extended reading sessions

### **Language Learners**
- Pronunciation examples with multiple accents
- Listen while reading for better comprehension
- Practice with authentic voice patterns

### **Content Consumption**
- Convert articles, emails, and documents to audio
- Multitask while consuming written content
- Enjoy books and stories in audio format

---

## 🔧 Development

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

### **Project Structure**
```
src/
├── components/          # React components
│   ├── layout/         # Layout components
│   ├── audio/          # Audio-related components
│   ├── text/           # Text input/display components
│   └── modals/         # Modal dialogs
├── contexts/           # React Context for state management
├── hooks/              # Custom React hooks
└── types.ts           # TypeScript type definitions
```

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- Code style and standards
- Pull request process
- Issue reporting
- Feature requests

---

## 📄 Privacy & Security

### **Data Handling**
- **No Server Communication** - All processing is local
- **No Analytics Tracking** - We don't collect usage data
- **No Account System** - No personal information required
- **Local Storage Only** - Preferences saved in your browser

### **Model Information**
- **Kokoro AI Models** - Sourced from Hugging Face
- **Model Licensing** - Open source and research-friendly
- **Local Execution** - Models run entirely in your browser

---

## 🆘 Support

### **Getting Help**
1. **In-App Help** - Click "Help & FAQ" in the sidebar
2. **Guided Tutorial** - Retake the onboarding tour anytime
3. **Troubleshooting** - Built-in diagnostic tools

### **Common Issues**
- **Slow Performance** - Enable WebGPU in browser settings
- **Audio Quality** - Try the "Audio Fix" toggle for scaling issues
- **PDF Problems** - Ensure PDF contains selectable text (not scanned images)
- **Model Issues** - Use "Reset Model" to clear cache and re-download

---

## 📊 Statistics

- **🎭 65+ Voices** across 9 language families
- **📱 Mobile-Friendly** responsive design
- **⚡ WebGPU Accelerated** for compatible devices
- **🔒 100% Private** - no data leaves your device
- **📚 Unlimited Usage** - no restrictions or quotas

---

## �️ Model Selection

The app now supports advanced model selection with multiple configurations:

### Available Models
- **Kokoro 82M (FP32)** - 310MB - Highest quality, GPU optimized
- **Kokoro 82M (FP16)** - 156MB - High quality, smaller size
- **Kokoro 82M (Q8)** - 82MB - Balanced quality and performance
- **Kokoro 82M (Q4)** - 291MB - Maximum speed, minimal memory
- **Kokoro 82M (Q4F16)** - 147MB - Fast with better quality than Q4

### Device Selection
- **GPU (WebGPU)** - Fastest processing when available
- **CPU (WASM)** - Works on all devices
- **CPU (Native)** - Fallback option

### Features
- **Auto-select** - Automatically chooses the best model for your device
- **Manual selection** - Choose specific model and device combinations
- **Download persistence** - Keep models cached for faster loading
- **GPU detection** - Automatically detects WebGPU availability
- **Model caching** - Shows which models are already downloaded

### Model Sizes
All model sizes are accurate and sourced from the official Hugging Face ONNX repository:
- FP32: 310MB (full precision)
- FP16: 156MB (half precision)
- Q8: 82MB (8-bit quantized)
- Q4: 291MB (4-bit quantized)
- Q4F16: 147MB (4-bit with FP16 fallback)

---

## �🏆 Why TwelveReader?

| Feature | TwelveReader | Traditional TTS | Online Services |
|---------|--------------|-----------------|-----------------|
| **Privacy** | ✅ 100% Local | ✅ Local | ❌ Server-based |
| **Voice Quality** | ✅ Neural AI | ❌ Robotic | ✅ High Quality |
| **Offline Usage** | ✅ Yes | ✅ Yes | ❌ Internet Required |
| **Voice Variety** | ✅ 65+ Voices | ❌ Few Options | ✅ Many Voices |
| **Word Highlighting** | ✅ Precise | ❌ None | ❌ Limited |
| **No Cost** | ✅ Free | ✅ Free | ❌ Often Paid |
| **No Limits** | ✅ Unlimited | ✅ Unlimited | ❌ Usage Limits |

---

**Made with ❤️ for accessible, private, and powerful text-to-speech.**
