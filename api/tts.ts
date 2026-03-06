import type { VercelRequest, VercelResponse } from '@vercel/node';

// === CRITICAL: Force onnxruntime-web (WASM) instead of onnxruntime-node ===
// onnxruntime-node includes native binaries for Windows + macOS + Linux (~220MB total)
// which exceeds Vercel's 250MB function limit.
// onnxruntime-web (WASM-based) is only ~30MB and works fine in Node.js too.
// We set this env var BEFORE importing kokoro-js so transformers.js picks it up.
process.env.TRANSFORMERS_JS_BACKEND = 'wasm';

import { KokoroTTS } from 'kokoro-js';
import * as ort from 'onnxruntime-web';

// Point ort to load WASM files from the built-in node_modules path
// (no CDN dependency needed in serverless)
ort.env.wasm.numThreads = 1; // Single thread — serverless environment

// Cache the TTS instance so Vercel can reuse it across warm invocations
let ttsInstance: KokoroTTS | null = null;

export default async function handler(
    request: VercelRequest,
    response: VercelResponse
) {
    // Only accept POST requests
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { text, voice = 'af_bella', speed = 1.0 } = request.body;

        if (!text || typeof text !== 'string') {
            return response.status(400).json({ error: 'Text is required' });
        }

        if (!ttsInstance) {
            console.log('Initializing Kokoro TTS with WASM (onnxruntime-web) backend...');
            // Use q8 → model_quantized.onnx (92.4MB) — pure 8-bit, WASM-compatible
            // q8f16 (86MB) has fp16 components which WASM can't run, so q8 is the right choice
            // Model is downloaded from HuggingFace at runtime, NOT bundled into the function
            ttsInstance = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
                device: 'wasm', // Force WASM — avoids pulling in onnxruntime-node
                dtype: 'q8'
            });
        }

        console.log(`Generating audio for text (length: ${text.length}), voice: ${voice}`);

        const audioData = await ttsInstance.generate(text, {
            voice,
            speed
        });

        if (!audioData || !audioData.audio) {
            throw new Error('Audio generation failed');
        }

        const wavBuffer = encodeWAV(audioData.audio, audioData.sampling_rate);

        response.setHeader('Content-Type', 'audio/wav');
        response.setHeader('Content-Disposition', 'attachment; filename="audio.wav"');
        response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

        return response.send(wavBuffer);

    } catch (error: any) {
        console.error('TTS API Error:', error);
        return response.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Convert raw Float32Array PCM audio into a standard WAV buffer.
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Buffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return Buffer.from(buffer);
}
