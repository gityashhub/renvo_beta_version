import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Home from './pages/Home'
import AnomalyDetection from './pages/AnomalyDetection'
import DataTransformation from './pages/DataTransformation'
import ColumnAnalysis from './pages/ColumnAnalysis'
import CleaningWizard from './pages/CleaningWizard'
import HypothesisTesting from './pages/HypothesisTesting'
import DataBalancer from './pages/DataBalancer'
import Visualization from './pages/Visualization'
import Reports from './pages/Reports'
import AIAssistant from './pages/AIAssistant'

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
          <Route path="/hypothesis-testing" element={<HypothesisTesting />} />
          <Route path="/data-balancer" element={<DataBalancer />} />
          <Route path="/visualization" element={<Visualization />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
