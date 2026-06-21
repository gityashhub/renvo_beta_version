import { useState, useEffect, useCallback } from 'react'
import { previewClean, applyClean, undoClean, redoClean, getCleanHistory, clearCleanHistory } from '../api/cleaning'
import { getAllAnalysis } from '../api/cleaning'
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
  SelectInput,
  ProgressBar
} from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'
import { RotateCcw, RotateCw, Check, Eye, Search, Filter, Trash2, Sliders, Clock, X } from 'lucide-react'

type AlertKind = 'success' | 'error' | 'info' | 'warning'
type AlertState = { type: AlertKind; message: string } | null

interface QualityInfo { score: number; grade: string; issues: string[] }
interface PreviewResult {
  success: boolean; total_changes: number;
  impact_stats: Record<string, number | null>;
  sample_changes: { index: number; before: unknown; after: unknown }[]
}

const METHODS = {
  missing_values: {
    label: 'Missing Values',
    methods: {
      mean_imputation: { label: 'Mean Imputation', desc: 'Replace missing values with column mean. Numeric only.', params: [] },
      median_imputation: { label: 'Median Imputation', desc: 'Replace missing values with column median. Numeric only.', params: [] },
      mode_imputation: { label: 'Mode Imputation', desc: 'Replace missing values with most frequent value.', params: [] },
      forward_fill: { label: 'Forward Fill', desc: 'Propagate last valid value forward.', params: [] },
      backward_fill: { label: 'Backward Fill', desc: 'Use next valid value to fill backwards.', params: [] },
      knn_imputation: { label: 'KNN Imputation', desc: 'Use K-nearest neighbors for numeric imputation.', params: [{ key: 'n_neighbors', label: 'Neighbors', type: 'slider', min: 3, max: 10, default: 5 }] },
      interpolation: { label: 'Interpolation', desc: 'Interpolate values between known data points. Numeric only.', params: [{ key: 'method', label: 'Method', type: 'select', options: ['linear', 'polynomial', 'spline'], default: 'linear' }] },
      missing_category: { label: 'Missing Category', desc: 'Create a dedicated "Missing" category.', params: [{ key: 'category_name', label: 'Category name', type: 'text', default: 'Missing' }] },
      regression_imputation: { label: 'Regression Imputation', desc: 'Predict missing values using regression. Numeric only.', params: [] },
    },
  },
  outliers: {
    label: 'Outliers',
    methods: {
      iqr_removal: { label: 'IQR Removal', desc: 'Remove values outside Q1 - k*IQR and Q3 + k*IQR bounds.', params: [{ key: 'multiplier', label: 'IQR multiplier', type: 'slider', min: 1.0, max: 3.0, default: 1.5, step: 0.1 }] },
      zscore_removal: { label: 'Z-Score Removal', desc: 'Remove values with |z-score| > threshold.', params: [{ key: 'threshold', label: 'Z-score threshold', type: 'slider', min: 2.0, max: 4.0, default: 3.0, step: 0.1 }] },
      winsorization: { label: 'Winsorization', desc: 'Cap extreme values at specified percentiles.', params: [{ key: 'lower_percentile', label: 'Lower %', type: 'slider', min: 0.1, max: 10, default: 5, step: 0.1 }, { key: 'upper_percentile', label: 'Upper %', type: 'slider', min: 90, max: 99.9, default: 95, step: 0.1 }] },
      log_transformation: { label: 'Log Transformation', desc: 'Apply log transform to reduce skewness and outlier impact.', params: [] },
      cap_outliers: { label: 'Cap Outliers', desc: 'Cap outliers at bounds instead of removing them.', params: [{ key: 'method', label: 'Capping method', type: 'select', options: ['iqr', 'percentile'], default: 'iqr' }] },
      isolation_forest: { label: 'Isolation Forest', desc: 'ML-based outlier detection using random forests.', params: [{ key: 'contamination', label: 'Contamination rate', type: 'slider', min: 0.01, max: 0.2, default: 0.1, step: 0.01 }] },
    },
  },
  data_quality: {
    label: 'Text & Quality',
    methods: {
      trim_whitespace: { label: 'Trim Whitespace', desc: 'Remove leading/trailing whitespace from text values.', params: [] },
      standardize_case: { label: 'Standardize Case', desc: 'Normalize text to a consistent case.', params: [{ key: 'case_type', label: 'Case type', type: 'select', options: ['lower', 'upper', 'title'], default: 'lower' }] },
      remove_duplicates: { label: 'Remove Duplicates', desc: 'Remove duplicate rows based on this column\'s values.', params: [{ key: 'keep', label: 'Which to keep', type: 'select', options: ['first', 'last'], default: 'first' }] },
    },
  },
} as const

type MethodType = keyof typeof METHODS

