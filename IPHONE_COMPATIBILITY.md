# iPhone Compatibility Improvements

This document describes the improvements made to ensure TwelveReader works properly on iPhone devices.

## Changes Made

### 1. ONNX Runtime Configuration for iOS
- **Added `onnxruntime-web@1.17.3`** - specific version known to work well with iOS
- **Created `utils/onnxIosConfig.ts`** - iOS-specific ONNX Runtime configuration
- **iOS-specific settings:**
  - `simd = false` - Disables SIMD instructions (problematic on iOS 16.4+)
  - `numThreads = 1` - Single-threaded execution for iOS stability
  - `debug = true` - Enhanced logging for troubleshooting
  - Uses CDN for WASM files to ensure compatibility

### 2. Execution Provider Optimization
- **WebGL preferred on iOS** - More stable than WASM backend
- **Quantized model (q8)** - Reduces memory usage on mobile devices
- **Automatic iOS detection** - Applies optimizations only when needed

### 3. Development Server Configuration
- **Added `host: true` to Vite config** - Allows iPhone to connect to dev server
- **Cross-origin headers maintained** - Ensures proper CORS for TTS functionality

## How to Test on iPhone

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Connect to iPhone:**
   - Find your computer's IP address (e.g., 192.168.1.100)
   - Open Safari on iPhone
   - Navigate to: `http://YOUR_IP:5173` (replace YOUR_IP with actual IP)

## What to Expect

- **Console messages on iOS:**
  - "📱 iOS detected - using optimized settings: wasm with q8 (for iPhone compatibility)"
  - "🔧 Configuring ONNX Runtime for iOS compatibility..."
  - "✅ ONNX Runtime configured for iOS compatibility"

- **Model loading:**
  - Will use quantized (q8) model for better memory efficiency
  - May take longer to load initially but should run stably
  - Audio generation should work without crashes

## Troubleshooting

If you still experience issues:

1. **Check console logs** - Look for error messages in Safari's developer console
2. **Clear browser cache** - Sometimes old WASM files can cause issues
3. **Try airplane mode toggle** - Can help reset network connectivity
4. **Check iOS version** - Works best on iOS 14+

## Technical Details

The implementation addresses known iOS Safari issues:
- **WASM-SIMD problems** on iOS 16.4+
- **Memory constraints** on mobile devices
- **WebGL stability** compared to WASM backend
- **Network accessibility** for local development

These changes ensure the Kokoro TTS 82M model runs reliably on iPhone while maintaining performance on other devices. 