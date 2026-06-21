import { useState, useEffect } from 'react'
import { getBalancerMethods, validateBalancerData, balanceData, getBalancerDownloadUrl } from '../api/balancer'
import { getColumnTypes } from '../api/dataset'
import {
  Button,
  Card,
  Alert,
  SectionHeader,
  Badge,
  Tabs,
  Divider,
  SelectInput
} from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'
import { 
  BarChart3, 
  CheckCircle2, 
  Download, 
  Settings2, 
  Layers, 
  ArrowRight,
  Info,
  ChevronRight
} from 'lucide-react'

type AlertKind = 'success' | 'error' | 'info' | 'warning'
type AlertState = { type: AlertKind; message: string } | null

interface BalancerMethods {
  Oversampling: string[]
  Undersampling: string[]
  Hybrid: string[]
}

export default function DataBalancer() {
  const [alert, setAlert] = useState<AlertState>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [featureCols, setFeatureCols] = useState<string[]>([])
  const [targetCol, setTargetCol] = useState('')
  const [validateLoading, setValidateLoading] = useState(false)
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null)
  
  const [methods, setMethods] = useState<BalancerMethods | null>(null)
  const [methodTab, setMethodTab] = useState(0)
  const [selectedMethod, setSelectedMethod] = useState('')
  
  const [useSplit, setUseSplit] = useState(false)
  const [testSize, setTestSize] = useState(0.2)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    getColumnTypes().then(d => setColumns(Object.keys(d.column_types))).catch(() => {})
    getBalancerMethods().then(setMethods).catch(() => {})
  }, [])

  const showAlert = (type: AlertKind, msg: string) => {
    setAlert({ type, message: msg })
    setTimeout(() => setAlert(null), 5000)
  }

  const handleValidate = async () => {
    if (!targetCol) {
      showAlert('warning', 'Please select a target column')
      return
    }
    setValidateLoading(true)
    try {
      const res = await validateBalancerData(featureCols, targetCol)
      setValidation(res)
      if (res.valid) {
        showAlert('success', 'Configuration is valid')
      }
    } catch (e: any) {
      showAlert('error', e.response?.data?.error || 'Validation failed')
    }
    setValidateLoading(false)
  }

  const handleBalance = async () => {
    if (!selectedMethod || !targetCol) {
      showAlert('warning', 'Please select a method and target column')
      return
    }
    setBalanceLoading(true)
    setResult(null)
    try {
      const res = await balanceData(selectedMethod, featureCols, targetCol, useSplit, testSize)
      setResult(res)
      showAlert('success', 'Dataset balanced successfully')
    } catch (e: any) {
      showAlert('error', e.response?.data?.error || 'Balancing failed')
    }
    setBalanceLoading(false)
  }

  const methodGroups = methods ? [
    { name: 'Oversampling', items: methods.Oversampling },
    { name: 'Undersampling', items: methods.Undersampling },
    { name: 'Hybrid', items: methods.Hybrid }
  ] : []

  const renderDistributionChart = (dist: Record<string, number>, title: string) => {
    return (
      <div className="flex-1 min-w-[300px] border border-slate-100 rounded-xl p-4 bg-slate-50/30">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <BarChart3 className="w-3 h-3" />
          {title}
        </h4>
        <div 
          className="h-[200px]"
          ref={(el) => {
            if (el && (window as any).Plotly) {
              const data = [{
                x: Object.keys(dist),
                y: Object.values(dist),
                type: 'bar',
                marker: { color: '#3b82f6' }
              }]
              const layout = {
                margin: { t: 10, b: 30, l: 40, r: 10 },
                xaxis: { tickfont: { size: 10 } },
                yaxis: { tickfont: { size: 10 } },
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                height: 200,
                autosize: true
              }
              ;(window as any).Plotly.newPlot(el, data, layout, { staticPlot: true })
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <SectionHeader 
        title="Data Balancer" 
        subtitle="Address class imbalance issues using oversampling, undersampling, or hybrid techniques"
      />

      <DatasetBanner />

      {alert && <Alert type={alert.type} message={alert.message} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Step 1: Config */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6 text-blue-600">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold">1</div>
              <h3 className="font-bold">Configuration</h3>
            </div>
            
            <div className="space-y-6">
              <SelectInput 
                label="Target Column (Class)"
                value={targetCol}
                options={['-- Select Target --', ...columns]}
                onChange={e => {
                  setTargetCol(e.target.value)
                  setValidation(null)
                  setResult(null)
                }}
              />

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600">Feature Columns</label>
                <div className="border border-slate-200 rounded-lg p-3 max-h-60 overflow-y-auto bg-slate-50/50 space-y-2 custom-scrollbar">
                  {columns.filter(c => c !== targetCol).map(col => (
                    <label key={col} className="flex items-center gap-3 p-1.5 rounded hover:bg-white transition-colors cursor-pointer group">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        checked={featureCols.includes(col)}
                        onChange={e => {
                          setFeatureCols(e.target.checked ? [...featureCols, col] : featureCols.filter(c => c !== col))
                          setValidation(null)
                        }}
                      />
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors truncate">{col}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">Leave empty to use all columns except target</p>
              </div>

              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleValidate}
                loading={validateLoading}
                disabled={!targetCol}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Validate Config
              </Button>

              {validation && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  {!validation.valid ? (
                    <div className="space-y-2">
                      {validation.errors.map((e, i) => <Alert key={i} type="error" message={e} className="text-xs py-2" />)}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Alert type="success" message="Ready to balance" className="text-xs py-2" />
                      {validation.warnings.map((w, i) => <Alert key={i} type="warning" message={w} className="text-xs py-2" />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Step 2: Method & Execution */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold">2</div>
                <h3 className="font-bold">Select Balancing Method</h3>
              </div>
              <Badge variant="info">
                {selectedMethod || 'No method selected'}
              </Badge>
            </div>

            <div className="p-1 bg-slate-50 border-b border-slate-100">
              <Tabs 
                tabs={methodGroups.map(g => g.name)}
                active={methodTab}
                onChange={setMethodTab}
              />
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                {methodGroups[methodTab]?.items.map(m => (
                  <button
                    key={m}
                    onClick={() => setSelectedMethod(m)}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left group ${
                      selectedMethod === m 
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className={`block font-bold text-sm mb-0.5 ${selectedMethod === m ? 'text-blue-700' : 'text-slate-900'}`}>{m}</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">{methodGroups[methodTab].name}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedMethod === m ? 'text-blue-500 translate-x-1' : 'text-slate-300 group-hover:text-slate-400'}`} />
                  </button>
                ))}
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Data Split Strategy</h4>
                      <p className="text-xs text-slate-500">Decide if you want to split data before balancing</p>
                    </div>
                  </div>
                  <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200">
                    <button 
                      onClick={() => setUseSplit(false)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${!useSplit ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Whole
                    </button>
                    <button 
                      onClick={() => setUseSplit(true)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${useSplit ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      Train/Test
                    </button>
                  </div>
                </div>

                {useSplit && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-widest">Test Size</label>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {Math.round(testSize * 100)}%
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="0.5" 
                      step="0.05" 
                      value={testSize} 
                      onChange={e => setTestSize(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                )}

                <Divider />

                <Button 
                  className="w-full py-6 text-base font-bold shadow-lg shadow-blue-200"
                  onClick={handleBalance}
                  loading={balanceLoading}
                  disabled={!selectedMethod || !targetCol || !!(validation && !validation.valid)}
                >
                  <Settings2 className="w-5 h-5 mr-2" />
                  Balance Dataset
                </Button>
              </div>
            </div>
          </Card>

          {/* Result Visualization */}
          {result && (
            <Card className="overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Balancing Complete</h3>
                    <p className="text-xs text-slate-500">New balanced dataset is ready</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={getBalancerDownloadUrl('csv')} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      CSV
                    </Button>
                  </a>
                  <a href={getBalancerDownloadUrl('xlsx')} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                  </a>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
                  {renderDistributionChart(result.before_dist, 'Before Balancing')}
                  {renderDistributionChart(result.after_dist, 'After Balancing')}
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 text-white grid grid-cols-1 sm:grid-cols-2 gap-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Layers className="w-32 h-32" />
                  </div>
                  
                  <div className="relative">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Total Samples</p>
                    <div className="flex items-center gap-6">
                      <div>
                        <span className="block text-3xl font-bold">{result.rows_before.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-500 font-medium">Original</span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-600" />
                      <div>
                        <span className="block text-3xl font-bold text-blue-400">{result.rows_after.toLocaleString()}</span>
                        <span className="text-[10px] text-blue-400/60 font-medium">Balanced</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Metadata</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Method Used</span>
                        <span className="font-mono text-blue-400">{result.method || selectedMethod}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Target Feature</span>
                        <span className="font-mono text-slate-300">{targetCol}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">File Output</span>
                        <span className="font-mono text-slate-300 truncate max-w-[120px]">{result.filename || 'balanced_data.csv'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
