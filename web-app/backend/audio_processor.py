import os
import re
import subprocess
from typing import List, Tuple
from transcription_parser import Segment


SENTENCE_END = re.compile(r"[.!?…]\s*$")


def _ends_sentence(text: str) -> bool:
    return bool(SENTENCE_END.search(text.strip()))


def _phrase_boundary(text: str) -> bool:
    """Looser boundary: sentence end OR comma/colon at end (for sub-clauses)."""
    return bool(re.search(r"[.!?,;:…]\s*$", text.strip()))


def make_big_chunks(
    segments: List[Segment],
    audio_duration: float,
    target_count: int = 20,
) -> List[List[Segment]]:
    """
    Split segments into target_count big chunks, each roughly equal in duration,
    aligned to sentence/phrase boundaries.
    """
    if not segments:
        return []
    target_duration = audio_duration / target_count
    chunks: List[List[Segment]] = []
    current: List[Segment] = []
    chunk_start = segments[0].start

    for seg in segments:
        current.append(seg)
        elapsed = seg.end - chunk_start
        if elapsed >= target_duration and _phrase_boundary(seg.text):
            chunks.append(current)
            current = []
            if seg.end < audio_duration:
                chunk_start = seg.end

    if current:
        if chunks:
            chunks[-1].extend(current)
        else:
            chunks.append(current)

    # Keep within 15-30 range
    while len(chunks) > 30 and len(chunks) > 1:
        # Merge smallest adjacent pair
        min_idx = min(range(len(chunks) - 1), key=lambda i: len(chunks[i]) + len(chunks[i + 1]))
        chunks[min_idx] = chunks[min_idx] + chunks[min_idx + 1]
        chunks.pop(min_idx + 1)

    return chunks


def make_fine_chunks(
    segments: List[Segment],
    min_dur: float = 6.0,
    max_dur: float = 10.0,
) -> List[List[Segment]]:
    """
    Within a big chunk's segments, build fine chunks of 6-10 seconds
    ending at natural sentence/phrase boundaries.
    """
    if not segments:
        return []

    fine: List[List[Segment]] = []
    current: List[Segment] = []
    chunk_start = segments[0].start

    for seg in segments:
        current.append(seg)
        elapsed = seg.end - chunk_start

        if elapsed < min_dur:
            continue

        # Ideal: sentence end within the 6-10 window
        if elapsed <= max_dur and _ends_sentence(seg.text):
            fine.append(current)
            current = []
            chunk_start = seg.end
            continue

        # Acceptable: phrase boundary within window
        if elapsed <= max_dur and _phrase_boundary(seg.text):
            fine.append(current)
            current = []
            chunk_start = seg.end
            continue

        # Forced cut at max_dur
        if elapsed >= max_dur:
            fine.append(current)
            current = []
            chunk_start = seg.end

    if current:
        if fine:
            fine[-1].extend(current)
        else:
            fine.append(current)

    return fine


def get_audio_duration(audio_path: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", audio_path],
        capture_output=True, text=True
    )
    return float(result.stdout.strip())


def extract_audio_chunk(
    src: str,
    dest: str,
    start: float,
    end: float,
) -> None:
    duration = end - start
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-ss", str(start),
            "-t", str(duration),
            "-i", src,
            "-acodec", "libmp3lame",
            "-q:a", "4",
            dest,
        ],
        capture_output=True,
        check=True,
    )


def process_lesson(
    audio_path: str,
    segments: List[Segment],
    output_dir: str,
    big_chunk_target: int = 20,
) -> List[dict]:
    """
    Full pipeline: returns a list of big_chunk dicts, each containing fine_chunks.
    Cuts audio files and writes them to output_dir.
    Returns metadata (no audio bytes).
    """
    os.makedirs(output_dir, exist_ok=True)
    duration = get_audio_duration(audio_path)
    big_groups = make_big_chunks(segments, duration, big_chunk_target)

    result = []
    for bi, big_segs in enumerate(big_groups):
        big_start = big_segs[0].start
        big_end = big_segs[-1].end
        big_text = " ".join(s.text for s in big_segs)

        fine_groups = make_fine_chunks(big_segs)
        fine_chunks = []
        for fi, fine_segs in enumerate(fine_groups):
            f_start = fine_segs[0].start
            f_end = fine_segs[-1].end
            f_text = " ".join(s.text for s in fine_segs)
            audio_file = f"b{bi:02d}_f{fi:03d}.mp3"
            audio_dest = os.path.join(output_dir, audio_file)
            extract_audio_chunk(audio_path, audio_dest, f_start, f_end)
            fine_chunks.append({
                "index": fi,
                "start": f_start,
                "end": f_end,
                "duration": round(f_end - f_start, 2),
                "text": f_text,
                "audio_file": audio_file,
            })

        result.append({
            "index": bi,
            "start": big_start,
            "end": big_end,
            "text": big_text,
            "fine_chunks": fine_chunks,
        })

    return result
