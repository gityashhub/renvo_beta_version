import { useState, useEffect } from 'react'
import { validateMerge, mergeColumns, splitColumn, detectJsonColumns, expandJson, columnsToJson } from '../api/cleaning'
import { getColumnTypes } from '../api/dataset'
import { Button, Card, Alert, Tabs, Input, SelectInput, SectionHeader, Divider } from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'

type AlertKind = 'success' | 'error' | 'info' | 'warning'
type AlertState = { type: AlertKind; message: string } | null

const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--neutral-600)', display: 'block', marginBottom: 4 }

interface JsonColumn { column: string; keys: string[]; json_percentage: number; is_array: boolean; is_nested: boolean }

export default function DataTransformation() {
  const [tab, setTab] = useState(0)
  const [alert, setAlert] = useState<AlertState>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Merge/Split state
  const [mode, setMode] = useState<'merge' | 'split'>('merge')
  const [mergeSelected, setMergeSelected] = useState<string[]>([])
  const [separator, setSeparator] = useState('-')
  const [newColName, setNewColName] = useState('')
  const [handleMissing, setHandleMissing] = useState('skip')
  const [isDatetime, setIsDatetime] = useState(false)
  const [datetimeFormat, setDatetimeFormat] = useState('%Y-%m-%d %H:%M:%S')
  const [splitCol, setSplitCol] = useState('')
  const [splitSep, setSplitSep] = useState('-')
  const [splitPrefix, setSplitPrefix] = useState('')
  const [isDtSplit, setIsDtSplit] = useState(false)
  const [dtComponents, setDtComponents] = useState<string[]>(['year', 'month', 'day'])
  const [mergePreview, setMergePreview] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null)
  const [validation, setValidation] = useState<{ valid: boolean; warnings: string[]; errors: string[] } | null>(null)

  // JSON state
  const [jsonTab, setJsonTab] = useState(0)
  const [jsonColumns, setJsonColumns] = useState<JsonColumn[]>([])
  const [jsonDetected, setJsonDetected] = useState(false)
  const [selectedJsonCol, setSelectedJsonCol] = useState('')
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [jsonPrefix, setJsonPrefix] = useState('')
  const [explodeArrays, setExplodeArrays] = useState(false)
  const [jsonPreview, setJsonPreview] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null)
  const [combineColumns, setCombineColumns] = useState<string[]>([])
  const [newJsonColName, setNewJsonColName] = useState('combined_json')

  const showAlert = (type: AlertKind, msg: string) => {
    setAlert({ type, message: msg })
    setTimeout(() => setAlert(null), 5000)
  }

  useEffect(() => {
    getColumnTypes().then(d => setColumns(Object.keys(d.column_types))).catch(() => {})
  }, [])

  const toggleMergeCol = (col: string) => {
    setMergeSelected(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])
    setMergePreview(null); setValidation(null)
  }

  const toggleDtComponent = (c: string) => {
    setDtComponents(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const handleValidate = async () => {
    if (mergeSelected.length < 2) return
    try {
      const r = await validateMerge(mergeSelected, isDatetime)
      setValidation(r)
    } catch {}
  }

  const handleMergePreview = async () => {
    setLoading(true)
    try {
      const r = await mergeColumns({
        columns: mergeSelected, separators: [separator],
        new_column_name: newColName || `${mergeSelected.join('_')}_merged`,
        handle_missing: handleMissing, is_datetime_merge: isDatetime,
        datetime_format: isDatetime ? datetimeFormat : null,
        preview_only: true,
      })
      if (r.preview && r.preview.length > 0) {
        const headers = Object.keys(r.preview[0])
        setMergePreview({ headers, rows: r.preview })
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Preview failed')
    }
    setLoading(false)
  }

  const handleMergeApply = async () => {
    setLoading(true)
    try {
      const r = await mergeColumns({
        columns: mergeSelected, separators: [separator],
        new_column_name: newColName || `${mergeSelected.join('_')}_merged`,
        handle_missing: handleMissing, is_datetime_merge: isDatetime,
        datetime_format: isDatetime ? datetimeFormat : null,
        preview_only: false,
      })
      showAlert('success', r.message ?? 'Merged successfully')
      setMergePreview(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Merge failed')
    }
    setLoading(false)
  }

  const handleSplitPreview = async () => {
    setLoading(true)
    try {
      const r = await splitColumn({
        column: splitCol, separator: splitSep,
        new_column_prefix: splitPrefix || splitCol,
        max_splits: -1, is_datetime_split: isDtSplit,
        datetime_components: dtComponents, preview_only: true,
      })
      if (r.preview?.length > 0) {
        setMergePreview({ headers: Object.keys(r.preview[0]), rows: r.preview })
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Preview failed')
    }
    setLoading(false)
  }

  const handleSplitApply = async () => {
    setLoading(true)
    try {
      const r = await splitColumn({
        column: splitCol, separator: splitSep,
        new_column_prefix: splitPrefix || splitCol,
        max_splits: -1, is_datetime_split: isDtSplit,
        datetime_components: dtComponents, preview_only: false,
      })
      showAlert('success', r.message ?? `Split into ${r.new_columns?.length ?? 0} columns`)
      setMergePreview(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Split failed')
    }
    setLoading(false)
  }

  const handleDetectJson = async () => {
    setLoading(true)
    try {
      const r = await detectJsonColumns()
      setJsonColumns(r.json_columns)
      setJsonDetected(true)
      if (r.json_columns.length > 0) {
        const first = r.json_columns[0]
        setSelectedJsonCol(first.column)
        setSelectedKeys(first.keys.slice(0, 3))
        setJsonPrefix(first.column)
      }
    } catch { showAlert('error', 'Detection failed') }
    setLoading(false)
  }

  const handleJsonPreview = async () => {
    setLoading(true)
    try {
      const r = await expandJson({ column: selectedJsonCol, keys_to_extract: selectedKeys, explode_arrays: explodeArrays, prefix: jsonPrefix, preview_only: true })
      if (r.preview?.length > 0) setJsonPreview({ headers: Object.keys(r.preview[0]), rows: r.preview })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Preview failed')
    }
    setLoading(false)
  }

  const handleJsonApply = async () => {
    setLoading(true)
    try {
      const r = await expandJson({ column: selectedJsonCol, keys_to_extract: selectedKeys, explode_arrays: explodeArrays, prefix: jsonPrefix, preview_only: false })
      showAlert('success', r.message ?? 'Expanded successfully')
      setJsonPreview(null)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Expand failed')
    }
    setLoading(false)
  }

  const handleColumnsToJson = async (preview: boolean) => {
    setLoading(true)
    try {
      const r = await columnsToJson({ columns: combineColumns, new_column_name: newJsonColName, preview_only: preview })
      if (preview && r.preview?.length > 0) {
        setJsonPreview({ headers: Object.keys(r.preview[0]), rows: r.preview })
      } else if (!preview) {
        showAlert('success', r.message ?? 'Converted successfully')
        setJsonPreview(null)
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Conversion failed')
    }
    setLoading(false)
  }

  const DT_COMPONENTS = ['year', 'month', 'day', 'hour', 'minute', 'second', 'weekday', 'week', 'quarter']

  return (
    <div style={{ padding: 32, maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>🔄 Data Transformation</h1>
        <p style={{ color: 'var(--neutral-500)', fontSize: 14 }}>Merge/split columns and expand nested JSON data.</p>
      </div>

      <DatasetBanner />

      {alert && <div style={{ marginBottom: 16 }}><Alert type={alert.type} message={alert.message} /></div>}

      <Tabs tabs={['Merge / Split Columns', 'Expand JSON Data']} active={tab} onChange={setTab} />

      {/* ── MERGE / SPLIT ── */}
      {tab === 0 && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {(['merge', 'split'] as const).map(m => (
              <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '8px 16px', borderRadius: 8, background: mode === m ? 'var(--primary-light)' : 'var(--neutral-100)', fontWeight: mode === m ? 600 : 400 }}>
                <input type="radio" checked={mode === m} onChange={() => { setMode(m); setMergePreview(null) }} />
                {m === 'merge' ? '🔀 Merge Columns' : '✂️ Split Column'}
              </label>
            ))}
          </div>

          {mode === 'merge' && (
            <Card>
              <SectionHeader title="Merge Columns" subtitle="Combine multiple columns into one with a separator." />
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Select columns to merge (minimum 2)</label>
                <div style={{ border: '1px solid var(--neutral-300)', borderRadius: 6, padding: 8, maxHeight: 160, overflowY: 'auto' }}>
                  {columns.map(col => (
                    <label key={col} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4, cursor: 'pointer' }}>
                      <input type="checkbox" checked={mergeSelected.includes(col)} onChange={() => toggleMergeCol(col)} />
                      {col}
                    </label>
                  ))}
                </div>
                {mergeSelected.length > 0 && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--primary)' }}>Selected: {mergeSelected.join(', ')}</div>}
              </div>
              {mergeSelected.length >= 2 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Separator</label>
                      <Input value={separator} onChange={e => setSeparator(e.target.value)} placeholder="-" />
                    </div>
                    <div>
                      <label style={labelStyle}>New column name</label>
                      <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder={`${mergeSelected.slice(0, 2).join('_')}_merged`} />
                    </div>
                    <div>
                      <label style={labelStyle}>Handle missing values</label>
                      <SelectInput value={handleMissing} onChange={e => setHandleMissing(e.target.value)}>
                        <option value="skip">Skip missing values</option>
                        <option value="empty">Replace with empty string</option>
                        <option value="null_string">Replace with "NULL"</option>
                        <option value="fail">Mark row as null if any missing</option>
                      </SelectInput>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                        <input type="checkbox" checked={isDatetime} onChange={e => setIsDatetime(e.target.checked)} />
                        DateTime-aware merge
                      </label>
                    </div>
                  </div>
                  {isDatetime && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>DateTime output format</label>
                      <Input value={datetimeFormat} onChange={e => setDatetimeFormat(e.target.value)} placeholder="%Y-%m-%d %H:%M:%S" />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <Button variant="secondary" onClick={handleValidate}>Validate</Button>
                    <Button variant="secondary" onClick={handleMergePreview} loading={loading}>👁️ Preview</Button>
                    <Button onClick={handleMergeApply} loading={loading}>✅ Apply Merge</Button>
                  </div>
                  {validation && (
                    <div>
                      {validation.warnings.map((w, i) => <Alert key={i} type="warning" message={w} />)}
                      {validation.errors.map((e, i) => <Alert key={i} type="error" message={e} />)}
                      {validation.valid && validation.warnings.length === 0 && validation.errors.length === 0 && <Alert type="success" message="✅ Validation passed" />}
                    </div>
                  )}
                </>
              )}
              {mergeSelected.length < 2 && mergeSelected.length > 0 && <Alert type="info" message="Select at least 2 columns to merge." />}
              {PreviewTable(mergePreview)}
            </Card>
          )}

          {mode === 'split' && (
            <Card>
              <SectionHeader title="Split Column" subtitle="Split a single column into multiple columns." />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Column to split</label>
                  <SelectInput value={splitCol} onChange={e => { setSplitCol(e.target.value); setSplitPrefix(e.target.value); setMergePreview(null) }}>
                    <option value="">-- Select column --</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </SelectInput>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={isDtSplit} onChange={e => setIsDtSplit(e.target.checked)} />
                    DateTime split (extract components)
                  </label>
                </div>
              </div>
              {splitCol && !isDtSplit && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Separator</label>
                    <Input value={splitSep} onChange={e => setSplitSep(e.target.value)} placeholder="-" />
                  </div>
                  <div>
                    <label style={labelStyle}>New column prefix</label>
                    <Input value={splitPrefix} onChange={e => setSplitPrefix(e.target.value)} placeholder={splitCol} />
                  </div>
                </div>
              )}
              {splitCol && isDtSplit && (
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>DateTime components to extract</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {DT_COMPONENTS.map(c => (
                      <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={dtComponents.includes(c)} onChange={() => toggleDtComponent(c)} />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {splitCol && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <Button variant="secondary" onClick={handleSplitPreview} loading={loading}>👁️ Preview</Button>
                  <Button onClick={handleSplitApply} loading={loading}>✅ Apply Split</Button>
                </div>
              )}
              {PreviewTable(mergePreview)}
            </Card>
          )}
        </>
      )}

      {/* ── JSON ── */}
      {tab === 1 && (
        <>
          <Tabs tabs={['Expand JSON to Columns', 'Convert Columns to JSON']} active={jsonTab} onChange={setJsonTab} />

          {jsonTab === 0 && (
            <Card>
              <SectionHeader title="Expand JSON/Dictionary Columns" />
              <Button variant="secondary" onClick={handleDetectJson} loading={loading} style={{ marginBottom: 16 }}>
                🔍 Detect JSON Columns
              </Button>
              {jsonDetected && jsonColumns.length === 0 && <Alert type="info" message="No JSON/dictionary columns detected in the dataset." />}
              {jsonColumns.length > 0 && (
                <>
                  <Alert type="success" message={`Found ${jsonColumns.length} column(s) with JSON data`} />
                  <div style={{ marginTop: 16 }}>
                    {jsonColumns.map(col => (
                      <div key={col.column} style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{col.column}</div>
                        <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 4 }}>
                          {col.json_percentage.toFixed(1)}% JSON · {col.is_array ? '📋 Array' : '📦 Object'}
                          · Keys: {col.keys.slice(0, 10).join(', ')}{col.keys.length > 10 ? '...' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Divider />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={labelStyle}>Select JSON column</label>
                      <SelectInput value={selectedJsonCol} onChange={e => {
                        setSelectedJsonCol(e.target.value)
                        setJsonPrefix(e.target.value)
                        const found = jsonColumns.find(c => c.column === e.target.value)
                        if (found) setSelectedKeys(found.keys.slice(0, 3))
                        setJsonPreview(null)
                      }}>
                        {jsonColumns.map(c => <option key={c.column} value={c.column}>{c.column}</option>)}
                      </SelectInput>
                    </div>
                    <div>
                      <label style={labelStyle}>Column prefix</label>
                      <Input value={jsonPrefix} onChange={e => setJsonPrefix(e.target.value)} />
                    </div>
                  </div>
                  {selectedJsonCol && (() => {
                    const found = jsonColumns.find(c => c.column === selectedJsonCol)
                    return found ? (
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Keys to extract</label>
                        <div style={{ border: '1px solid var(--neutral-300)', borderRadius: 6, padding: 8, maxHeight: 160, overflowY: 'auto' }}>
                          {found.keys.map(k => (
                            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4, cursor: 'pointer' }}>
                              <input type="checkbox" checked={selectedKeys.includes(k)} onChange={e => setSelectedKeys(prev => e.target.checked ? [...prev, k] : prev.filter(x => x !== k))} />
                              {k}
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : null
                  })()}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>
                    <input type="checkbox" checked={explodeArrays} onChange={e => setExplodeArrays(e.target.checked)} />
                    Explode arrays into separate rows
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Button variant="secondary" onClick={handleJsonPreview} loading={loading}>👁️ Preview</Button>
                    <Button onClick={handleJsonApply} loading={loading}>✅ Apply</Button>
                  </div>
                  {PreviewTable(jsonPreview)}
                </>
              )}
            </Card>
          )}

          {jsonTab === 1 && (
            <Card>
              <SectionHeader title="Convert Columns to JSON" subtitle="Combine multiple columns into a JSON/dictionary column (reverse operation)." />
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Columns to combine</label>
                <div style={{ border: '1px solid var(--neutral-300)', borderRadius: 6, padding: 8, maxHeight: 160, overflowY: 'auto' }}>
                  {columns.map(col => (
                    <label key={col} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 4, cursor: 'pointer' }}>
                      <input type="checkbox" checked={combineColumns.includes(col)} onChange={e => setCombineColumns(prev => e.target.checked ? [...prev, col] : prev.filter(c => c !== col))} />
                      {col}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>New JSON column name</label>
                <Input value={newJsonColName} onChange={e => setNewJsonColName(e.target.value)} />
              </div>
              {combineColumns.length >= 1 && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button variant="secondary" onClick={() => handleColumnsToJson(true)} loading={loading}>👁️ Preview</Button>
                  <Button onClick={() => handleColumnsToJson(false)} loading={loading}>✅ Apply</Button>
                </div>
              )}
              {PreviewTable(jsonPreview)}
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function PreviewTable(data: { headers: string[]; rows: Record<string, unknown>[] } | null) {
  if (!data || data.rows.length === 0) return null
  const th2: React.CSSProperties = { padding: '7px 10px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--neutral-500)', background: 'var(--neutral-100)', borderBottom: '1px solid var(--neutral-200)' }
  const td2: React.CSSProperties = { padding: '7px 10px', fontSize: 12, borderBottom: '1px solid var(--neutral-100)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  return (
    <div style={{ marginTop: 16, overflowX: 'auto', border: '1px solid var(--neutral-200)', borderRadius: 8 }}>
      <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--neutral-600)', borderBottom: '1px solid var(--neutral-200)' }}>Preview (first 10 rows)</div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{data.headers.map(h => <th key={h} style={th2}>{h}</th>)}</tr></thead>
        <tbody>{data.rows.map((row, i) => (
          <tr key={i}>{data.headers.map(h => <td key={h} style={td2}>{row[h] === null || row[h] === undefined ? <span style={{ color: 'var(--neutral-300)', fontStyle: 'italic' }}>null</span> : String(row[h])}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  )
}
