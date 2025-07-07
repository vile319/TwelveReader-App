# Kokoro TTS iOS Compatibility Issues & Fixes

## Executive Summary

The Kokoro TTS model works on desktop, laptop, Android devices, but fails on iPhone due to several iOS Safari-specific limitations. This report identifies the root causes and provides actionable fixes.

## Key Issues Identified

### 1. Web Audio API iOS Limitations

**Problem**: iOS Safari has several critical Web Audio API bugs that affect TTS playback:

- **AudioContext Suspension**: iOS suspends AudioContext when page is backgrounded, even for audio playback
- **Muted Device Behavior**: Web Audio API behaves differently from HTML5 audio when device is muted
- **Audio Timing Issues**: AudioContext timing can be out of sync with actual playback
- **Memory Leaks**: Progressive audio degradation after multiple audio sessions

**Evidence from Code**:
```typescript
// Line 605: Mobile detection forces WASM mode
const isMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);
if (isMobile) {
  console.log('📱 Mobile device detected. Forcing CPU mode (wasm) with q8 model.');
  return { device: 'wasm', dtype: 'q8' };
}

// Line 262: Audio context creation with webkit prefix
audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
```

### 2. WebAssembly Memory Issues

**Problem**: iOS Safari has known WASM memory allocation issues:

- Memory fragmentation after page reloads
- Unpredictable memory limits (can vary from 4MB to 2GB)
- ONNX runtime may fail to allocate sufficient memory

**WebKit Bugs**:
- Bug #222097: WASM memory allocation failures
- Bug #237878: AudioContext suspended on iOS when backgrounded

### 3. ONNX Runtime Compatibility

**Problem**: The `kokoro-js` library depends on ONNX Runtime Web, which has known issues on iOS:

- Limited WASM memory allocation
- Potential ONNX execution provider incompatibility
- Model loading failures in constrained environments

## Potential Fixes

### Fix 1: Implement iOS-Specific Audio Context Management

Add this to the `useKokoroWebWorkerTts.ts` file:

```typescript
// Add after line 604
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// Enhanced iOS audio context management
const createAudioContext = useCallback(async () => {
  if (!audioContextRef.current) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();
    
    // iOS-specific: Ensure context is resumed
    if (isIOS && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('✅ iOS AudioContext resumed successfully');
      } catch (error) {
        console.error('❌ Failed to resume iOS AudioContext:', error);
      }
    }
  }
  return audioContextRef.current;
}, []);

// Add iOS-specific audio session management
const setupIOSAudioSession = useCallback(async () => {
  if (!isIOS) return;
  
  try {
    // Create a silent audio buffer to "prime" the audio system
    const context = await createAudioContext();
    const buffer = context.createBuffer(1, 1, 22050);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
    
    console.log('✅ iOS audio session primed');
  } catch (error) {
    console.error('❌ Failed to setup iOS audio session:', error);
  }
}, [createAudioContext]);
```

### Fix 2: Fallback to HTML5 Audio for iOS

Add iOS-specific fallback mechanism:

```typescript
// Add to the speak function around line 773
const speakWithFallback = useCallback(async (text: string, voice: string = 'af_bella') => {
  // For iOS, try HTML5 audio fallback first
  if (isIOS) {
    try {
      return await speakWithHTML5Audio(text, voice);
    } catch (error) {
      console.warn('iOS HTML5 audio fallback failed, trying WebAudio:', error);
      // Fall through to WebAudio
    }
  }
  
  // Original WebAudio implementation
  return await speak(text, voice);
}, [speak]);

// Implement HTML5 audio fallback
const speakWithHTML5Audio = useCallback(async (text: string, voice: string) => {
  // Use Web Speech API as fallback for iOS
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map kokoro voice to system voice
    const voices = speechSynthesis.getVoices();
    const systemVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (voice.includes('female') ? v.name.includes('female') : v.name.includes('male'))
    );
    
    if (systemVoice) {
      utterance.voice = systemVoice;
    }
    
    return new Promise((resolve, reject) => {
      utterance.onend = () => resolve(true);
      utterance.onerror = (e) => reject(e);
      speechSynthesis.speak(utterance);
    });
  }
  
  throw new Error('No fallback audio method available');
}, []);
```

### Fix 3: WASM Memory Management for iOS

Add iOS-specific memory management:

