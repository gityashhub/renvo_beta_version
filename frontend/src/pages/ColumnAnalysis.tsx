import { useState, useEffect, useCallback, useRef } from 'react'
import { getAllAnalysis, analyzeColumn, getDistribution } from '../api/cleaning'
import { getColumnTypes } from '../api/dataset'
import { Button, Card, Alert, MetricCard, SectionHeader, Badge, Tabs, ProgressBar } from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'
import { CheckCircle2, AlertTriangle, Search, Database } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { Plotly: any } }
/* eslint-enable @typescript-eslint/no-explicit-any */

type AlertKind = 'success' | 'error' | 'info' | 'warning'
type AlertState = { type: AlertKind; message: string } | null

interface Analysis {
  column_name: string
  basic_info: Record<string, number | string | null>
  missing_analysis: Record<string, unknown>
  outlier_analysis: { method_results: Record<string, unknown>; summary: Record<string, unknown> }
  distribution_analysis: Record<string, unknown>
  data_quality: { score: number; grade: string; issues: string[] }
  cleaning_recommendations: string[]
}

function qualityColor(score: number) {
  if (score >= 80) return '#059669' // emerald-600
  if (score >= 60) return '#d97706' // amber-600
  return '#ef4444' // red-500
}

function getBadgeVariant(score: number): 'success' | 'warning' | 'error' {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'error'
}

function PlotlyChart({ chartJson }: { chartJson: Record<string, unknown> | null }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartJson || !ref.current) return
    const timer = setTimeout(() => {
      if (window.Plotly && ref.current) {
        try {
          const { data, layout } = chartJson as { data: unknown[]; layout: unknown }
          window.Plotly.newPlot(ref.current, data ?? [], {
            ...(layout as any ?? {}),
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Inter, sans-serif' },
            margin: { t: 20, r: 20, b: 40, l: 40 }
          }, { responsive: true, displayModeBar: false })
        } catch {}
      }
    }, 100)
    return () => {
      clearTimeout(timer)
      if (ref.current && window.Plotly) {
        try { window.Plotly.purge(ref.current) } catch {}
      }
    }
  }, [chartJson])

  return (
    <div ref={ref} className="w-full min-h-[350px]">
      {!window.Plotly && (
        <div className="flex items-center justify-center h-[350px] text-slate-400 text-sm">
          Loading chart...
        </div>
      )}
    </div>
  )
}

