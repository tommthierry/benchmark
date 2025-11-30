import { Routes, Route, useLocation } from 'react-router';
import { Layout } from './components/Layout';
import { RankingsPage } from './pages/RankingsPage';
import { RunsPage } from './pages/RunsPage';
import { ArenaPage } from './pages/ArenaPage';
import { ProvidersPage } from './pages/admin/ProvidersPage';
import { ModelsPage } from './pages/admin/ModelsPage';
import { QuestionsPage } from './pages/admin/QuestionsPage';
import { QuestionTypesPage } from './pages/admin/QuestionTypesPage';
import { StatusPage } from './pages/admin/StatusPage';
import { SettingsPage } from './pages/admin/SettingsPage';

function App() {
  const location = useLocation();

  // Arena page has its own layout (full-screen, no sidebar)
  if (location.pathname === '/arena') {
    return (
      <Routes>
        <Route path="/arena" element={<ArenaPage />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        {/* User routes */}
        <Route path="/" element={<RankingsPage />} />
        <Route path="/runs" element={<RunsPage />} />

        {/* Admin routes */}
        <Route path="/admin/providers" element={<ProvidersPage />} />
        <Route path="/admin/models" element={<ModelsPage />} />
        <Route path="/admin/questions" element={<QuestionsPage />} />
        <Route path="/admin/question-types" element={<QuestionTypesPage />} />
        <Route path="/admin/status" element={<StatusPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
