import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchLesson, fetchChunks, chunkAudioUrl } from "../api";

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function groupByBig(chunks) {
  const map = {};
  for (const c of chunks) {
    if (!map[c.big_idx]) map[c.big_idx] = [];
    map[c.big_idx].push(c);
  }
  return Object.entries(map).map(([k, v]) => ({ bigIdx: Number(k), chunks: v }));
}

export default function LessonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [expandedBig, setExpandedBig] = useState(new Set([0]));
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchLesson(id), fetchChunks(id)]).then(([l, c]) => {
      setLesson(l);
      setChunks(c);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="empty"><div className="spinner" /></div>;
  if (!lesson) return <div className="empty">Lesson not found.</div>;

  const groups = groupByBig(chunks);
  const filtered = filter
    ? chunks.filter((c) => c.text.toLowerCase().includes(filter.toLowerCase()))
    : null;

  function toggleBig(idx) {
    setExpandedBig((s) => {
      const n = new Set(s);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  }

  return (
    <div>
      <div className="back-link" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        ← Back to Lessons
      </div>
      <div className="page-header">
        <div>
          <h1>{lesson.name}</h1>
          {lesson.description && <p style={{ color: "var(--muted)", marginTop: -16 }}>{lesson.description}</p>}
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {lesson.big_chunk_count} sections · {lesson.fine_chunk_count} chunks
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input placeholder="Search transcript…" value={filter} onChange={(e) => setFilter(e.target.value)}
          style={{ maxWidth: 320 }} />
      </div>

      {filtered ? (
        <div className="card">
          <h2>Search results ({filtered.length})</h2>
          <ChunkTable chunks={filtered} />
        </div>
      ) : (
        groups.map(({ bigIdx, chunks: bc }) => (
          <div key={bigIdx} className="big-chunk-section">
            <div className="big-chunk-header" onClick={() => toggleBig(bigIdx)} style={{ cursor: "pointer" }}>
              <span>{expandedBig.has(bigIdx) ? "▾" : "▸"}</span>
              <span>Section {bigIdx + 1}</span>
              <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>
                {formatTime(bc[0].start)} – {formatTime(bc[bc.length - 1].end)} · {bc.length} chunks
              </span>
            </div>
            {expandedBig.has(bigIdx) && (
              <div className="card" style={{ padding: 0 }}>
                <ChunkTable chunks={bc} />
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function ChunkTable({ chunks }) {
  return (
    <table className="chunk-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Time</th>
          <th>Duration</th>
          <th>Text</th>
          <th>Audio</th>
        </tr>
      </thead>
      <tbody>
        {chunks.map((c) => (
          <tr key={c.id}>
            <td style={{ color: "var(--muted)", fontSize: 12 }}>{c.big_idx + 1}.{c.idx + 1}</td>
            <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>
              {formatTime(c.start)}–{formatTime(c.end)}
            </td>
            <td style={{ fontSize: 12 }}>{c.duration}s</td>
            <td className="chunk-text">{c.text}</td>
            <td>
              <audio src={chunkAudioUrl(c.id)} controls preload="none" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
