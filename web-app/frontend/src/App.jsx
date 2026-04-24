import React from "react";
import { Routes, Route, NavLink, useNavigate } from "react-router-dom";
import UploadPage from "./components/UploadPage";
import LessonsPage from "./components/LessonsPage";
import LessonDetailPage from "./components/LessonDetailPage";
import StatsPage from "./components/StatsPage";
import "./App.css";

export default function App() {
  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="brand">🎙 Shadowing</div>
        <NavLink to="/" end>Lessons</NavLink>
        <NavLink to="/upload">Upload</NavLink>
        <NavLink to="/stats">Stats</NavLink>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<LessonsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/lessons/:id" element={<LessonDetailPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
    </div>
  );
}
