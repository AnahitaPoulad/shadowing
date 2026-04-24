import sqlite3
import json
import os
from contextlib import contextmanager

DB_PATH = os.environ.get("DB_PATH", "shadowing.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


@contextmanager
def db():
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS lessons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            audio_path TEXT NOT NULL,
            output_dir TEXT NOT NULL,
            big_chunk_count INTEGER DEFAULT 0,
            fine_chunk_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'processing',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS big_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            idx INTEGER NOT NULL,
            start REAL NOT NULL,
            end REAL NOT NULL,
            text TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS fine_chunks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            big_chunk_id INTEGER NOT NULL REFERENCES big_chunks(id) ON DELETE CASCADE,
            big_idx INTEGER NOT NULL,
            idx INTEGER NOT NULL,
            start REAL NOT NULL,
            end REAL NOT NULL,
            duration REAL NOT NULL,
            text TEXT NOT NULL,
            audio_file TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS practice_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fine_chunk_id INTEGER NOT NULL REFERENCES fine_chunks(id) ON DELETE CASCADE,
            status TEXT NOT NULL CHECK(status IN ('good','needs_practice')),
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)


def insert_lesson(name: str, description: str, audio_path: str, output_dir: str) -> int:
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO lessons (name, description, audio_path, output_dir) VALUES (?,?,?,?)",
            (name, description, audio_path, output_dir),
        )
        return cur.lastrowid


def save_chunks(lesson_id: int, big_chunks: list):
    with db() as conn:
        fine_total = 0
        for bc in big_chunks:
            cur = conn.execute(
                "INSERT INTO big_chunks (lesson_id, idx, start, end, text) VALUES (?,?,?,?,?)",
                (lesson_id, bc["index"], bc["start"], bc["end"], bc["text"]),
            )
            big_id = cur.lastrowid
            for fc in bc["fine_chunks"]:
                conn.execute(
                    """INSERT INTO fine_chunks
                       (lesson_id, big_chunk_id, big_idx, idx, start, end, duration, text, audio_file)
                       VALUES (?,?,?,?,?,?,?,?,?)""",
                    (lesson_id, big_id, bc["index"], fc["index"],
                     fc["start"], fc["end"], fc["duration"], fc["text"], fc["audio_file"]),
                )
                fine_total += 1
        conn.execute(
            "UPDATE lessons SET big_chunk_count=?, fine_chunk_count=?, status='ready' WHERE id=?",
            (len(big_chunks), fine_total, lesson_id),
        )


def get_lessons():
    with db() as conn:
        rows = conn.execute(
            "SELECT id, name, description, big_chunk_count, fine_chunk_count, status, created_at FROM lessons ORDER BY created_at DESC"
        ).fetchall()
        return [dict(r) for r in rows]


def get_lesson(lesson_id: int):
    with db() as conn:
        row = conn.execute("SELECT * FROM lessons WHERE id=?", (lesson_id,)).fetchone()
        return dict(row) if row else None


def get_fine_chunks(lesson_id: int):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM fine_chunks WHERE lesson_id=? ORDER BY big_idx, idx",
            (lesson_id,),
        ).fetchall()
        return [dict(r) for r in rows]


def get_fine_chunk(chunk_id: int):
    with db() as conn:
        row = conn.execute("SELECT * FROM fine_chunks WHERE id=?", (chunk_id,)).fetchone()
        return dict(row) if row else None


def record_practice(fine_chunk_id: int, status: str):
    with db() as conn:
        conn.execute(
            "INSERT INTO practice_records (fine_chunk_id, status) VALUES (?,?)",
            (fine_chunk_id, status),
        )


def get_stats():
    with db() as conn:
        rows = conn.execute("""
            SELECT
                pr.recorded_at,
                fc.text,
                fc.duration,
                l.name as lesson_name,
                pr.status,
                fc.big_idx,
                fc.idx
            FROM practice_records pr
            JOIN fine_chunks fc ON fc.id = pr.fine_chunk_id
            JOIN lessons l ON l.id = fc.lesson_id
            ORDER BY pr.recorded_at DESC
            LIMIT 500
        """).fetchall()
        return [dict(r) for r in rows]


def mark_lesson_error(lesson_id: int, msg: str):
    with db() as conn:
        conn.execute(
            "UPDATE lessons SET status=? WHERE id=?",
            (f"error: {msg[:200]}", lesson_id),
        )