export default function ColumnAnalysis() {
  const [alert, setAlert] = useState<AlertState>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [allAnalysis, setAllAnalysis] = useState<Record<string, Analysis>>({})
  const [selectedCol, setSelectedCol] = useState<string | null>(null)
  const [chartJson, setChartJson] = useState<Record<string, unknown> | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingDist, setLoadingDist] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const showAlert = (type: AlertKind, msg: string) => {
    setAlert({ type, message: msg })
    setTimeout(() => setAlert(null), 5000)
  }

  useEffect(() => {
    getColumnTypes().then(d => setColumns(Object.keys(d.column_types))).catch(() => {})
    getAllAnalysis().then(d => setAllAnalysis(d.column_analysis as Record<string, Analysis>)).catch(() => {})
  }, [])

  const handleAnalyze = useCallback(async (col: string) => {
    setAnalyzing(true)
    setChartJson(null)
    try {
      const result = await analyzeColumn(col)
      setAllAnalysis(prev => ({ ...prev, [col]: result }))
      setSelectedCol(col)
      showAlert('success', `✅ Analysis complete for '${col}'`)
      setLoadingDist(true)
      const dist = await getDistribution(col)
      setChartJson(dist as Record<string, unknown>)
    } catch { showAlert('error', 'Analysis failed') }
    setAnalyzing(false)
    setLoadingDist(false)
  }, [])

  const handleSelectCol = useCallback(async (col: string) => {
    setSelectedCol(col)
    setChartJson(null)
    setActiveTab(0)
    if (allAnalysis[col]) {
      setLoadingDist(true)
      try {
        const dist = await getDistribution(col)
        setChartJson(dist as Record<string, unknown>)
      } catch {}
      setLoadingDist(false)
    }
  }, [allAnalysis])

  const sortedCols = [
    ...columns.filter(c => allAnalysis[c]).sort((a, b) => (allAnalysis[a]?.data_quality?.score ?? 100) - (allAnalysis[b]?.data_quality?.score ?? 100)),
    ...columns.filter(c => !allAnalysis[c]),
  ]

  const analysis = selectedCol ? allAnalysis[selectedCol] : null
  const bi = analysis?.basic_info ?? {}
  const ma = (analysis?.missing_analysis ?? {}) as Record<string, unknown>
  const oa = analysis?.outlier_analysis ?? { method_results: {}, summary: {} }
  const da = (analysis?.distribution_analysis ?? {}) as Record<string, unknown>
  const dq = analysis?.data_quality ?? { score: 0, grade: '?', issues: [] }
  const cr = analysis?.cleaning_recommendations ?? []

  const n = (v: unknown) => {
    if (v === null || v === undefined) return 'N/A'
    if (typeof v === 'number') {
      if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`
      if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`
      return !Number.isInteger(v) ? v.toFixed(3) : String(v)
    }
    return String(v)
  }

  const tabs = ["Overview", "Missing Values", "Outliers", "Recommendations"]

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-6 min-h-screen bg-slate-50">
      <div>
        <SectionHeader 
          title="Column Analysis" 
          subtitle="Deep statistical analysis and quality assessment per column"
        />
        <DatasetBanner />
      </div>

      {alert && <Alert type={alert.type} message={alert.message} className="mb-6" />}

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column List */}
        <div className="col-span-12 lg:col-span-4">
          <Card className="flex flex-col h-full max-h-[800px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Column</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {sortedCols.map(col => {
                const a = allAnalysis[col]
                const score = a?.data_quality?.score
                const isSelected = selectedCol === col
                return (
                  <button
                    key={col}
                    onClick={() => handleSelectCol(col)}
                    className={`w-full text-left p-3 rounded-md transition-all border-l-[3px] ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-600' 
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                        {col}
                      </span>
                      {score !== undefined && (
                        <Badge variant={getBadgeVariant(score)}>
                          {score}%
                        </Badge>
                      )}
                    </div>
                    {score !== undefined ? (
                      <ProgressBar value={score} color={qualityColor(score)} className="h-1" />
                    ) : (
                      <span className="text-[10px] text-slate-400 uppercase tracking-tighter">Not analyzed</span>
                    )}
                  </button>
                )
              })}
            </div>
            {selectedCol && (
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <Button 
                  onClick={() => handleAnalyze(selectedCol)} 
                  loading={analyzing} 
                  className="w-full"
                  variant="primary"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {analysis ? 'Re-analyze Column' : 'Analyze Column'}
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right Detail Panel */}
        <div className="col-span-12 lg:col-span-8">
          {!selectedCol ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                <Database className="w-8 h-8 text-slate-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Select a column</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Choose a column from the list to view its statistical profile and quality score.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900">Column: {selectedCol}</h2>
                    {analysis && (
                      <Badge variant={getBadgeVariant(dq.score)} className="text-sm px-3 py-1">
                        Grade {dq.grade}
                      </Badge>
                    )}
                  </div>
                </div>

                {analysis ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-center">
                        <div className="text-4xl font-black text-slate-900">{dq.score}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Quality Score</div>
                      </div>
                      <div className="flex-1">
                        <ProgressBar value={dq.score} color={qualityColor(dq.score)} className="h-3" />
                        <p className="text-sm text-slate-600 mt-2">
                          {dq.issues.length > 0 
                            ? `Identified ${dq.issues.length} potential issues in this column.` 
                            : 'This column meets all quality standards.'}
                        </p>
                      </div>
                    </div>

                    <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

                    <div className="mt-6">
                      {activeTab === 0 && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard label="Total Values" value={n(bi.count)} icon="🔢" />
                            <MetricCard label="Missing" value={n(bi.missing_count)} icon="❓" />
                            <MetricCard label="Missing %" value={`${typeof bi.missing_percentage === 'number' ? bi.missing_percentage.toFixed(1) : 'N/A'}%`} icon="📊" />
                            <MetricCard label="Unique Values" value={n(bi.unique_count)} icon="🔑" />
                          </div>
                          
                          {bi.mean !== undefined && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <MetricCard label="Mean" value={n(bi.mean)} icon="📈" />
                              <MetricCard label="Median" value={n(bi.median)} icon="📉" />
                              <MetricCard label="Std Dev" value={n(bi.std)} icon="📐" />
                              <MetricCard label="Range" value={`${n(bi.min)} – ${n(bi.max)}`} icon="↔️" />
                            </div>
                          )}

                          <Card className="overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-700">Distribution</h4>
                            </div>
                            <div className="p-4">
                              {loadingDist ? (
                                <div className="flex items-center justify-center h-[350px] text-slate-400 text-sm">Loading chart...</div>
                              ) : chartJson ? (
                                <PlotlyChart chartJson={chartJson} />
                              ) : (
                                <div className="flex items-center justify-center h-[350px] text-slate-400 text-sm italic">No distribution data available</div>
                              )}
                            </div>
                          </Card>

                          {da.type === 'numeric' && (
                            <Card className="p-6">
                              <h4 className="text-sm font-semibold text-slate-700 mb-4">Statistical Shape</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                  <div className="text-xs text-slate-500 font-medium">Skewness</div>
                                  <div className="text-xl font-bold text-slate-900">{typeof da.skewness === 'number' ? (da.skewness as number).toFixed(3) : 'N/A'}</div>
                                  <Badge variant={(Math.abs(da.skewness as number) < 0.5) ? 'success' : (Math.abs(da.skewness as number) < 1) ? 'warning' : 'error'} className="mt-1">
                                    {(Math.abs(da.skewness as number) < 0.5) ? 'Approx. Normal' : (Math.abs(da.skewness as number) < 1) ? 'Mod. Skewed' : 'Highly Skewed'}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs text-slate-500 font-medium">Kurtosis</div>
                                  <div className="text-xl font-bold text-slate-900">{typeof da.kurtosis === 'number' ? (da.kurtosis as number).toFixed(3) : 'N/A'}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-xs text-slate-500 font-medium">Normality (Shapiro-Wilk)</div>
                                  <div className={`text-sm font-semibold ${(da.normality_test as any)?.is_normal ? 'text-emerald-600' : 'text-slate-600'}`}>
                                    {(da.normality_test as any)?.is_normal ? 'Passed (Normal)' : 'Failed (Non-Normal)'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">p-value: {typeof (da.normality_test as any)?.shapiro_p === 'number' ? (da.normality_test as any).shapiro_p.toFixed(4) : 'N/A'}</div>
                                </div>
                              </div>
                            </Card>
                          )}
                        </div>
                      )}

                      {activeTab === 1 && (
                        <div className="space-y-4">
                          {ma.total_missing === 0 ? (
                            <Alert type="success" message="No missing values detected in this column." />
                          ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <MetricCard label="Total Missing" value={n(ma.total_missing)} icon="❓" />
                                <MetricCard label="Missing %" value={`${typeof ma.percentage === 'number' ? (ma.percentage as number).toFixed(2) : 'N/A'}%`} icon="📊" />
                                <MetricCard label="Pattern" value={String(ma.pattern_type ?? 'unknown')} icon="🔍" />
                              </div>
                              <Card className="p-4 bg-amber-50/50 border-amber-100">
                                <h4 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4" /> Missing Data Pattern
                                </h4>
                                <p className="text-sm text-amber-700">
                                  The identified pattern is <strong>{String(ma.pattern_type ?? 'unknown')}</strong>. 
                                  Check recommendations for how to handle these gaps.
                                </p>
                              </Card>
                            </>
                          )}
                        </div>
                      )}

                      {activeTab === 2 && (
                        <div className="space-y-4">
                          {Object.keys(oa.method_results ?? {}).length === 0 ? (
                            <Alert type="info" message="Outlier detection is not applicable for this data type." />
                          ) : (
                            <div className="grid grid-cols-1 gap-4">
                              {Object.entries(oa.method_results).map(([key, r]) => {
                                const res = r as any
                                if (res.note) return (
                                  <div key={key} className="p-4 bg-slate-50 rounded-lg text-sm text-slate-500 italic">
                                    {res.note}
                                  </div>
                                )
                                return (
                                  <MetricCard
                                    key={key}
                                    label={`${res.method} Result`}
                                    value={`${n(res.outlier_count)} outliers`}
                                    sub={`${typeof res.outlier_percentage === 'number' ? res.outlier_percentage.toFixed(1) : '0'}% of data`}
                                    icon={(res.outlier_count as number) > 0 ? <AlertTriangle className="text-amber-500" /> : <CheckCircle2 className="text-emerald-500" />}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 3 && (
                        <div className="space-y-4">
                          {cr.length === 0 ? (
                            <Alert type="success" message="Everything looks good! No specific cleaning actions recommended." />
                          ) : (
                            <div className="space-y-3">
                              {cr.map((rec, i) => (
                                <div key={i} className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-lg shadow-sm">
                                  <div className="mt-1 shrink-0">
                                    {rec.toLowerCase().includes('missing') || rec.toLowerCase().includes('outlier') 
                                      ? <AlertTriangle className="w-5 h-5 text-amber-500" /> 
                                      : <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                                  </div>
                                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{rec}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {dq.issues.length > 0 && (
                            <div className="mt-8">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Known Data Issues</h4>
                              <div className="space-y-2">
                                {dq.issues.map((issue, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                    {issue}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="text-slate-600 mb-6">Click the analyze button to generate statistical insights for this column.</p>
                    <Button onClick={() => handleAnalyze(selectedCol)} loading={analyzing} size="lg">
                      Start Analysis
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
