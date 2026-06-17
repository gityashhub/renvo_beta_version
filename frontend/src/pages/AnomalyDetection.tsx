import { useState, useEffect, useCallback } from 'react'
import {
  scanAllAnomalies, scanColumnAnomalies, nullifyAnomalies,
  fixColumn, getDuplicates, checkDuplicates, removeDuplicates,
} from '../api/cleaning'
import { getColumnTypes } from '../api/dataset'
import { Button, Card, Alert, MetricCard, Tabs, SelectInput, SectionHeader, Divider } from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'

type AlertKind = 'success' | 'error' | 'info' | 'warning'
type AlertState = { type: AlertKind; message: string } | null

interface AnomalyEntry { row_index: number; value: string; reason: string }
interface ColumnResult {
  expected_type: string; anomaly_count: number; anomaly_percentage: number;
  total_values: number; anomalies: AnomalyEntry[]
}

const th: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--neutral-500)', background: 'var(--neutral-100)', borderBottom: '1px solid var(--neutral-200)' }
const td: React.CSSProperties = { padding: '8px 12px', fontSize: 13, borderBottom: '1px solid var(--neutral-100)' }

export default function AnomalyDetection() {
  const [tab, setTab] = useState(0)
  const [alert, setAlert] = useState<AlertState>(null)
  const [loading, setLoading] = useState(false)

  // Type anomalies
  const [scanResults, setScanResults] = useState<Record<string, ColumnResult> | null>(null)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [fixing, setFixing] = useState<string | null>(null)
  const [selectedCol, setSelectedCol] = useState('')
  const [columnList, setColumnList] = useState<string[]>([])
  const [colResult, setColResult] = useState<{ anomaly_count: number; anomaly_percentage: number; summary: string; anomalies: AnomalyEntry[]; expected_type: string; total_values: number; null_values: number } | null>(null)
  const [colLoading, setColLoading] = useState(false)
  const [fixMode, setFixMode] = useState<'nullify' | 'coerce'>('nullify')

  // Duplicates
  const [dupInfo, setDupInfo] = useState<{ total_rows: number; duplicate_count: number; duplicate_percentage: number; columns: string[] } | null>(null)
  const [dupSubset, setDupSubset] = useState<string[]>([])
  const [keepOption, setKeepOption] = useState('first')
  const [checkResult, setCheckResult] = useState<{ duplicate_count: number; rows_to_remove: number } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  const showAlert = (type: AlertKind, msg: string) => {
    setAlert({ type, message: msg })
    setTimeout(() => setAlert(null), 5000)
  }

  useEffect(() => {
    getColumnTypes().then(d => setColumnList(Object.keys(d.column_types))).catch(() => {})
    if (tab === 1) getDuplicates().then(setDupInfo).catch(() => {})
  }, [tab])

  const handleScanAll = async () => {
    setLoading(true)
    setSkipped(new Set())
    try {
      const r = await scanAllAnomalies()
      setScanResults(r.anomalies)
      showAlert(r.columns_with_anomalies > 0 ? 'warning' : 'success',
        r.columns_with_anomalies > 0 ? `Found anomalies in ${r.columns_with_anomalies} column(s)` : 'No anomalies detected!')
    } catch { showAlert('error', 'Scan failed') }
    setLoading(false)
  }

  const handleFixColumn = async (col: string, expected_type: string) => {
    setFixing(col)
    try {
      const r = await fixColumn(col, fixMode, expected_type)
      showAlert('success', r.message)
      setScanResults(prev => {
        if (!prev) return prev
        const updated = { ...prev }
        delete updated[col]
        return updated
      })
    } catch { showAlert('error', `Failed to fix '${col}'`) }
    setFixing(null)
  }

  const handleSkipColumn = (col: string) => {
    setSkipped(prev => new Set([...prev, col]))
  }

  const handleScanColumn = useCallback(async () => {
    if (!selectedCol) return
    setColLoading(true)
    try {
      const r = await scanColumnAnomalies(selectedCol)
      setColResult(r)
    } catch { showAlert('error', 'Scan failed') }
    setColLoading(false)
  }, [selectedCol])

  const handleNullify = async () => {
    if (!colResult) return
    try {
      await nullifyAnomalies(selectedCol, colResult.anomalies.map(a => a.row_index))
      showAlert('success', `Nullified ${colResult.anomaly_count} anomalous values`)
      setColResult(null)
    } catch { showAlert('error', 'Fix failed') }
  }

  const handleCheckDups = async () => {
    try {
      const r = await checkDuplicates(dupSubset, keepOption)
      setCheckResult(r)
    } catch { showAlert('error', 'Check failed') }
  }

  const handleRemoveDups = async () => {
    setConfirmRemove(false)
    setLoading(true)
    try {
      const r = await removeDuplicates(dupSubset, keepOption)
      showAlert('success', r.message)
      setCheckResult(null)
      const fresh = await getDuplicates()
      setDupInfo(fresh)
    } catch { showAlert('error', 'Remove failed') }
    setLoading(false)
  }

  const visibleScanResults = scanResults
    ? Object.entries(scanResults).filter(([col]) => !skipped.has(col))
    : []

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>🔍 Anomaly Detection & Duplicate Removal</h1>
        <p style={{ color: 'var(--neutral-500)', fontSize: 14 }}>Detect data type mismatches and duplicate rows in your dataset.</p>
      </div>

      <DatasetBanner />

      {alert && <div style={{ marginBottom: 16 }}><Alert type={alert.type} message={alert.message} /></div>}

      <Tabs tabs={['🔍 Type Anomalies', '🗑️ Duplicate Removal']} active={tab} onChange={t => { setTab(t); setCheckResult(null) }} />

      {/* ── TAB 1: TYPE ANOMALIES ── */}
      {tab === 0 && (
        <>
          <SectionHeader title="1. Full Dataset Scan" subtitle="Scan all columns at once for data type mismatches." />

          {/* Fix mode selector */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Default Fix Strategy</div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { value: 'nullify', label: '🗑️ Nullify — set anomalous values to null' },
                { value: 'coerce', label: '🔄 Coerce — try to convert to expected type' },
              ].map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" checked={fixMode === (opt.value as typeof fixMode)} onChange={() => setFixMode(opt.value as typeof fixMode)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </Card>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <Button onClick={handleScanAll} loading={loading}>🔍 Scan All Columns</Button>
            {scanResults && <Button variant="secondary" onClick={() => { setScanResults(null); setSkipped(new Set()) }}>Clear Results</Button>}
          </div>

          {scanResults && visibleScanResults.length === 0 && (
            <Alert type="success" message="✅ No anomalies detected (or all columns have been fixed/skipped)!" />
          )}

          {scanResults && visibleScanResults.length > 0 && (
            <Card style={{ marginBottom: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <MetricCard label="Columns with Anomalies" value={visibleScanResults.length} icon="⚠️" />
                <MetricCard label="Total Anomalies" value={visibleScanResults.reduce((s, [, v]) => s + v.anomaly_count, 0)} icon="🔢" />
                <MetricCard label="Skipped" value={skipped.size} icon="⏭️" />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Column', 'Expected Type', 'Anomaly Count', '%', 'Sample Values', 'Actions'].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {visibleScanResults.sort((a, b) => b[1].anomaly_count - a[1].anomaly_count).map(([col, d]) => (
                      <tr key={col}>
                        <td style={td}><strong>{col}</strong></td>
                        <td style={td}><code style={{ background: 'var(--neutral-100)', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>{d.expected_type}</code></td>
                        <td style={{ ...td, color: 'var(--error)', fontWeight: 600 }}>{d.anomaly_count.toLocaleString()}</td>
                        <td style={td}>{d.anomaly_percentage.toFixed(1)}%</td>
                        <td style={{ ...td, fontFamily: 'monospace', fontSize: 12, color: 'var(--neutral-600)' }}>
                          {d.anomalies.slice(0, 3).map(a => a.value).join(', ')}{d.anomalies.length > 3 ? '…' : ''}
                        </td>
                        <td style={td}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              disabled={fixing === col}
                              onClick={() => handleFixColumn(col, d.expected_type)}
                              style={{ padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', background: 'var(--error)', color: '#fff', border: 'none', fontWeight: 500, opacity: fixing === col ? 0.6 : 1 }}
                            >
                              {fixing === col ? '⏳' : '✅'} Fix
                            </button>
                            <button
                              onClick={() => handleSkipColumn(col)}
                              style={{ padding: '4px 10px', borderRadius: 5, fontSize: 12, cursor: 'pointer', background: 'var(--neutral-200)', color: 'var(--neutral-700)', border: 'none', fontWeight: 500 }}
                            >
                              ⏭️ Skip
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Divider />
          <SectionHeader title="2. Individual Column Analysis" subtitle="Select a column for detailed anomaly inspection and fixing." />

          <Card>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral-600)', display: 'block', marginBottom: 4 }}>Column</label>
                <SelectInput value={selectedCol} onChange={e => { setSelectedCol(e.target.value); setColResult(null) }}>
                  <option value="">-- Select column --</option>
                  {columnList.map(c => <option key={c} value={c}>{c}</option>)}
                </SelectInput>
              </div>
              <Button onClick={handleScanColumn} loading={colLoading} disabled={!selectedCol}>🔍 Scan Column</Button>
            </div>

            {colResult && (
              <div>
                {colResult.anomaly_count === 0
                  ? <Alert type="success" message={colResult.summary} />
                  : <>
                    <Alert type="warning" message={colResult.summary} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, margin: '16px 0' }}>
                      <MetricCard label="Anomalies" value={colResult.anomaly_count} icon="⚠️" />
                      <MetricCard label="% Anomalous" value={`${colResult.anomaly_percentage.toFixed(1)}%`} icon="📊" />
                      <MetricCard label="Total Values" value={colResult.total_values} icon="🔢" />
                      <MetricCard label="Null Values" value={colResult.null_values} icon="❓" />
                    </div>

                    <Divider />
                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ fontSize: 14 }}>Fix Strategy:</strong>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        {(['nullify', 'coerce'] as const).map(m => (
                          <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                            <input type="radio" checked={fixMode === m} onChange={() => setFixMode(m)} />
                            {m === 'nullify' ? '🗑️ Set anomalous cells to Null' : '🔄 Coerce to expected type'}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <Button variant="danger" onClick={handleNullify}>
                        🗑️ Nullify {colResult.anomaly_count} anomalous values
                      </Button>
                      <Button variant="secondary" onClick={async () => {
                        try {
                          const r = await fixColumn(selectedCol, fixMode, colResult.expected_type)
                          showAlert('success', r.message)
                          setColResult(null)
                        } catch { showAlert('error', 'Fix failed') }
                      }}>
                        ✅ Fix All (with {fixMode})
                      </Button>
                    </div>

                    <div style={{ overflowX: 'auto', marginTop: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Anomalous Values (showing up to 200):</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead><tr>
                          {['Row Index', 'Value', 'Reason'].map(h => <th key={h} style={th}>{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {colResult.anomalies.map(a => (
                            <tr key={a.row_index}>
                              <td style={td}>{a.row_index}</td>
                              <td style={{ ...td, fontFamily: 'monospace' }}>{a.value}</td>
                              <td style={{ ...td, color: 'var(--neutral-600)' }}>{a.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                }
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── TAB 2: DUPLICATE REMOVAL ── */}
      {tab === 1 && (
        <>
          <SectionHeader title="Duplicate Row Detection & Removal" />

          {dupInfo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
              <MetricCard label="Total Rows" value={dupInfo.total_rows.toLocaleString()} icon="📝" />
              <MetricCard label="Duplicate Rows" value={dupInfo.duplicate_count.toLocaleString()} icon="🔁" />
              <MetricCard label="Duplicate %" value={`${dupInfo.duplicate_percentage.toFixed(2)}%`} icon="📊" />
            </div>
          )}

          <Card style={{ marginBottom: 16 }}>
            <SectionHeader title="Configure Duplicate Detection" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral-600)', display: 'block', marginBottom: 4 }}>
                  Columns to check (leave empty = ALL columns)
                </label>
                <div style={{ border: '1px solid var(--neutral-300)', borderRadius: 6, padding: 8, maxHeight: 160, overflowY: 'auto' }}>
                  {(dupInfo?.columns ?? []).map(col => (
                    <label key={col} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={dupSubset.includes(col)}
                        onChange={e => {
                          setDupSubset(e.target.checked ? [...dupSubset, col] : dupSubset.filter(c => c !== col))
                          setCheckResult(null)
                        }}
                      />
                      {col}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--neutral-600)', display: 'block', marginBottom: 4 }}>
                  Which duplicate to keep?
                </label>
                {[
                  { value: 'first', label: '🥇 Keep first occurrence' },
                  { value: 'last', label: '🏁 Keep last occurrence' },
                  { value: 'none', label: '🗑️ Remove all duplicates' },
                ].map(opt => (
                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8, cursor: 'pointer' }}>
                    <input type="radio" checked={keepOption === opt.value} onChange={() => { setKeepOption(opt.value); setCheckResult(null) }} />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <Button variant="secondary" onClick={handleCheckDups}>🔍 Check Duplicates</Button>
            </div>
          </Card>

          {checkResult && (
            <Card>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <MetricCard label="Matching Rows" value={checkResult.duplicate_count.toLocaleString()} icon="🔁" />
                <MetricCard label="Rows to Remove" value={checkResult.rows_to_remove.toLocaleString()} icon="🗑️" />
              </div>
              {checkResult.rows_to_remove > 0 && (
                <>
                  <Alert type="warning" message={`This will permanently remove ${checkResult.rows_to_remove.toLocaleString()} row(s) from your dataset. This action can be undone.`} />
                  {!confirmRemove ? (
                    <div style={{ marginTop: 12 }}>
                      <Button variant="danger" onClick={() => setConfirmRemove(true)}>
                        🗑️ Remove {checkResult.rows_to_remove.toLocaleString()} Duplicate Rows
                      </Button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 12, padding: 16, background: '#fff5f5', border: '1px solid var(--error)', borderRadius: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--error)' }}>⚠️ Confirm Deletion</div>
                      <div style={{ fontSize: 13, marginBottom: 12, color: 'var(--neutral-700)' }}>
                        You are about to remove <strong>{checkResult.rows_to_remove.toLocaleString()} rows</strong> from your dataset. Are you sure?
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button variant="danger" onClick={handleRemoveDups} loading={loading}>
                          ✅ Yes, Remove Now
                        </Button>
                        <Button variant="secondary" onClick={() => setConfirmRemove(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
              {checkResult.rows_to_remove === 0 && (
                <Alert type="success" message="No rows would be removed with the current settings." />
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
