import io
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import soundfile as sf
from kokoro import KPipeline

app = FastAPI(title="Kokoro TTS API")

# Allow requests from any origin (your Vercel frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Load the pipeline once at startup — reused for all requests
# 'a' = American English. Add more pipelines if you want other languages.
print("Loading Kokoro TTS pipeline...")
pipeline = KPipeline(lang_code='a')
print("Kokoro TTS pipeline ready!")


class TTSRequest(BaseModel):
    text: str
    voice: str = "af_bella"
    speed: float = 1.0


def analyze_audio(audio: np.ndarray):
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    rms = float(np.sqrt(np.mean(np.square(audio)))) if audio.size else 0.0
    zero_crossing_rate = float(np.mean(audio[:-1] * audio[1:] < 0)) if audio.size > 1 else 0.0
    invalid_samples = int(audio.size - np.count_nonzero(np.isfinite(audio)))

    suspicion = None
    if invalid_samples > 0:
        suspicion = f"contains {invalid_samples} invalid samples"
    elif peak < 1e-5:
        suspicion = "audio is effectively silent"
    elif peak > 0.98 and rms > 0.35 and zero_crossing_rate > 0.3:
        suspicion = "looks like broadband noise/static"

    return {
        "peak": peak,
        "rms": rms,
        "zero_crossing_rate": zero_crossing_rate,
        "invalid_samples": invalid_samples,
        "suspicion": suspicion,
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "Kokoro TTS API"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/tts")
async def tts(request: TTSRequest):
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text is required")

    if len(request.text) > 5000:
        raise HTTPException(status_code=400, detail="Text too long (max 5000 chars per request)")

    try:
        # Generate audio chunks from Kokoro
        audio_chunks = []
        for _gs, _ps, audio in pipeline(
            request.text,
            voice=request.voice,
            speed=request.speed
        ):
            audio_chunks.append(audio)

        if not audio_chunks:
            raise HTTPException(status_code=500, detail="No audio generated")

        # Combine all chunks into a single float32 array
        combined = np.concatenate(audio_chunks).astype(np.float32, copy=False)
        diagnostics = analyze_audio(combined)
        print(f"TTS diagnostics: {diagnostics}")

        if diagnostics["invalid_samples"] > 0:
            raise HTTPException(status_code=500, detail="Generated invalid audio samples")

        if diagnostics["peak"] > 1.0:
            combined = combined * (0.95 / diagnostics["peak"])
            diagnostics = analyze_audio(combined)
            print(f"TTS diagnostics after normalization: {diagnostics}")

        if diagnostics["suspicion"]:
            raise HTTPException(
                status_code=500,
                detail=f"Generated audio looks corrupted: {diagnostics['suspicion']}"
            )

        # Encode as WAV and return as a streaming binary response
        buf = io.BytesIO()
        sf.write(buf, combined, samplerate=24000, format="WAV", subtype="PCM_16")
        buf.seek(0)

        return StreamingResponse(
            buf,
            media_type="audio/wav",
            headers={"Content-Disposition": "attachment; filename=audio.wav"}
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"TTS Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
