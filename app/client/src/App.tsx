import { Routes, Route } from 'react-router';
import { Layout } from './components/Layout';
import { RankingsPage } from './pages/RankingsPage';
import { RunsPage } from './pages/RunsPage';
import { ProvidersPage } from './pages/admin/ProvidersPage';
import { ModelsPage } from './pages/admin/ModelsPage';
import { QuestionsPage } from './pages/admin/QuestionsPage';
import { QuestionTypesPage } from './pages/admin/QuestionTypesPage';
import { SettingsPage } from './pages/admin/SettingsPage';

function App() {
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
        <Route path="/admin/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
