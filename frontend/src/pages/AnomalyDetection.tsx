import { useState, useEffect, useCallback } from 'react'
import {
  scanAllAnomalies, scanColumnAnomalies, nullifyAnomalies,
  fixColumn, getDuplicates, checkDuplicates, removeDuplicates,
} from '../api/cleaning'
import { getColumnTypes } from '../api/dataset'
import { 
  Button, Card, Alert, MetricCard, Tabs, SelectInput, SectionHeader, Divider, Badge 
} from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'

type AlertKind = 'success' | 'error' | 'info' | 'warning'
type AlertState = { type: AlertKind; message: string } | null

interface AnomalyEntry { row_index: number; value: string; reason: string }
interface ColumnResult {
  expected_type: string; anomaly_count: number; anomaly_percentage: number;
  total_values: number; anomalies: AnomalyEntry[]
}

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
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-5 sm:space-y-6">
      <SectionHeader 
        title="Anomaly Detection" 
        subtitle="Detect and fix type mismatches and duplicate rows"
      />

      <DatasetBanner />

      {alert && <Alert type={alert.type} message={alert.message} className="mb-4" />}

      <Tabs 
        tabs={['Type Anomalies', 'Duplicate Removal']} 
        active={tab} 
        onChange={t => { setTab(t); setCheckResult(null) }} 
      />

      {/* ── TAB 1: TYPE ANOMALIES ── */}
      {tab === 0 && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Scan Dataset</h3>
                <p className="text-sm text-slate-500">Scan columns for data type mismatches</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleScanAll} loading={loading}>
                  Scan All Columns
                </Button>
                {scanResults && (
                  <Button variant="outline" onClick={() => { setScanResults(null); setSkipped(new Set()) }}>
                    Clear Results
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <label className="text-sm font-semibold text-slate-700 block">Default Fix Strategy</label>
              <div className="flex flex-wrap gap-6">
                {[
                  { value: 'nullify', label: 'Nullify — set anomalous values to null' },
                  { value: 'coerce', label: 'Coerce — try to convert to expected type' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                    <input 
                      type="radio" 
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                      checked={fixMode === (opt.value as typeof fixMode)} 
                      onChange={() => setFixMode(opt.value as typeof fixMode)} 
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </Card>

          {scanResults && visibleScanResults.length === 0 && (
            <Alert type="success" message="No anomalies detected (or all columns have been fixed/skipped)!" />
          )}

          {scanResults && visibleScanResults.length > 0 && (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-b border-slate-200">
                <div className="p-4 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Affected Columns</p>
                  <p className="text-2xl font-bold text-slate-900">{visibleScanResults.length}</p>
                </div>
                <div className="p-4 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Anomalies</p>
                  <p className="text-2xl font-bold text-slate-900">{visibleScanResults.reduce((s, [, v]) => s + v.anomaly_count, 0).toLocaleString()}</p>
                </div>
                <div className="p-4 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Skipped</p>
                  <p className="text-2xl font-bold text-slate-900">{skipped.size}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Anomalies</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">% Affected</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleScanResults.sort((a, b) => b[1].anomaly_count - a[1].anomaly_count).map(([col, d]) => (
                      <tr key={col} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{col}</td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200 font-mono">
                            {d.expected_type}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={d.anomaly_count > 10 ? 'error' : 'warning'}>
                            {d.anomaly_count.toLocaleString()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{d.anomaly_percentage.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="destructive"
                              className="h-8"
                              disabled={fixing === col}
                              onClick={() => handleFixColumn(col, d.expected_type)}
                            >
                              {fixing === col ? 'Fixing...' : 'Fix'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="secondary"
                              className="h-8"
                              onClick={() => handleSkipColumn(col)}
                            >
                              Skip
                            </Button>
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

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Detailed Column Scan</h3>
            <div className="flex flex-col md:flex-row items-end gap-4">
              <div className="flex-1 w-full">
                <SelectInput 
                  label="Select Column"
                  value={selectedCol} 
                  options={['-- Select column --', ...columnList]}
                  onChange={e => { setSelectedCol(e.target.value); setColResult(null) }}
                />
              </div>
              <Button 
                onClick={handleScanColumn} 
                loading={colLoading} 
                disabled={!selectedCol || selectedCol === '-- Select column --'}
              >
                Scan Column
              </Button>
            </div>

            {colResult && (
              <div className="mt-6 space-y-6">
                {colResult.anomaly_count === 0 ? (
                  <Alert type="success" message={colResult.summary} />
                ) : (
                  <>
                    <Alert type="warning" message={colResult.summary} />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <MetricCard label="Anomalies" value={colResult.anomaly_count} className="p-4" />
                      <MetricCard label="% Affected" value={`${colResult.anomaly_percentage.toFixed(1)}%`} className="p-4" />
                      <MetricCard label="Total Values" value={colResult.total_values} className="p-4" />
                      <MetricCard label="Null Values" value={colResult.null_values} className="p-4" />
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-slate-700">Fix Strategy</h4>
                      <div className="flex flex-wrap gap-6">
                        {(['nullify', 'coerce'] as const).map(m => (
                          <label key={m} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600">
                            <input 
                              type="radio" 
                              className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                              checked={fixMode === m} 
                              onChange={() => setFixMode(m)} 
                            />
                            {m === 'nullify' ? 'Set anomalous cells to Null' : 'Coerce to expected type'}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button variant="destructive" onClick={handleNullify}>
                        Nullify {colResult.anomaly_count} values
                      </Button>
                      <Button variant="outline" onClick={async () => {
                        try {
                          const r = await fixColumn(selectedCol, fixMode, colResult.expected_type)
                          showAlert('success', r.message)
                          setColResult(null)
                        } catch { showAlert('error', 'Fix failed') }
                      }}>
                        Fix All (with {fixMode})
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-700">Sample Anomalous Values (up to 200)</h4>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Row Index</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {colResult.anomalies.map(a => (
                              <tr key={a.row_index} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-2 text-sm text-slate-500 font-mono">{a.row_index}</td>
                                <td className="px-4 py-2 text-sm text-slate-900 font-mono">{a.value}</td>
                                <td className="px-4 py-2 text-sm text-slate-600">{a.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 2: DUPLICATE REMOVAL ── */}
      {tab === 1 && (
        <div className="space-y-6">
          <SectionHeader 
            title="Duplicate Row Detection & Removal" 
            subtitle="Identify and remove redundant records based on selected columns"
          />

          {dupInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard label="Total Rows" value={dupInfo.total_rows.toLocaleString()} />
              <MetricCard label="Duplicate Rows" value={dupInfo.duplicate_count.toLocaleString()} />
              <MetricCard label="Duplicate %" value={`${dupInfo.duplicate_percentage.toFixed(2)}%`} />
            </div>
          )}

          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Columns to compare</label>
                <p className="text-xs text-slate-500">Leave empty to check ALL columns</p>
                <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50/50 space-y-2">
                  {(dupInfo?.columns ?? []).map(col => (
                    <label key={col} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
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

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Which occurrence to keep?</label>
                <div className="space-y-3 pt-1">
                  {[
                    { value: 'first', label: 'Keep first occurrence' },
                    { value: 'last', label: 'Keep last occurrence' },
                    { value: 'none', label: 'Remove all occurrences' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-slate-900">
                      <input 
                        type="radio" 
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                        checked={keepOption === opt.value} 
                        onChange={() => { setKeepOption(opt.value); setCheckResult(null) }} 
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={handleCheckDups}>
                Check for Duplicates
              </Button>
            </div>
          </Card>

          {checkResult && (
            <Card className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard label="Identified Duplicates" value={checkResult.duplicate_count.toLocaleString()} className="bg-slate-50" />
                <MetricCard label="Rows to be Removed" value={checkResult.rows_to_remove.toLocaleString()} className="bg-slate-50" />
              </div>

              {checkResult.rows_to_remove > 0 && (
                <div className="space-y-4">
                  <Alert 
                    type="warning" 
                    message={`This will permanently remove ${checkResult.rows_to_remove.toLocaleString()} row(s) from your dataset. This action can be undone later via history.`} 
                  />
                  
                  {!confirmRemove ? (
                    <Button variant="destructive" className="w-full md:w-auto" onClick={() => setConfirmRemove(true)}>
                      Remove {checkResult.rows_to_remove.toLocaleString()} Rows
                    </Button>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 animate-in fade-in slide-in-from-top-4 duration-300">
                      <h4 className="text-red-800 font-bold mb-2">⚠️ Confirm Permanent Deletion</h4>
                      <p className="text-red-700 text-sm mb-4">
                        You are about to remove <strong>{checkResult.rows_to_remove.toLocaleString()} rows</strong>. Are you absolutely sure?
                      </p>
                      <div className="flex gap-3">
                        <Button variant="destructive" onClick={handleRemoveDups} loading={loading}>
                          Yes, Remove Rows
                        </Button>
                        <Button variant="outline" onClick={() => setConfirmRemove(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {checkResult.rows_to_remove === 0 && (
                <Alert type="info" message="No duplicate rows were found with the current column selection." />
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
