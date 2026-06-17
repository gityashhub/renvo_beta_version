import { useState, useEffect, useCallback } from 'react'
import { previewClean, applyClean, undoClean, redoClean, getCleanHistory } from '../api/cleaning'
import { getAllAnalysis } from '../api/cleaning'
import { getColumnTypes } from '../api/dataset'
import { Button, Card, Alert, MetricCard, SectionHeader, Divider } from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'

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
    label: '❌ Missing Values',
    methods: {
      mean_imputation: { label: '📊 Mean Imputation', desc: 'Replace missing values with column mean. Numeric only.', params: [] },
      median_imputation: { label: '📊 Median Imputation', desc: 'Replace missing values with column median. Numeric only.', params: [] },
      mode_imputation: { label: '📊 Mode Imputation', desc: 'Replace missing values with most frequent value.', params: [] },
      forward_fill: { label: '➡️ Forward Fill', desc: 'Propagate last valid value forward.', params: [] },
      backward_fill: { label: '⬅️ Backward Fill', desc: 'Use next valid value to fill backwards.', params: [] },
      knn_imputation: { label: '🎯 KNN Imputation', desc: 'Use K-nearest neighbors for numeric imputation.', params: [{ key: 'n_neighbors', label: 'Neighbors', type: 'slider', min: 3, max: 10, default: 5 }] },
      interpolation: { label: '📈 Interpolation', desc: 'Interpolate values between known data points. Numeric only.', params: [{ key: 'method', label: 'Method', type: 'select', options: ['linear', 'polynomial', 'spline'], default: 'linear' }] },
      missing_category: { label: '📁 Missing Category', desc: 'Create a dedicated "Missing" category.', params: [{ key: 'category_name', label: 'Category name', type: 'text', default: 'Missing' }] },
      regression_imputation: { label: '🔬 Regression Imputation', desc: 'Predict missing values using regression. Numeric only.', params: [] },
    },
  },
  outliers: {
    label: '⚡ Outliers',
    methods: {
      iqr_removal: { label: '📦 IQR Removal', desc: 'Remove values outside Q1 - k*IQR and Q3 + k*IQR bounds.', params: [{ key: 'multiplier', label: 'IQR multiplier', type: 'slider', min: 1.0, max: 3.0, default: 1.5, step: 0.1 }] },
      zscore_removal: { label: '📊 Z-Score Removal', desc: 'Remove values with |z-score| > threshold.', params: [{ key: 'threshold', label: 'Z-score threshold', type: 'slider', min: 2.0, max: 4.0, default: 3.0, step: 0.1 }] },
      winsorization: { label: '✂️ Winsorization', desc: 'Cap extreme values at specified percentiles.', params: [{ key: 'lower_percentile', label: 'Lower %', type: 'slider', min: 0.1, max: 10, default: 5, step: 0.1 }, { key: 'upper_percentile', label: 'Upper %', type: 'slider', min: 90, max: 99.9, default: 95, step: 0.1 }] },
      log_transformation: { label: '📈 Log Transformation', desc: 'Apply log transform to reduce skewness and outlier impact.', params: [] },
      cap_outliers: { label: '🧢 Cap Outliers', desc: 'Cap outliers at bounds instead of removing them.', params: [{ key: 'method', label: 'Capping method', type: 'select', options: ['iqr', 'percentile'], default: 'iqr' }] },
      isolation_forest: { label: '🌲 Isolation Forest', desc: 'ML-based outlier detection using random forests.', params: [{ key: 'contamination', label: 'Contamination rate', type: 'slider', min: 0.01, max: 0.2, default: 0.1, step: 0.01 }] },
    },
  },
  data_quality: {
    label: '🔧 Text & Quality',
    methods: {
      trim_whitespace: { label: '✂️ Trim Whitespace', desc: 'Remove leading/trailing whitespace from text values.', params: [] },
      standardize_case: { label: '🔤 Standardize Case', desc: 'Normalize text to a consistent case.', params: [{ key: 'case_type', label: 'Case type', type: 'select', options: ['lower', 'upper', 'title'], default: 'lower' }] },
      remove_duplicates: { label: '🗑️ Remove Duplicates', desc: 'Remove duplicate rows based on this column\'s values.', params: [{ key: 'keep', label: 'Which to keep', type: 'select', options: ['first', 'last'], default: 'first' }] },
    },
  },
} as const

type MethodType = keyof typeof METHODS

