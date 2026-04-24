import os
import asyncio
import traceback
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

import aiofiles

from database import (
    init_db, insert_lesson, save_chunks, get_lessons, get_lesson,
    get_fine_chunks, get_fine_chunk, record_practice, get_stats,
    mark_lesson_error,
)
from transcription_parser import parse_transcription
from audio_processor import process_lesson

STORAGE_DIR = os.environ.get("STORAGE_DIR", "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

app = FastAPI(title="Shadowing API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


# ── Background processing ────────────────────────────────────────────────────

async def _process(lesson_id: int, audio_path: str, transcript_content: str,
                   big_chunk_target: int):
    try:
        loop = asyncio.get_event_loop()
        segments = parse_transcription(transcript_content)
        output_dir = os.path.join(STORAGE_DIR, str(lesson_id))
        big_chunks = await loop.run_in_executor(
            None,
            process_lesson,
            audio_path,
            segments,
            output_dir,
            big_chunk_target,
        )
        save_chunks(lesson_id, big_chunks)
    except Exception as e:
        mark_lesson_error(lesson_id, str(e))
        traceback.print_exc()


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/lessons")
async def upload_lesson(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    description: str = Form(""),
    big_chunk_count: int = Form(20),
    audio: UploadFile = File(...),
    transcript: UploadFile = File(...),
):
    lesson_id = insert_lesson(name, description, "", "")

    audio_path = os.path.join(STORAGE_DIR, f"lesson_{lesson_id}.mp3")
    async with aiofiles.open(audio_path, "wb") as f:
        while chunk := await audio.read(1024 * 1024):
            await f.write(chunk)

    transcript_content = (await transcript.read()).decode("utf-8", errors="replace")

    big_chunk_count = max(15, min(30, big_chunk_count))
    background_tasks.add_task(_process, lesson_id, audio_path, transcript_content, big_chunk_count)

    return {"id": lesson_id, "status": "processing"}


@app.get("/api/lessons")
def list_lessons():
    return get_lessons()


@app.get("/api/lessons/{lesson_id}")
def get_lesson_detail(lesson_id: int):
    lesson = get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return lesson


@app.get("/api/lessons/{lesson_id}/chunks")
def list_chunks(lesson_id: int):
    lesson = get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return get_fine_chunks(lesson_id)


@app.get("/api/chunks/{chunk_id}/audio")
def serve_audio(chunk_id: int):
    chunk = get_fine_chunk(chunk_id)
    if not chunk:
        raise HTTPException(404, "Chunk not found")
    lesson = get_lesson(chunk["lesson_id"])
    audio_path = os.path.join(STORAGE_DIR, str(chunk["lesson_id"]), chunk["audio_file"])
    if not os.path.exists(audio_path):
        raise HTTPException(404, "Audio file not found")
    return FileResponse(audio_path, media_type="audio/mpeg")


@app.put("/api/chunks/{chunk_id}/status")
def update_chunk_status(chunk_id: int, payload: dict):
    status = payload.get("status")
    if status not in ("good", "needs_practice"):
        raise HTTPException(400, "status must be 'good' or 'needs_practice'")
    chunk = get_fine_chunk(chunk_id)
    if not chunk:
        raise HTTPException(404, "Chunk not found")
    record_practice(chunk_id, status)
    return {"ok": True}


@app.get("/api/stats")
def stats():
    return get_stats()


@app.delete("/api/lessons/{lesson_id}")
def delete_lesson(lesson_id: int):
    from database import db
    import shutil
    lesson = get_lesson(lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    with db() as conn:
        conn.execute("DELETE FROM lessons WHERE id=?", (lesson_id,))
    audio_path = os.path.join(STORAGE_DIR, f"lesson_{lesson_id}.mp3")
    output_dir = os.path.join(STORAGE_DIR, str(lesson_id))
    if os.path.exists(audio_path):
        os.remove(audio_path)
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    return {"ok": True}
