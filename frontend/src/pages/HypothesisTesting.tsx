import { useState, useEffect } from 'react'
import { recommendTest, runTest } from '../api/hypothesis'
import { getColumnTypes } from '../api/dataset'
import {
  Button,
  Card,
  Alert,
  MetricCard,
  SectionHeader,
  Badge,
  Tabs,
  Input,
  Divider
} from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'
import { Search, FlaskConical, Beaker, Play, Info, CheckCircle2, AlertCircle } from 'lucide-react'

type AlertKind = 'success' | 'error' | 'info' | 'warning'
type AlertState = { type: AlertKind; message: string } | null

interface Recommendation {
  test: string
  reason: string
  priority: 'High' | 'Medium' | 'Low'
}

interface TestResult {
  success: boolean
  test: string
  result: Record<string, any>
  error?: string
}

const TEST_CATEGORIES = [
  { 
    name: 'Correlation', 
    tests: ['Pearson Correlation', 'Spearman Rank Correlation', "Kendall's Tau", 'Chi-Square Test of Independence'] 
  },
  { 
    name: 'Comparison', 
    tests: ['One-Sample t-test', 'Independent Two-Sample t-test', 'Paired Sample t-test', 'One-Way ANOVA', 'Mann-Whitney U Test', 'Wilcoxon Signed-Rank Test', 'Kruskal-Wallis H-test'] 
  },
  { 
    name: 'Distribution', 
    tests: ['Shapiro-Wilk Test', "D'Agostino's K^2 Test", 'Kolmogorov-Smirnov Test'] 
  },
  { 
    name: 'Regression', 
    tests: ['Linear Regression Analysis'] 
  }
]

