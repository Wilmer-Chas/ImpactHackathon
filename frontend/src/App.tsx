import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AppFilterProvider } from "./context/AppFilterContext";
import { EmployeeHomePage } from "./pages/home/EmployeeHomePage";
import { ReportViewPage } from "./pages/report/ReportViewPage";
import { RiskAnalysisReportPage } from "./pages/report/RiskAnalysisReportPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppFilterProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<EmployeeHomePage />} />
            <Route path="/report" element={<ReportViewPage />} />
            <Route path="/report/risk" element={<RiskAnalysisReportPage />} />
            <Route path="/report/:period" element={<ReportViewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppFilterProvider>
    </BrowserRouter>
  );
}