function qualityColor(score: number) {
  if (score >= 80) return 'var(--success)'
  if (score >= 60) return 'var(--warning)'
  return 'var(--error)'
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
    } catch { showAlert('error', 'Undo failed') }
  }

  const handleRedo = async () => {
    try {
      const r = await redoClean()
      setUndoCount(r.undo_count); setRedoCount(r.redo_count)
      showAlert(r.success ? 'success' : 'warning', r.message)
      setPreview(null)
    } catch { showAlert('error', 'Redo failed') }
  }

  const methods = METHODS[methodType].methods as Record<string, { label: string; desc: string; params: readonly { key: string; label: string; type: string; options?: readonly string[]; min?: number; max?: number; step?: number; default: unknown }[] }>
  const currentMethod = methods[methodName]
  const colHistory = selectedCol ? (historyMap[selectedCol] as Record<string, unknown>[] | undefined) ?? [] : []

  return (
    <div style={{ padding: 32, maxWidth: 1200, display: 'flex', gap: 24 }}>
      {/* ── LEFT PANEL ── */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--neutral-600)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Columns</div>
        <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginBottom: 8 }}>Sorted by quality ↑</div>
        <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
          {sortedCols.map(col => {
            const q = qualityMap[col]
            const cleaned = historyMap[col] && (historyMap[col] as unknown[]).length > 0
            return (
              <div key={col}
                onClick={() => { setSelectedCol(col); setPreview(null) }}
                style={{
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 4,
                  background: selectedCol === col ? 'var(--primary-light)' : 'transparent',
                  border: selectedCol === col ? '1px solid var(--primary)' : '1px solid transparent',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{col}</span>
                  {cleaned && <span style={{ fontSize: 10, marginLeft: 4 }}>🧹</span>}
                </div>
                {q
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: qualityColor(q.score) }} />
                    <span style={{ fontSize: 11, color: 'var(--neutral-500)' }}>{q.score}%</span>
                  </div>
                  : <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>No analysis</span>
                }
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--neutral-200)' }}>
          <div style={{ fontSize: 11, color: 'var(--neutral-500)' }}>
            {Object.values(historyMap).reduce((s, h) => s + h.length, 0)} ops across {Object.keys(historyMap).length} cols
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, marginBottom: 4 }}>🧹 Cleaning Wizard</h1>
            <p style={{ color: 'var(--neutral-500)', fontSize: 14 }}>Apply cleaning methods with impact assessment and undo/redo support.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button variant="secondary" onClick={handleUndo} disabled={undoCount === 0}>↶ Undo ({undoCount})</Button>
            <Button variant="secondary" onClick={handleRedo} disabled={redoCount === 0}>Redo ({redoCount}) ↷</Button>
          </div>
        </div>

        <DatasetBanner />

        {alert && <div style={{ marginBottom: 16 }}><Alert type={alert.type} message={alert.message} /></div>}

        {!selectedCol && (
          <Card style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👈</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Select a column</div>
            <div style={{ color: 'var(--neutral-500)', fontSize: 14 }}>Choose a column from the left panel to begin cleaning.</div>
          </Card>
        )}

        {selectedCol && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedCol}</div>
              {qualityMap[selectedCol] && (
                <div style={{ padding: '4px 10px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: qualityColor(qualityMap[selectedCol].score) + '22', color: qualityColor(qualityMap[selectedCol].score) }}>
                  {qualityMap[selectedCol].score}/100
                </div>
              )}
            </div>

            <Card style={{ marginBottom: 20 }}>
              <SectionHeader title="1. Choose Cleaning Method" />

              {/* Method type tabs */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--neutral-200)', paddingBottom: 0 }}>
                {(Object.keys(METHODS) as MethodType[]).map(t => (
                  <button key={t} onClick={() => { setMethodType(t); setMethodName(Object.keys(METHODS[t].methods)[0]); setPreview(null) }}
                    style={{ padding: '8px 14px', fontSize: 13, fontWeight: methodType === t ? 600 : 400, color: methodType === t ? 'var(--primary)' : 'var(--neutral-500)', borderBottom: methodType === t ? '2px solid var(--primary)' : '2px solid transparent', background: 'none', cursor: 'pointer' }}>
                    {METHODS[t].label}
                  </button>
                ))}
              </div>

              {/* Method selector */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral-600)', display: 'block', marginBottom: 4 }}>Method</label>
                <select value={methodName} onChange={e => { setMethodName(e.target.value); setPreview(null) }}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--neutral-300)', borderRadius: 6, fontSize: 13 }}>
                  {Object.entries(methods).map(([key, m]) => (
                    <option key={key} value={key}>{m.label}</option>
                  ))}
                </select>
                {currentMethod?.desc && (
                  <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 6 }}>{currentMethod.desc}</div>
                )}
              </div>

              {/* Parameters */}
              {currentMethod?.params && currentMethod.params.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <SectionHeader title="2. Parameters" />
                  {currentMethod.params.map(p => (
                    <div key={p.key} style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral-600)', display: 'block', marginBottom: 4 }}>{p.label}</label>
                      {p.type === 'slider' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input type="range" min={p.min} max={p.max} step={(p as Record<string, unknown>).step as number ?? 1}
                            value={Number(params[p.key] ?? p.default)}
                            onChange={e => setParams(prev => ({ ...prev, [p.key]: Number(e.target.value) }))}
                            style={{ flex: 1 }} />
                          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 40 }}>{Number(params[p.key] ?? p.default)}</span>
                        </div>
                      )}
                      {p.type === 'select' && (
                        <select value={String(params[p.key] ?? p.default)} onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--neutral-300)', borderRadius: 6, fontSize: 13 }}>
                          {((p as Record<string, unknown>).options as string[] | undefined)?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      )}
                      {p.type === 'text' && (
                        <input type="text" value={String(params[p.key] ?? p.default)} onChange={e => setParams(prev => ({ ...prev, [p.key]: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--neutral-300)', borderRadius: 6, fontSize: 13 }} />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <Button variant="secondary" onClick={handlePreview} loading={previewLoading}>👁️ Preview Changes</Button>
                <Button onClick={handleApply} loading={applyLoading} disabled={!preview}>✅ Apply Changes</Button>
              </div>
            </Card>

            {/* Preview results */}
            {preview && (
              <Card style={{ marginBottom: 20 }}>
                <SectionHeader title="3. Impact Preview" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  <MetricCard label="Rows Affected" value={(preview.impact_stats?.rows_affected ?? preview.total_changes ?? 0).toLocaleString()} icon="✏️" />
                  <MetricCard label="% Changed" value={`${typeof preview.impact_stats?.percentage_changed === 'number' ? (preview.impact_stats.percentage_changed as number).toFixed(1) : '0'}%`} icon="📊" />
                  <MetricCard label="Missing Before" value={String(preview.impact_stats?.missing_before ?? 'N/A')} icon="❓" />
                  <MetricCard label="Missing After" value={String(preview.impact_stats?.missing_after ?? 'N/A')} icon="✅" />
                </div>

                {preview.sample_changes.length > 0 && (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Sample Changes (showing {preview.sample_changes.length} of {preview.total_changes}):</div>
                    <div style={{ overflowX: 'auto', border: '1px solid var(--neutral-200)', borderRadius: 6 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>
                          {['Row', 'Before', 'After'].map(h => <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--neutral-500)', background: 'var(--neutral-100)', borderBottom: '1px solid var(--neutral-200)' }}>{h}</th>)}
                        </tr></thead>
                        <tbody>{preview.sample_changes.map((c, i) => (
                          <tr key={i}>
                            <td style={{ padding: '7px 12px', fontSize: 12, borderBottom: '1px solid var(--neutral-100)' }}>{c.index}</td>
                            <td style={{ padding: '7px 12px', fontSize: 12, borderBottom: '1px solid var(--neutral-100)', color: 'var(--error)', fontFamily: 'monospace' }}>
                              {c.before === null || c.before === undefined ? <em style={{ color: 'var(--neutral-400)' }}>null</em> : String(c.before)}
                            </td>
                            <td style={{ padding: '7px 12px', fontSize: 12, borderBottom: '1px solid var(--neutral-100)', color: 'var(--success)', fontFamily: 'monospace' }}>
                              {c.after === null || c.after === undefined ? <em style={{ color: 'var(--neutral-400)' }}>null</em> : String(c.after)}
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </>
                )}
                {preview.total_changes === 0 && (
                  <Alert type="info" message="No changes detected — the data may already satisfy the cleaning condition." />
                )}
              </Card>
            )}

            {colHistory.length > 0 && (
              <>
                <Divider />
                <SectionHeader title={`📝 History for '${selectedCol}' (${colHistory.length} operations)`} />
                <Card>
                  {[...colHistory].reverse().map((op, i) => {
                    const o = op as Record<string, unknown>
                    return (
                      <div key={i} style={{ padding: '8px 0', borderBottom: i < colHistory.length - 1 ? '1px solid var(--neutral-100)' : 'none' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{String(o.method_name ?? 'Operation')}</div>
                        <div style={{ fontSize: 12, color: 'var(--neutral-500)' }}>
                          {String(o.rows_affected ?? 0)} rows affected · {String(o.timestamp ?? '').slice(0, 19)}
                        </div>
                      </div>
                    )
                  })}
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
