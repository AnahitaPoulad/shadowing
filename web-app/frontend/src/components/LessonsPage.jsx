import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLessons, deleteLesson } from "../api";

function statusTag(s) {
  if (s === "ready") return <span className="tag tag-ready">Ready</span>;
  if (s?.startsWith("error")) return <span className="tag tag-error">Error</span>;
  return <span className="tag tag-processing">Processing…</span>;
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function load() {
    setLessons(await fetchLessons());
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm("Delete this lesson and all its audio chunks?")) return;
    await deleteLesson(id);
    load();
  }

  if (loading) return <div className="empty"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Lessons</h1>
        <button className="btn-primary" onClick={() => navigate("/upload")}>+ Upload New</button>
      </div>

      {lessons.length === 0 && (
        <div className="empty">No lessons yet. Upload your first podcast!</div>
      )}

      <div className="lesson-grid">
        {lessons.map((l) => (
          <div key={l.id} className="lesson-card" onClick={() => l.status === "ready" && navigate(`/lessons/${l.id}`)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3>{l.name}</h3>
              {statusTag(l.status)}
            </div>
            {l.description && <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{l.description}</p>}
            <div className="lesson-meta">
              <span>{l.big_chunk_count} sections</span>
              <span>{l.fine_chunk_count} chunks</span>
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              {l.status === "ready" && (
                <button className="btn-ghost" style={{ fontSize: 12, padding: "4px 12px" }}
                  onClick={(e) => { e.stopPropagation(); navigate(`/lessons/${l.id}`); }}>
                  View Chunks
                </button>
              )}
              <button className="btn-danger" style={{ fontSize: 12, padding: "4px 12px" }}
                onClick={(e) => handleDelete(e, l.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