export default function HypothesisTesting() {
  const [alert, setAlert] = useState<AlertState>(null)
  const [columns, setColumns] = useState<Record<string, string>>({})
  const [selectedCols, setSelectedCols] = useState<string[]>([])
  const [alpha, setAlpha] = useState(0.05)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [recLoading, setRecLoading] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [testParams, setTestParams] = useState<Record<string, any>>({})
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [runLoading, setRunLoading] = useState(false)

  useEffect(() => {
    getColumnTypes().then(d => setColumns(d.column_types)).catch(() => {})
  }, [])

  const showAlert = (type: AlertKind, msg: string) => {
    setAlert({ type, message: msg })
    setTimeout(() => setAlert(null), 5000)
  }

  const handleGetRecommendations = async () => {
    if (selectedCols.length === 0) {
      showAlert('warning', 'Please select at least one column')
      return
    }
    setRecLoading(true)
    try {
      const res = await recommendTest(selectedCols, alpha)
      setRecommendations(res.recommendations)
    } catch (e: any) {
      showAlert('error', e.response?.data?.error || 'Failed to get recommendations')
    }
    setRecLoading(false)
  }

  const handleRunTest = async () => {
    if (!selectedTest) return
    setRunLoading(true)
    setTestResult(null)
    try {
      const res = await runTest(selectedTest, selectedCols, testParams, alpha)
      setTestResult(res)
    } catch (e: any) {
      showAlert('error', e.response?.data?.error || 'Failed to run test')
    }
    setRunLoading(false)
  }

  const toggleColumn = (col: string) => {
    setSelectedCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5 sm:space-y-6">
      <SectionHeader 
        title="Hypothesis Testing" 
        subtitle="Apply statistical tests to validate assumptions and find relationships in your data"
      />

      <DatasetBanner />

      {alert && <Alert type={alert.type} message={alert.message} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card className="p-6 lg:col-span-1 space-y-6 h-fit sticky top-8">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-3">Select Columns</label>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(columns).map(([name, type]) => (
                <label key={name} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    checked={selectedCols.includes(name)}
                    onChange={() => toggleColumn(name)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">{type}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Divider />

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-700">Significance Level (α)</label>
              <Badge variant="info">{alpha}</Badge>
            </div>
            <input 
              type="range" 
              min="0.01" 
              max="0.1" 
              step="0.01" 
              value={alpha} 
              onChange={e => setAlpha(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              <span>0.01</span>
              <span>0.05</span>
              <span>0.10</span>
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleGetRecommendations} 
            loading={recLoading}
            disabled={selectedCols.length === 0}
          >
            <Search className="w-4 h-4 mr-2" />
            Get Recommendations
          </Button>
        </Card>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <FlaskConical className="w-4 h-4" />
                Recommended Tests
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {recommendations.map((rec, i) => (
                  <Card 
                    key={i} 
                    className={`p-4 cursor-pointer hover:border-blue-400 transition-all border-l-4 ${
                      rec.priority === 'High' ? 'border-l-emerald-500' : 
                      rec.priority === 'Medium' ? 'border-l-blue-500' : 'border-l-slate-300'
                    } ${selectedTest === rec.test ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                    onClick={() => setSelectedTest(rec.test)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-900">{rec.test}</h4>
                      <Badge variant={rec.priority === 'High' ? 'success' : rec.priority === 'Medium' ? 'info' : 'default'}>
                        {rec.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{rec.reason}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Test Catalog */}
          <Card className="overflow-hidden">
            <div className="p-1 bg-slate-50 border-b border-slate-200">
              <Tabs 
                tabs={TEST_CATEGORIES.map(c => c.name)} 
                active={activeTab} 
                onChange={setActiveTab} 
              />
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TEST_CATEGORIES[activeTab].tests.map(test => (
                  <button
                    key={test}
                    onClick={() => { setSelectedTest(test); setTestResult(null) }}
                    className={`text-left p-3 rounded-lg border transition-all text-sm font-medium ${
                      selectedTest === test 
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-500' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {test}
                  </button>
                ))}
              </div>

              {selectedTest && (
                <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{selectedTest}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Running on: <span className="font-mono text-blue-600">{selectedCols.join(', ') || 'no columns selected'}</span>
                      </p>
                    </div>
                    <Button onClick={handleRunTest} loading={runLoading} disabled={selectedCols.length === 0}>
                      <Play className="w-4 h-4 mr-2" />
                      Run Test
                    </Button>
                  </div>

                  {/* Dynamic Parameters (Example for One-Sample T-test) */}
                  {selectedTest === 'One-Sample t-test' && (
                    <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                      <Input 
                        label="Population Mean (H0)" 
                        type="number"
                        defaultValue="0"
                        onChange={e => setTestParams({ popmean: parseFloat(e.target.value) })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Results */}
          {testResult && (
            <Card className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className={`p-4 flex items-center gap-3 border-b ${testResult.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                {testResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                <h3 className={`font-bold ${testResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                  {testResult.success ? 'Test Successfully Executed' : 'Test Failed'}
                </h3>
              </div>
              
              <div className="p-6">
                {!testResult.success ? (
                  <Alert type="error" message={testResult.error || 'An unexpected error occurred during the test.'} />
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(testResult.result).map(([key, val]) => (
                        typeof val !== 'object' && (
                          <MetricCard 
                            key={key} 
                            label={key.replace(/_/g, ' ').toUpperCase()} 
                            value={typeof val === 'number' ? val.toFixed(4) : String(val)}
                            className="bg-slate-50 border-transparent shadow-none"
                          />
                        )
                      ))}
                    </div>

                    <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Info className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-blue-900 mb-2">Interpretation</h4>
                          <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
                            {testResult.result.interpretation || 'No interpretation provided for this test.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Plotly Viz (if backend returns chart_json) */}
                    {testResult.result.chart_json && (
                      <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                          <Beaker className="w-4 h-4 text-slate-400" />
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Statistical Visualization</span>
                        </div>
                        <div className="h-[400px] w-full" ref={(el) => {
                          if (el && (window as any).Plotly) {
                            (window as any).Plotly.newPlot(el, testResult.result.chart_json.data, testResult.result.chart_json.layout, { responsive: true, displayModeBar: false })
                          }
                        }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
