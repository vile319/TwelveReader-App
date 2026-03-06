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
        combined = np.concatenate(audio_chunks)

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
