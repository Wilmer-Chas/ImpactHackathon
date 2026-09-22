import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { EmployeeHomePage } from "./pages/home/EmployeeHomePage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { ReportViewPage } from "./pages/report/ReportViewPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<EmployeeHomePage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/report" element={<ReportViewPage />} />
          <Route path="/report/:period" element={<ReportViewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
