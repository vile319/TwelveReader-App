---
title: Kokoro TTS API
emoji: 🎙️
colorFrom: purple
colorTo: indigo
sdk: docker
pinned: false
---

# Kokoro TTS API

A lightweight REST API for [Kokoro TTS](https://huggingface.co/hexgrad/Kokoro-82M) — used as a serverless backend for the TwelveReader audiobook app, specifically to support iOS Safari where local WASM inference isn't viable.

## API

### `POST /tts`
Generate speech from text.

**Request body (JSON):**
```json
{
  "text": "Hello world",
  "voice": "af_bella",
  "speed": 1.0
}
```

**Response:** `audio/wav` binary

### Available voices
American Female: `af_bella`, `af_heart`, `af_nova`, `af_sky`, `af_sarah`, `af_nicole`, `af_alloy`, `af_aoede`, `af_jessica`, `af_kore`, `af_river`

American Male: `am_adam`, `am_echo`, `am_liam`, `am_michael`, `am_onyx`, `am_puck`, `am_fenrir`, `am_eric`, `am_santa`

British Female: `bf_alice`, `bf_emma`, `bf_isabella`, `bf_lily`

British Male: `bm_daniel`, `bm_fable`, `bm_george`, `bm_lewis`
