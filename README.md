# Shadowing App

Language shadowing practice tool — upload podcast MP3s, auto-split into study chunks, practice on mobile.

## Architecture

```
shadowing/
├── web-app/
│   ├── backend/    FastAPI (Python) — upload, audio splitting, REST API
│   └── frontend/   React + Vite — lesson manager, chunk preview
└── mobile-app/     React Native (Expo) — lesson picker, practice, stats
```

## Web App

### Backend (FastAPI)

```bash
cd web-app/backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API runs at `http://localhost:8000`

### Frontend (React)

```bash
cd web-app/frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173`

### Supported transcription formats

- **SRT** — standard subtitle format
- **WebVTT** — web video text tracks

### Processing pipeline

1. Upload MP3 + SRT/VTT transcript via the web UI
2. Backend parses timestamps and splits into **15–30 big chunks** (~1–2 min each), aligned to phrase boundaries
3. Each big chunk is split into **6–10 second fine chunks** at sentence/phrase endings
4. Audio files are extracted with ffmpeg and stored in `storage/`

---

## Mobile App (Android)

Built with **Expo / React Native**.

### Setup

```bash
cd mobile-app
npm install
npx expo start --android
```

> For Android emulator: API_BASE in `src/api.js` is pre-set to `http://10.0.2.2:8000`  
> For a physical device on the same WiFi: change it to `http://<your-machine-ip>:8000`

### Features

| Screen | What it does |
|---|---|
| Lessons | List all ready lessons, pull-to-refresh |
| Practice | Listen → Record → Compare → Mark good/needs practice → Navigate chunks |
| Stats | Chronological review history with counts |

### Practice flow

1. Pick a lesson from the list
2. Read the chunk text
3. Tap **Play** to hear the original audio
4. Tap **Record** → **Stop** to record yourself
5. Tap **Play Back** to hear your recording
6. Mark as **Good** or **Needs Practice** — app auto-advances to next chunk
7. Use **Prev / Next** to navigate freely

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/lessons` | Upload MP3 + transcript (multipart) |
| `GET` | `/api/lessons` | List all lessons |
| `GET` | `/api/lessons/{id}` | Lesson detail |
| `GET` | `/api/lessons/{id}/chunks` | All fine chunks for a lesson |
| `GET` | `/api/chunks/{id}/audio` | Stream chunk audio (MP3) |
| `PUT` | `/api/chunks/{id}/status` | Record practice result `{status: "good"\|"needs_practice"}` |
| `GET` | `/api/stats` | Practice history (last 500 records) |
| `DELETE` | `/api/lessons/{id}` | Delete lesson + audio files |
