import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Home from './pages/Home'
import PlaceholderPage from './pages/PlaceholderPage'
import AnomalyDetection from './pages/AnomalyDetection'
import DataTransformation from './pages/DataTransformation'
import ColumnAnalysis from './pages/ColumnAnalysis'
import CleaningWizard from './pages/CleaningWizard'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/anomaly-detection" element={<AnomalyDetection />} />
          <Route path="/data-transformation" element={<DataTransformation />} />
          <Route path="/column-analysis" element={<ColumnAnalysis />} />
          <Route path="/cleaning-wizard" element={<CleaningWizard />} />
          <Route path="/hypothesis-testing" element={<PlaceholderPage title="📋 Hypothesis Testing" description="15 statistical tests with intelligent recommendations. Coming in Phase 3." />} />
          <Route path="/data-balancer" element={<PlaceholderPage title="⚖️ Data Balancer" description="Balance ML datasets with 14 methods including SMOTE. Coming in Phase 3." />} />
          <Route path="/visualization" element={<PlaceholderPage title="📈 Charts" description="Interactive chart builder with 9 chart types. Coming in Phase 3." />} />
          <Route path="/reports" element={<PlaceholderPage title="📄 Reports" description="Professional PDF reports with audit trail. Coming in Phase 3." />} />
          <Route path="/ai-assistant" element={<PlaceholderPage title="🤖 AI Assistant" description="AI-powered data cleaning guidance via Groq. Coming in Phase 3." />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
