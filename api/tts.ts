import type { VercelRequest, VercelResponse } from '@vercel/node';
import { KokoroTTS } from 'kokoro-js';

// Cache the TTS instance so Vercel can reuse it across warm invocations
// to save model loading time
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

        // Initialize KokoroTTS in 'node' (CPU) mode if not already initialized
        // or if the model failed to load previously
        if (!ttsInstance) {
            console.log('Initializing Kokoro TTS in Node (CPU) mode...');
            ttsInstance = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
                device: 'cpu' // Crucial: Force CPU for Vercel Serverless Function
            });
        }

        console.log(`Generating audio for text (length: ${text.length}), voice: ${voice}`);

        // Generate the audio
        const audioData = await ttsInstance.generate(text, {
            voice,
            speed
        });

        if (!audioData || !audioData.audio) {
            throw new Error('Audio generation failed');
        }

        // The audioData.audio is a Float32Array (PCM data). 
        // We need to convert it to a format the browser can easily play (like WAV)
        const wavBuffer = encodeWAV(audioData.audio, audioData.sampling_rate);

        // Send the WAV buffer back as an audio stream
        response.setHeader('Content-Type', 'audio/wav');
        response.setHeader('Content-Disposition', 'attachment; filename="audio.wav"');
        response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache on Vercel Edge

        return response.send(wavBuffer);

    } catch (error: any) {
        console.error('TTS API Error:', error);
        return response.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}

/**
 * Helper function to convert raw Float32Array PCM audio into a standard WAV buffer.
 * Kokoro JS returns raw PCM, but browsers expect a proper media format like WAV.
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Buffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    // Helper to write strings
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count (mono) */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    // Write PCM samples (convert Float32 -1.0..1.0 to Int16 -32768..32767)
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return Buffer.from(buffer);
}
