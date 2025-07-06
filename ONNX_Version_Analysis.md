# ONNX Version Analysis for TwelveReader

## Project Overview
TwelveReader is a React-based AI-powered reading application that uses Kokoro TTS (Text-to-Speech) for audio generation. The project leverages ONNX Runtime for running machine learning models in the browser.

## ONNX Runtime Versions Used

Based on the `package-lock.json` analysis, TwelveReader uses the following ONNX Runtime versions:

### Primary Dependencies
- **onnxruntime-node**: `1.21.0`
- **onnxruntime-web**: `1.22.0-dev.20250409-89f8206ba4` (development version)
- **onnxruntime-common**: Both `1.21.0` and `1.22.0-dev.20250409-89f8206ba4`

### Dependencies Source
These ONNX Runtime packages are installed as dependencies of the `@huggingface/transformers` library, which is used by the `kokoro-js` library (v1.2.1) that TwelveReader depends on.

## Model Information

### Model Used
- **Model**: `onnx-community/Kokoro-82M-v1.0-ONNX`
- **Source**: Hugging Face Model Hub
- **Parameters**: 82 million parameters
- **Type**: Text-to-Speech (TTS) model

### Available Model Formats
The Kokoro model supports multiple quantization formats with different file sizes and performance characteristics:

| Model File | Precision | Size (MB) | Description |
|------------|-----------|-----------|-------------|
| `model.onnx` | fp32 | 326 | Full precision (default) |
| `model_fp16.onnx` | fp16 | 163 | Half precision |
| `model_quantized.onnx` | 8-bit | 92.4 | 8-bit quantization |
| `model_q8f16.onnx` | Mixed | 86 | Mixed precision (8-bit + fp16) |
| `model_uint8.onnx` | 8-bit + Mixed | 177 | 8-bit unsigned + mixed precision |
| `model_uint8f16.onnx` | Mixed | 114 | Mixed precision variant |
| `model_q4.onnx` | 4-bit | 305 | 4-bit matrix multiplication |
| `model_q4f16.onnx` | 4-bit + fp16 | 154 | 4-bit matmul + fp16 weights |

## Model Configuration in TwelveReader

### Default Configuration
The project uses dynamic model configuration based on device capabilities:

```javascript
// WebGPU (GPU) configuration
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
  dtype: 'fp32',  // or 'fp16'
  device: 'webgpu'
});

// CPU fallback configuration
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
  dtype: 'q8',    // 8-bit quantization for CPU
  device: 'wasm'
});
```

### Device Detection
The application automatically detects device capabilities:
- **WebGPU support**: Uses `fp32` or `fp16` precision
- **CPU fallback**: Uses `q8` (8-bit quantization) for better performance

## Performance Characteristics

### Quantization Impact
- **Full precision (fp32)**: Best quality, largest size, slowest inference
- **Half precision (fp16)**: Good quality, ~50% size reduction, faster inference
- **8-bit quantization (q8)**: Reasonable quality, ~75% size reduction, significant speed improvement
- **4-bit quantization (q4)**: Lower quality, variable size reduction, fastest inference

### Device Optimization
- **WebGPU**: Recommended for fp32/fp16 models with GPU acceleration
- **CPU/WASM**: Recommended for quantized models (q8, q4) for better performance

## Browser Compatibility

### ONNX Runtime Web Version
The project uses ONNX Runtime Web v1.22.0-dev which supports:
- WebGPU execution provider (experimental)
- WebAssembly (WASM) execution provider
- Browser cache optimization

### Supported Browsers
- Chrome/Edge: Full WebGPU support
- Firefox: WASM support
- Safari: WASM support with some limitations

## Conclusion

TwelveReader uses **ONNX Runtime v1.21.0/v1.22.0-dev** with the **Kokoro-82M-v1.0-ONNX** model. The model format selection depends on the target device:
- **GPU devices**: Uses `model.onnx` (fp32) or `model_fp16.onnx` (fp16)
- **CPU devices**: Uses `model_quantized.onnx` (q8) for optimal performance

The application intelligently selects the appropriate model format and device configuration to balance quality and performance based on the user's hardware capabilities.