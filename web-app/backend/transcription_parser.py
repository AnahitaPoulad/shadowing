import re
from dataclasses import dataclass
from typing import List


@dataclass
class Segment:
    index: int
    start: float  # seconds
    end: float    # seconds
    text: str


def _ts_to_seconds(ts: str) -> float:
    """Convert SRT/VTT timestamp to seconds. Accepts , or . as millisecond separator."""
    ts = ts.replace(",", ".")
    parts = ts.strip().split(":")
    if len(parts) == 3:
        h, m, s = parts
        return int(h) * 3600 + int(m) * 60 + float(s)
    elif len(parts) == 2:
        m, s = parts
        return int(m) * 60 + float(s)
    return float(parts[0])


def parse_srt(content: str) -> List[Segment]:
    segments = []
    blocks = re.split(r"\n\s*\n", content.strip())
    for block in blocks:
        lines = block.strip().splitlines()
        if len(lines) < 3:
            continue
        # first line may be sequence number
        ts_line = None
        text_lines = []
        for i, line in enumerate(lines):
            if "-->" in line:
                ts_line = line
                text_lines = lines[i + 1:]
                break
        if not ts_line:
            continue
        m = re.match(r"(.+?)\s*-->\s*(.+)", ts_line)
        if not m:
            continue
        start = _ts_to_seconds(m.group(1))
        end = _ts_to_seconds(m.group(2))
        text = " ".join(t.strip() for t in text_lines if t.strip())
        if text:
            segments.append(Segment(len(segments), start, end, text))
    return segments


def parse_vtt(content: str) -> List[Segment]:
    # Strip WEBVTT header
    content = re.sub(r"^WEBVTT[^\n]*\n", "", content.strip())
    return parse_srt(content)


def parse_transcription(content: str) -> List[Segment]:
    content = content.strip()
    if content.startswith("WEBVTT"):
        return parse_vtt(content)
    return parse_srt(content)
