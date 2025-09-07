import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import ReportsPage from "./pages/ReportsPage"; // <- NOVO
import RequireAuth from "./components/RequireAuth";
import GerencialPage from "./pages/GerencialPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Tudo abaixo de RequireAuth exige token */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/reports" element={<ReportsPage />} /> {/* <- NOVO */}
        <Route path="/management" element={<GerencialPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
