import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout/AppLayout';
import EvalCenter from './pages/EvalCenter';
import EvidenceBased from './pages/EvidenceBased';
import VideoWorkbench from './pages/VideoWorkbench';
import StudentManagement from './pages/StudentManagement';
import AIAssistant from './pages/AIAssistant';
import ReportCenter from './pages/ReportCenter';

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<EvalCenter />} />
        <Route path="/evidence" element={<EvidenceBased />} />
        <Route path="/video" element={<VideoWorkbench />} />
        <Route path="/students" element={<StudentManagement />} />
        <Route path="/ai" element={<AIAssistant />} />
        <Route path="/reports" element={<ReportCenter />} />
      </Route>
    </Routes>
  );
};

export default App;