function getGradeVariant(grade: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const g = grade.toUpperCase()
  if (g === 'A') return 'success'
  if (g === 'B') return 'info'
  if (g === 'C') return 'warning'
  if (g === 'D') return 'warning'
  if (g === 'F') return 'error'
  return 'default'
}

export default function CleaningWizard() {
  const [alert, setAlert] = useState<AlertState>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [qualityMap, setQualityMap] = useState<Record<string, QualityInfo>>({})
  const [selectedCol, setSelectedCol] = useState<string | null>(null)
  const [methodType, setMethodType] = useState<MethodType>('missing_values')
  const [methodName, setMethodName] = useState<string>('mean_imputation')
  const [params, setParams] = useState<Record<string, unknown>>({})
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)
  const [historyMap, setHistoryMap] = useState<Record<string, unknown[]>>({})

  const showAlert = (type: AlertKind, msg: string) => {
    setAlert({ type, message: msg })
    setTimeout(() => setAlert(null), 5000)
  }

  useEffect(() => {
    getColumnTypes().then(d => setColumns(Object.keys(d.column_types))).catch(() => {})
    getAllAnalysis().then(d => {
      const qa: Record<string, QualityInfo> = {}
      for (const [col, a] of Object.entries(d.column_analysis)) {
        const analysis = a as Record<string, unknown>
        if (analysis?.data_quality) qa[col] = analysis.data_quality as QualityInfo
      }
      setQualityMap(qa)
    }).catch(() => {})
    getCleanHistory().then(d => {
      setUndoCount(d.undo_count)
      setRedoCount(d.redo_count)
      setHistoryMap(d.cleaning_history)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const methods = METHODS[methodType].methods as Record<string, { params: readonly { key: string; default: unknown }[] }>
    const methodDef = methods[methodName]
    if (methodDef) {
      const defaults: Record<string, unknown> = {}
      for (const p of methodDef.params) defaults[p.key] = p.default
      setParams(defaults)
    }
    setPreview(null)
  }, [methodType, methodName])

  const sortedCols = [
    ...columns.filter(c => qualityMap[c]).sort((a, b) => (qualityMap[a]?.score ?? 100) - (qualityMap[b]?.score ?? 100)),
    ...columns.filter(c => !qualityMap[c]),
  ]

  const handlePreview = useCallback(async () => {
    if (!selectedCol) return
    setPreviewLoading(true)
    setPreview(null)
    try {
      const r = await previewClean(selectedCol, methodType, methodName, params)
      if (r.success) setPreview(r)
      else showAlert('error', 'Preview failed')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Preview failed')
    }
    setPreviewLoading(false)
  }, [selectedCol, methodType, methodName, params])

  const handleApply = useCallback(async () => {
    if (!selectedCol || !preview) {
      showAlert('warning', 'Please generate a preview first')
      return
    }
    setApplyLoading(true)
    try {
      const r = await applyClean(selectedCol, methodType, methodName, params)
      setUndoCount(r.undo_count)
      setRedoCount(r.redo_count)
      showAlert('success', `✅ ${r.message}`)
      setPreview(null)
      const hist = await getCleanHistory()
      setHistoryMap(hist.cleaning_history)
      
      // Update quality after apply
      getAllAnalysis().then(d => {
        const qa: Record<string, QualityInfo> = {}
        for (const [col, a] of Object.entries(d.column_analysis)) {
          const analysis = a as Record<string, unknown>
          if (analysis?.data_quality) qa[col] = analysis.data_quality as QualityInfo
        }
        setQualityMap(qa)
      }).catch(() => {})
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Apply failed')
    }
    setApplyLoading(false)
  }, [selectedCol, methodType, methodName, params, preview])

  const handleUndo = async () => {
    try {
      const r = await undoClean()
      setUndoCount(r.undo_count); setRedoCount(r.redo_count)
      showAlert(r.success ? 'success' : 'warning', r.message)
      setPreview(null)
      const hist = await getCleanHistory()
      setHistoryMap(hist.cleaning_history)
    } catch { showAlert('error', 'Undo failed') }
  }

  const handleRedo = async () => {
    try {
      const r = await redoClean()
      setUndoCount(r.undo_count); setRedoCount(r.redo_count)
      showAlert(r.success ? 'success' : 'warning', r.message)
      setPreview(null)
      const hist = await getCleanHistory()
      setHistoryMap(hist.cleaning_history)
    } catch { showAlert('error', 'Redo failed') }
  }

  const handleClearHistory = async () => {
    if (!confirm('Clear all cleaning history? This removes the operations log but keeps your cleaned data.')) return
    try {
      await clearCleanHistory()
      setHistoryMap({})
      showAlert('success', 'Cleaning history cleared')
    } catch { showAlert('error', 'Failed to clear history') }
  }

  const tabLabels = (Object.keys(METHODS) as MethodType[]).map(t => METHODS[t].label)
  const currentTabIdx = (Object.keys(METHODS) as MethodType[]).indexOf(methodType)

  const handleTabChange = (idx: number) => {
    const type = (Object.keys(METHODS) as MethodType[])[idx]
    setMethodType(type)
    setMethodName(Object.keys(METHODS[type].methods)[0])
    setPreview(null)
  }

  const methods = METHODS[methodType].methods as Record<string, { label: string; desc: string; params: readonly { key: string; label: string; type: string; options?: readonly string[]; min?: number; max?: number; step?: number; default: unknown }[] }>
  const currentMethod = methods[methodName]
  const colHistory = selectedCol ? (historyMap[selectedCol] as Record<string, unknown>[] | undefined) ?? [] : []

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cleaning Wizard</h1>
            <p className="text-slate-500 mt-1">Apply cleaning operations to your dataset columns</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleUndo} disabled={undoCount === 0}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Undo ({undoCount})
            </Button>
            <Button variant="outline" size="sm" onClick={handleRedo} disabled={redoCount === 0}>
              Redo ({redoCount})
              <RotateCw className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearHistory}
              disabled={Object.keys(historyMap).length === 0}
              className="text-red-500 hover:text-red-600 hover:border-red-300 disabled:opacity-40"
            >
              <X className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </div>
        </div>

        <DatasetBanner />

        {alert && <Alert type={alert.type} message={alert.message} className="mt-6 mb-6" />}

        <div className="flex gap-8 mt-6">
          {/* Left Sidebar */}
          <Card className="w-[280px] shrink-0 flex flex-col h-[calc(100vh-280px)] sticky top-8">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Columns</span>
                <Badge variant="info" className="text-[10px]">Quality Score</Badge>
              </div>
              <p className="text-[10px] text-slate-400">Sorted by quality (ascending)</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {sortedCols.map(col => {
                const q = qualityMap[col]
                const isActive = selectedCol === col
                const cleaned = historyMap[col] && (historyMap[col] as unknown[]).length > 0

                return (
                  <button
                    key={col}
                    onClick={() => { setSelectedCol(col); setPreview(null) }}
                    className={`w-full text-left p-3 rounded-md transition-all mb-1 group relative ${
                      isActive 
                        ? 'bg-blue-50 border-l-4 border-l-blue-600 pl-2' 
                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium truncate flex-1 ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                        {col}
                      </span>
                      {cleaned && <Trash2 className="w-3 h-3 text-emerald-500 ml-1" />}
                    </div>
                    {q ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <Badge variant={getGradeVariant(q.grade)} className="px-1 py-0 h-4 min-w-[18px] justify-center text-[10px]">
                            {q.grade}
                          </Badge>
                          <span className="font-medium text-slate-500">{q.score}%</span>
                        </div>
                        <ProgressBar value={q.score} className="h-1" />
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No analysis available</span>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Main Area */}
          <div className="flex-1 min-w-0 space-y-6">
            {!selectedCol ? (
              <Card className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">No Column Selected</h3>
                <p className="text-slate-500 max-w-sm mt-1">
                  Choose a column from the sidebar to start applying cleaning operations and improving your data quality.
                </p>
              </Card>
            ) : (
              <>
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Filter className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedCol}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        {qualityMap[selectedCol] && (
                          <>
                            <Badge variant={getGradeVariant(qualityMap[selectedCol].grade)}>
                              Grade {qualityMap[selectedCol].grade}
                            </Badge>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-medium text-slate-500">
                              {qualityMap[selectedCol].score}% Quality Score
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <Tabs tabs={tabLabels} active={currentTabIdx} onChange={handleTabChange} className="mb-6" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                    {Object.entries(methods).map(([key, m]) => {
                      const isSelected = methodName === key
                      return (
                        <button
                          key={key}
                          onClick={() => { setMethodName(key); setPreview(null) }}
                          className={`flex flex-col text-left p-4 rounded-lg border transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                              : 'border-slate-200 bg-white hover:border-blue-300'
                          }`}
                        >
                          <span className={`font-semibold text-sm mb-1 ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                            {m.label}
                          </span>
                          <span className="text-xs text-slate-500 line-clamp-2">
                            {m.desc}
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {currentMethod?.params && currentMethod.params.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-5 mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Sliders className="w-4 h-4 text-slate-400" />
                        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Parameters</h4>
                      </div>
                      <div className="space-y-4">
                        {currentMethod.params.map(p => (
                          <div key={p.key}>
                            {p.type === 'slider' && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <label className="text-xs font-semibold text-slate-600">{p.label}</label>
                                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                    {Number(params[p.key] ?? p.default)}
                                  </span>
                                </div>
                                <input 
                                  type="range" 
                                  min={p.min} 
                                  max={p.max} 
                                  step={(p as Record<string, unknown>).step as number ?? 1}
                                  value={Number(params[p.key] ?? p.default)}
                                  onChange={e => setParams(prev => ({ ...prev, [p.key]: Number(e.target.value) }))}
                                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                                />
                              </div>
                            )}
                            {p.type === 'select' && (
                              <SelectInput 
                                label={p.label}
                                value={String(params[p.key] ?? p.default)} 
                                onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                                options={((p as Record<string, unknown>).options as string[] | undefined) ?? []}
                              />
                            )}
                            {p.type === 'text' && (
                              <Input 
                                label={p.label}
                                type="text" 
                                value={String(params[p.key] ?? p.default)} 
                                onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      onClick={handlePreview} 
                      loading={previewLoading}
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview Impact
                    </Button>
                    <Button 
                      onClick={handleApply} 
                      loading={applyLoading} 
                      disabled={!preview}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Apply to Column
                    </Button>
                  </div>
                </Card>

                {preview && (
                  <Card className="overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                      <SectionHeader 
                        title="Impact Preview" 
                        subtitle="See how this operation will change your data before applying"
                        className="mb-0"
                      />
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <MetricCard 
                          label="Rows Affected" 
                          value={(preview.impact_stats?.rows_affected ?? preview.total_changes ?? 0).toLocaleString()} 
                          className="p-4"
                        />
                        <MetricCard 
                          label="% Changed" 
                          value={`${typeof preview.impact_stats?.percentage_changed === 'number' ? (preview.impact_stats.percentage_changed as number).toFixed(1) : '0'}%`} 
                          className="p-4"
                        />
                        <MetricCard 
                          label="Missing Before" 
                          value={String(preview.impact_stats?.missing_before ?? '0')} 
                          className="p-4"
                        />
                        <MetricCard 
                          label="Missing After" 
                          value={String(preview.impact_stats?.missing_after ?? '0')} 
                          className="p-4"
                        />
                      </div>

                      {preview.sample_changes.length > 0 ? (
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Sample Changes (showing {preview.sample_changes.length} of {preview.total_changes})
                          </h4>
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Row</th>
                                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Before</th>
                                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">After</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {preview.sample_changes.map((c, i) => (
                                  <tr key={i} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-xs text-slate-500 font-medium">#{c.index}</td>
                                    <td className="px-4 py-3 text-xs text-red-600 font-mono">
                                      {c.before === null || c.before === undefined ? <span className="text-slate-300 italic">null</span> : String(c.before)}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-emerald-600 font-mono">
                                      {c.after === null || c.after === undefined ? <span className="text-slate-300 italic">null</span> : String(c.after)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        preview.total_changes === 0 && (
                          <Alert 
                            type="info" 
                            message="No changes detected — the data may already satisfy the cleaning condition." 
                          />
                        )
                      )}
                    </div>
                  </Card>
                )}

                {colHistory.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">History</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>
                    
                    <Card className="overflow-hidden">
                      <div className="divide-y divide-slate-100">
                        {[...colHistory].reverse().map((op, i) => {
                          const o = op as Record<string, unknown>
                          return (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{String(o.method_name ?? 'Operation')}</div>
                                  <div className="text-xs text-slate-500">
                                    {String(o.rows_affected ?? 0)} rows affected
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                  {new Date(String(o.timestamp)).toLocaleDateString()}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(String(o.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Global Operations History Log */}
        {Object.keys(historyMap).length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Operations History</h2>
                  <p className="text-xs text-slate-500">All cleaning operations applied to this dataset</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="info">
                  {Object.values(historyMap).flat().length} operation{Object.values(historyMap).flat().length !== 1 ? 's' : ''}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-red-500 hover:text-red-600 hover:border-red-300"
                >
                  <X className="w-4 h-4 mr-1.5" />
                  Clear All History
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="divide-y divide-slate-100">
                {(() => {
                  const allOps: { col: string; op: Record<string, unknown> }[] = []
                  for (const [col, ops] of Object.entries(historyMap)) {
                    for (const op of ops as Record<string, unknown>[]) {
                      allOps.push({ col, op })
                    }
                  }
                  allOps.sort((a, b) =>
                    String(a.op.timestamp ?? '').localeCompare(String(b.op.timestamp ?? ''))
                  )
                  return [...allOps].reverse().map(({ col, op }, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">
                            {String(op.method_name ?? 'Operation')}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{col}</span>
                            <span>{String(op.rows_affected ?? 0)} rows affected</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {op.timestamp ? new Date(String(op.timestamp)).toLocaleDateString() : '—'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {op.timestamp ? new Date(String(op.timestamp)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