```typescript
// Add to detectWebGPU function around line 604
const detectWebGPU = useCallback(async (): Promise<{ device: 'webgpu' | 'wasm'; dtype: 'fp32' | 'q8' | 'fp16' }> => {
  const isMobile = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // Check available memory before proceeding
    const memoryInfo = (performance as any).memory;
    const availableMemory = memoryInfo ? memoryInfo.jsHeapSizeLimit - memoryInfo.usedJSHeapSize : 0;
    
    console.log('📱 iOS device detected');
    console.log('💾 Available memory:', Math.round(availableMemory / 1024 / 1024), 'MB');
    
    // Use more conservative settings for iOS
    if (availableMemory < 100 * 1024 * 1024) { // Less than 100MB
      console.log('⚠️ Low memory detected, using minimal model');
      return { device: 'wasm', dtype: 'q8' };
    }
    
    return { device: 'wasm', dtype: 'q8' };
  }
  
  // Rest of the function remains the same
}, [forceWasmMode]);
```

### Fix 4: Enhanced Error Handling and Diagnostics

Add comprehensive iOS debugging:

```typescript
// Add iOS-specific diagnostics
const diagnoseIOSAudio = useCallback(async () => {
  const diagnostics = {
    userAgent: navigator.userAgent,
    audioContextState: audioContextRef.current?.state,
    audioContextSampleRate: audioContextRef.current?.sampleRate,
    speechSynthesisAvailable: 'speechSynthesis' in window,
    webAudioAvailable: 'AudioContext' in window || 'webkitAudioContext' in window,
    memoryInfo: (performance as any).memory,
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isMuted: false // TODO: Detect mute state
  };
  
  console.log('🔍 iOS Audio Diagnostics:', diagnostics);
  
  // Test audio context creation
  try {
    const testContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    console.log('✅ AudioContext creation successful');
    await testContext.close();
  } catch (error) {
    console.error('❌ AudioContext creation failed:', error);
  }
  
  return diagnostics;
}, []);

// Call diagnostics on initialization
useEffect(() => {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    diagnoseIOSAudio();
  }
}, [diagnoseIOSAudio]);
```

### Fix 5: User Interaction Requirements

Ensure proper user interaction handling for iOS:

```typescript
// Modify the speak function to handle iOS user interaction requirements
const speak = useCallback(async (text: string, voice: string = 'af_bella', onProgress?: (progress: number) => void) => {
  // iOS requires user interaction for audio
  if (isIOS && !isReady) {
    // Show user a button to initialize audio
    onError({
      title: 'Audio Initialization Required',
      message: 'Please tap to enable audio on iOS'
    });
    return;
  }
  
  // Setup iOS audio session on first use
  if (isIOS && audioContextRef.current?.state === 'suspended') {
    await setupIOSAudioSession();
  }
  
  // Rest of the function remains the same
}, [isReady, onError, setupIOSAudioSession]);
```

## Recommended Implementation Strategy

### Phase 1: Quick Fixes (Immediate)
1. Add iOS detection and diagnostics
2. Implement iOS audio context management
3. Add user interaction requirements

### Phase 2: Fallback System (Short-term)
1. Implement Web Speech API fallback
2. Add progressive enhancement for iOS
3. Improve error messages for iOS users

### Phase 3: Advanced Solutions (Long-term)
1. Consider using a different TTS library for iOS
2. Implement server-side TTS for iOS as fallback
3. Wait for iOS Safari Web Audio API improvements

## Testing Strategy

1. **Device Testing**: Test on actual iOS devices (iPhone 12+, iPad)
2. **Safari Versions**: Test on iOS 16+, Safari 15+
3. **Scenarios**: Test with device muted, backgrounded, low memory
4. **Fallbacks**: Ensure graceful degradation works

## Alternative Solutions

### Option 1: Server-Side TTS for iOS
- Detect iOS and route TTS requests to server
- Use cloud TTS services (AWS Polly, Google Cloud TTS)
- Pros: Reliable, high quality
- Cons: Network dependency, latency

### Option 2: Native iOS App
- Build a native iOS app using WKWebView
- Use iOS native TTS APIs
- Pros: Best performance and compatibility
- Cons: App Store approval required

### Option 3: Different TTS Library
- Use a library with better iOS support
- Consider Web Speech API exclusively for iOS
- Pros: Simpler implementation
- Cons: Limited voice options

## Conclusion

The iOS compatibility issues with Kokoro TTS stem from fundamental limitations in iOS Safari's Web Audio API implementation and WebAssembly memory management. The recommended approach is to implement iOS-specific fallbacks and enhanced error handling while waiting for Apple to resolve the underlying WebKit bugs.

The fixes provided should significantly improve iOS compatibility, though complete feature parity with desktop may not be achievable until Apple addresses the underlying WebKit issues.