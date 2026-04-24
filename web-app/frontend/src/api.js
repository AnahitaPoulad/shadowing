// In production set VITE_API_URL to your Render backend URL, e.g.:
// https://shadowing-backend.onrender.com
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

export async function uploadLesson(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/lessons`);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    });
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.responseText));
      }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export const fetchLessons = () => fetch(`${BASE}/lessons`).then((r) => r.json());
export const fetchLesson = (id) => fetch(`${BASE}/lessons/${id}`).then((r) => r.json());
export const fetchChunks = (id) => fetch(`${BASE}/lessons/${id}/chunks`).then((r) => r.json());
export const updateStatus = (id, status) =>
  fetch(`${BASE}/chunks/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).then((r) => r.json());
export const fetchStats = () => fetch(`${BASE}/stats`).then((r) => r.json());
export const deleteLesson = (id) =>
  fetch(`${BASE}/lessons/${id}`, { method: "DELETE" }).then((r) => r.json());
export const chunkAudioUrl = (id) => `${BASE}/chunks/${id}/audio`;
