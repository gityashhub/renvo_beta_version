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
      <Toaster position="top-right" toastOptions={{ style: { fontFamily: 'Inter, sans-serif', fontSize: 13 } }} />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/anomaly-detection" element={<AnomalyDetection />} />
          <Route path="/data-transformation" element={<DataTransformation />} />
          <Route path="/column-analysis" element={<ColumnAnalysis />} />
          <Route path="/cleaning-wizard" element={<CleaningWizard />} />
          <Route path="/hypothesis-testing" element={<PlaceholderPage title="Hypothesis Testing" description="15 statistical tests with intelligent recommendations based on your data characteristics." icon="TestTube2" />} />
          <Route path="/data-balancer" element={<PlaceholderPage title="Data Balancer" description="Balance ML datasets with 14 methods including SMOTE, NearMiss, and hybrid approaches." icon="Scale" />} />
          <Route path="/visualization" element={<PlaceholderPage title="Charts" description="Interactive chart builder with 9 chart types and multi-column selection." icon="BarChart3" />} />
          <Route path="/reports" element={<PlaceholderPage title="Reports" description="Professional PDF reports with modern styling, audit trail, and embedded visualizations." icon="FileText" />} />
          <Route path="/ai-assistant" element={<PlaceholderPage title="AI Assistant" description="Context-aware guidance for data cleaning recommendations powered by Groq AI." icon="Bot" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
