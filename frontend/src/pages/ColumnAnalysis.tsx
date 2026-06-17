import { useState, useEffect, useCallback, useRef } from 'react'
import { getAllAnalysis, analyzeColumn, getDistribution } from '../api/cleaning'
import { getColumnTypes } from '../api/dataset'
import { Button, Card, Alert, MetricCard, SectionHeader, Divider } from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'

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
  if (score >= 80) return 'var(--success)'
  if (score >= 60) return 'var(--warning)'
  return 'var(--error)'
}

function PlotlyChart({ chartJson }: { chartJson: Record<string, unknown> | null }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartJson || !ref.current) return
    const timer = setTimeout(() => {
      if (window.Plotly && ref.current) {
        try {
          const { data, layout } = chartJson as { data: unknown[]; layout: unknown }
          window.Plotly.newPlot(ref.current, data ?? [], layout ?? {}, { responsive: true, displayModeBar: false })
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
    <div ref={ref} style={{ width: '100%', minHeight: 300 }}>
      {!window.Plotly && <div style={{ fontSize: 13, color: 'var(--neutral-400)', textAlign: 'center', padding: 40 }}>Loading chart…</div>}
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

  return (
    <div style={{ padding: 32, maxWidth: 1200, display: 'flex', gap: 24 }}>
      {/* ── LEFT PANEL ── */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--neutral-600)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Columns</div>
        <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginBottom: 8 }}>Sorted by quality score ↑</div>
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {sortedCols.map(col => {
            const a = allAnalysis[col]
            const score = a?.data_quality?.score
            return (
              <div key={col}
                onClick={() => handleSelectCol(col)}
                style={{
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                  background: selectedCol === col ? 'var(--primary-light)' : 'transparent',
                  border: selectedCol === col ? '1px solid var(--primary)' : '1px solid transparent',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--neutral-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col}</div>
                {score !== undefined
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: qualityColor(score), flexShrink: 0 }} />
                    <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>{score}%</div>
                  </div>
                  : <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 2 }}>Not analyzed</div>
                }
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>📊 Column Analysis</h1>
          <p style={{ color: 'var(--neutral-500)', fontSize: 14, marginBottom: 16 }}>Per-column statistical profiling and quality scoring.</p>
          <DatasetBanner />
        </div>
        {alert && <div style={{ marginBottom: 16 }}><Alert type={alert.type} message={alert.message} /></div>}

        {!selectedCol && (
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👈</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Select a column</div>
            <div style={{ color: 'var(--neutral-500)', fontSize: 14 }}>Choose a column from the left panel, then click Analyze to view detailed statistics.</div>
          </Card>
        )}

        {selectedCol && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedCol}</div>
              {analysis && (
                <div style={{ padding: '4px 10px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: qualityColor(dq.score) + '22', color: qualityColor(dq.score) }}>
                  {dq.score}/100 ({dq.grade})
                </div>
              )}
              <Button onClick={() => handleAnalyze(selectedCol)} loading={analyzing} style={{ marginLeft: 'auto' }}>
                🔍 {analysis ? 'Re-analyze' : 'Analyze'}
              </Button>
            </div>

            {!analysis && !analyzing && (
              <Alert type="info" message={`Click "Analyze" to run statistical analysis on '${selectedCol}'.`} />
            )}

            {analysis && (
              <>
                {dq.issues.length > 0 && (
                  <Card style={{ marginBottom: 16, borderColor: 'var(--warning)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>⚠️ Quality Issues</div>
                    {dq.issues.map((issue, i) => <div key={i} style={{ fontSize: 13, color: 'var(--neutral-700)', marginBottom: 4 }}>• {issue}</div>)}
                  </Card>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                  <MetricCard label="Total Values" value={n(bi.count)} icon="🔢" />
                  <MetricCard label="Missing" value={n(bi.missing_count)} icon="❓" />
                  <MetricCard label="Missing %" value={`${typeof bi.missing_percentage === 'number' ? bi.missing_percentage.toFixed(1) : 'N/A'}%`} icon="📊" />
                  <MetricCard label="Unique Values" value={n(bi.unique_count)} icon="🔑" />
                </div>

                {bi.mean !== undefined && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                    <MetricCard label="Mean" value={n(bi.mean)} icon="📈" />
                    <MetricCard label="Median" value={n(bi.median)} icon="📉" />
                    <MetricCard label="Std Dev" value={n(bi.std)} icon="📐" />
                    <MetricCard label="Range" value={`${n(bi.min)} – ${n(bi.max)}`} icon="↔️" />
                  </div>
                )}

                <Divider />

                <SectionHeader title="📈 Distribution" />
                <Card style={{ marginBottom: 20 }}>
                  {loadingDist && <div style={{ fontSize: 13, color: 'var(--neutral-500)', textAlign: 'center', padding: 20 }}>Loading chart…</div>}
                  {!loadingDist && chartJson && <PlotlyChart chartJson={chartJson} />}
                  {!loadingDist && !chartJson && <div style={{ fontSize: 13, color: 'var(--neutral-400)', textAlign: 'center', padding: 20 }}>No distribution data</div>}
                </Card>

                <SectionHeader title="❌ Missing Data" />
                <Card style={{ marginBottom: 20 }}>
                  {ma.total_missing === 0
                    ? <Alert type="success" message="✅ No missing values in this column!" />
                    : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                      <MetricCard label="Total Missing" value={n(ma.total_missing)} icon="❓" />
                      <MetricCard label="Missing %" value={`${typeof ma.percentage === 'number' ? (ma.percentage as number).toFixed(2) : 'N/A'}%`} icon="📊" />
                      <MetricCard label="Pattern" value={String(ma.pattern_type ?? 'unknown')} icon="🔍" />
                    </div>
                  }
                </Card>

                <SectionHeader title="⚡ Outlier Detection" />
                <Card style={{ marginBottom: 20 }}>
                  {Object.keys(oa.method_results ?? {}).length === 0
                    ? <Alert type="info" message="Outlier detection not applicable for this column type." />
                    : (
                      <div>
                        {Object.entries(oa.method_results).map(([key, r]) => {
                          const res = r as Record<string, unknown>
                          if (res.note) return <div key={key} style={{ fontSize: 13, color: 'var(--neutral-500)', padding: 8 }}>ℹ️ {String(res.note)}</div>
                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--neutral-100)' }}>
                              <span style={{ fontSize: 13 }}>{String(res.method)}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: (res.outlier_count as number) > 0 ? 'var(--warning)' : 'var(--success)' }}>
                                {n(res.outlier_count)} ({typeof res.outlier_percentage === 'number' ? (res.outlier_percentage as number).toFixed(1) : '0'}%)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                </Card>

                {da.type === 'numeric' && (
                  <>
                    <SectionHeader title="📊 Distribution Statistics" />
                    <Card style={{ marginBottom: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4 }}>Skewness</div>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>{typeof da.skewness === 'number' ? (da.skewness as number).toFixed(3) : 'N/A'}</div>
                          <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>{(Math.abs(da.skewness as number) < 0.5) ? '✅ Approx. Normal' : (Math.abs(da.skewness as number) < 1) ? '⚠️ Mod. Skewed' : '🔴 Highly Skewed'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4 }}>Kurtosis</div>
                          <div style={{ fontSize: 18, fontWeight: 700 }}>{typeof da.kurtosis === 'number' ? (da.kurtosis as number).toFixed(3) : 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginBottom: 4 }}>Normality Test (Shapiro)</div>
                          <div style={{ fontSize: 14, fontWeight: 600 }}>{(da.normality_test as Record<string, unknown>)?.is_normal ? '✅ Normal' : '❌ Not Normal'}</div>
                          <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>p = {typeof (da.normality_test as Record<string, unknown>)?.shapiro_p === 'number' ? ((da.normality_test as Record<string, unknown>).shapiro_p as number).toFixed(4) : 'N/A'}</div>
                        </div>
                      </div>
                    </Card>
                  </>
                )}

                {cr.length > 0 && (
                  <>
                    <SectionHeader title="🎯 Cleaning Recommendations" />
                    <Card>
                      {cr.map((rec, i) => <div key={i} style={{ fontSize: 13, padding: '6px 0', borderBottom: i < cr.length - 1 ? '1px solid var(--neutral-100)' : 'none' }}>• {rec}</div>)}
                    </Card>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
