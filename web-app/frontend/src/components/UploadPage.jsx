import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { uploadLesson } from "../api";

export default function UploadPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bigCount, setBigCount] = useState(20);
  const [audioFile, setAudioFile] = useState(null);
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !audioFile || !transcriptFile) {
      setAlert({ type: "error", msg: "Please fill all required fields." });
      return;
    }
    const fd = new FormData();
    fd.append("name", name);
    fd.append("description", description);
    fd.append("big_chunk_count", bigCount);
    fd.append("audio", audioFile);
    fd.append("transcript", transcriptFile);

    setUploading(true);
    setAlert(null);
    try {
      const res = await uploadLesson(fd, (p) => setProgress(Math.round(p * 100)));
      setAlert({ type: "success", msg: "Upload complete! Processing in background…" });
      setTimeout(() => navigate(`/lessons/${res.id}`), 1200);
    } catch (err) {
      setAlert({ type: "error", msg: `Upload failed: ${err.message}` });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1>Upload Lesson</h1>
      {alert && <div className={`alert alert-${alert.type}`}>{alert.msg}</div>}
      <div className="card" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row">
            <label>Lesson Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Episode 42 – Daily Routines" required />
          </div>
          <div className="form-row">
            <label>Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes…" />
          </div>
          <div className="form-row">
            <label>Big Chunks (15–30) — major lesson sections</label>
            <input type="number" min={15} max={30} value={bigCount} onChange={(e) => setBigCount(Number(e.target.value))} />
          </div>
          <div className="form-row">
            <label>MP3 Audio File *</label>
            <input type="file" accept="audio/mp3,audio/mpeg,.mp3" onChange={(e) => setAudioFile(e.target.files[0])} required />
            {audioFile && <span style={{ fontSize: 12, color: "var(--muted)" }}>{(audioFile.size / 1024 / 1024).toFixed(1)} MB</span>}
          </div>
          <div className="form-row">
            <label>Transcription File (SRT or VTT) *</label>
            <input type="file" accept=".srt,.vtt,text/plain" onChange={(e) => setTranscriptFile(e.target.files[0])} required />
          </div>

          {uploading && (
            <div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Uploading… {progress}%</div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div style={{ marginTop: 8 }}>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload & Process"}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 24 }}>
        <h2>Supported Formats</h2>
        <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.8 }}>
          <strong>Audio:</strong> MP3 (up to ~200 MB)<br />
          <strong>Transcription:</strong> SRT or WebVTT with timestamps.<br />
          The processor will create <strong>{bigCount} big chunks</strong> aligned to phrase boundaries,
          then split each into <strong>6–10 second fine chunks</strong> at sentence ends.
        </p>
      </div>
    </div>
  );
}
