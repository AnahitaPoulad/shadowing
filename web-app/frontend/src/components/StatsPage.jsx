import React, { useEffect, useState } from "react";
import { fetchStats } from "../api";

function ago(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats().then((s) => { setStats(s); setLoading(false); });
  }, []);

  const goodCount = stats.filter((s) => s.status === "good").length;
  const needsCount = stats.filter((s) => s.status === "needs_practice").length;

  if (loading) return <div className="empty"><div className="spinner" /></div>;

  return (
    <div>
      <h1>Practice Stats</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--good)" }}>{goodCount}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Marked Good</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "var(--needs)" }}>{needsCount}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Needs Practice</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 32, fontWeight: 800 }}>{stats.length}</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Total Reviews</div>
        </div>
      </div>

      <h2>Recent Activity</h2>
      {stats.length === 0 && <div className="empty">No practice sessions yet.</div>}
      <div className="stats-list">
        {stats.map((s, i) => (
          <div key={i} className="stat-row">
            <div>
              <div style={{ fontSize: 13 }}>{s.text}</div>
              <div className="stat-lesson">{s.lesson_name} · Section {s.big_idx + 1}.{s.idx + 1} · {s.duration}s</div>
            </div>
            <span className={`tag ${s.status === "good" ? "tag-ready" : "tag-processing"}`}>
              {s.status === "good" ? "Good" : "Needs Practice"}
            </span>
            <span className="stat-time">{ago(s.recorded_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
