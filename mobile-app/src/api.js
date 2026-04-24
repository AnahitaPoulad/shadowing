// EAS builds inject EXPO_PUBLIC_API_BASE via eas.json env.
// For local dev with Android emulator use "http://10.0.2.2:8000".
// For local dev on a physical device use "http://<your-machine-ip>:8000".
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE
  ? `${process.env.EXPO_PUBLIC_API_BASE}/api`
  : "http://10.0.2.2:8000/api";

export const fetchLessons = () =>
  fetch(`${API_BASE}/lessons`).then((r) => r.json());

export const fetchLesson = (id) =>
  fetch(`${API_BASE}/lessons/${id}`).then((r) => r.json());

export const fetchChunks = (id) =>
  fetch(`${API_BASE}/lessons/${id}/chunks`).then((r) => r.json());

export const updateChunkStatus = (id, status) =>
  fetch(`${API_BASE}/chunks/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).then((r) => r.json());

export const fetchStats = () =>
  fetch(`${API_BASE}/stats`).then((r) => r.json());

export const chunkAudioUrl = (id) => `${API_BASE}/chunks/${id}/audio`;
