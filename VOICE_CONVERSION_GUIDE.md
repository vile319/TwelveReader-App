# Voice-Conversion Quick-Start (RVC / SoVITS)

This is the **absolute-minimum kit** for creating a Burt Reynolds (or any single-speaker) voice-conversion model that plugs into TwelveReader's output.

---

## 1  Collect a Clean Voice Pack

| What you need | Recommended |
|--------------|-------------|
| Source audio  | **2-5 min** of clean speech (more ≈ 10 min will help) |
| Format        | WAV or MP3, **≥16 kHz**, mono preferred |
| Quality       | Single-speaker, minimal background noise |

• Trim long silences manually **or** let the WebUI's "Auto Slice" feature do it for you.

```
voice_pack/
├── br_clip_01.wav
├── br_clip_02.wav
└── ...
```

---

## 2  RVC-WebUI One-Liners  💻

> CPU is fine – just slower. No hand-made CSVs required.

```bash
# 1) Data prep  (auto-slices & builds file list)
python prepare_data.py -s voice_pack -o dataset

# 2) Train index (optional but helps)
python train_index.py -d dataset

# 3) Train the model (RVC)
python train_rvc.py -d dataset -e 40
```

Inside the GUI → **Data Processing** tab:
1. **Auto Slice**  
2. **Train Index**  
3. **Train Model**

That's it – the WebUI writes its own `metadata.txt` / `filelist.csv` so you don't have to.

---

## 3  SoVITS / GPT-SoVITS 🥼 (alternative)

Same idea – drop the WAVs in a folder and run:

```bash
python prepare_dataset.py -s voice_pack -o dataset
```

The script creates the required train/val lists automatically.

---

## 4  Inference Pipeline  🔈

1. **Generate plain speech** in TwelveReader (Kokoro, CPU is fine) → WAV
2. Drag the WAV into RVC / SoVITS **Infer** tab
3. Profit → Burt-style speech 🚀

No extra metadata files. Just your Burt clips and the WebUI scripts.