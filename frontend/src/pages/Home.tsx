import { useState, useRef, useEffect, useCallback } from 'react'
import {
  uploadFile, getOverview, getColumnTypes, updateColumnTypes,
  analyzeColumns, exportConfig, importConfig,
  connectMySQL, connectSupabase,
} from '../api/dataset'
import {
  Button, Card, Alert, MetricCard, Tabs, Input, SelectInput, Divider, SectionHeader, ProgressBar
} from '../components/ui'

const TYPE_OPTIONS = ['continuous', 'integer', 'ordinal', 'categorical', 'binary', 'text', 'datetime', 'empty', 'unknown']

type AlertKind = 'success' | 'error' | 'info' | 'warning'
type AlertState = { type: AlertKind; message: string } | null

export default function Home() {
  const [tab, setTab] = useState(0)
  const [alert, setAlert] = useState<AlertState>(null)
  const [hasDataset, setHasDataset] = useState(false)
  const [filename, setFilename] = useState<string | null>(null)

  // Overview state
  const [overview, setOverview] = useState<{
    rows: number; columns: number; missing_values: number; memory_mb: number;
    column_names: string[]; preview: Record<string, unknown>[]; max_preview_rows: number;
    column_info: { column: string; dtype: string; non_null: number; missing: number; unique: number }[] | null
  } | null>(null)
  const [previewRows, setPreviewRows] = useState(10)
  const [showInfo, setShowInfo] = useState(false)

  // Column types state
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({})
  const [localTypes, setLocalTypes] = useState<Record<string, string>>({})
  const [typesLoading, setTypesLoading] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisPct, setAnalysisPct] = useState(0)

  // MySQL state
  const [mysqlForm, setMysqlForm] = useState({ host: 'localhost', port: '3306', database: '', username: '', password: '', use_ssl: false })
  const [mysqlConnected, setMysqlConnected] = useState(false)
  const [mysqlTables, setMysqlTables] = useState<string[]>([])
  const [mysqlSelectedTable, setMysqlSelectedTable] = useState('')
  const [mysqlLoading, setMysqlLoading] = useState(false)

  // Supabase state
  const [supaForm, setSupaForm] = useState({ project_url: '', db_password: '', custom_host: '', custom_port: '5432', custom_user: '' })
  const [supaConnected, setSupaConnected] = useState(false)
  const [supaTables, setSupaTables] = useState<string[]>([])
  const [supaSelectedTable, setSupaSelectedTable] = useState('')
  const [supaLoading, setSupaLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const configInputRef = useRef<HTMLInputElement>(null)

  const showAlert = (type: AlertKind, message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 5000)
  }

  const loadOverview = useCallback(async (rows = previewRows, info = showInfo) => {
    try {
      const data = await getOverview(rows, info)
      setOverview(data)
    } catch {
      // ignore
    }
  }, [previewRows, showInfo])

  const loadColumnTypes = useCallback(async () => {
    try {
      const data = await getColumnTypes()
      setColumnTypes(data.column_types)
      setLocalTypes(data.column_types)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (hasDataset) {
      loadOverview(previewRows, showInfo)
      loadColumnTypes()
    }
  }, [hasDataset, previewRows, showInfo])

  // ── File Upload ──────────────────────────────────────────────────────────
  const handleFileDrop = async (file: File) => {
    try {
      const data = await uploadFile(file)
      setHasDataset(true)
      setFilename(data.filename)
      showAlert('success', `✅ ${data.message}`)
      await loadOverview(10, false)
      await loadColumnTypes()
      setPreviewRows(10)
      setShowInfo(false)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Failed to upload file')
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileDrop(f)
    e.target.value = ''
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault() }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileDrop(f)
  }

  // ── MySQL ────────────────────────────────────────────────────────────────
  const handleMysqlConnect = async () => {
    setMysqlLoading(true)
    try {
      const data = await connectMySQL({ ...mysqlForm, port: parseInt(mysqlForm.port), action: 'connect' })
      setMysqlConnected(true)
      setMysqlTables(data.tables ?? [])
      showAlert('success', data.message)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Connection failed')
    }
    setMysqlLoading(false)
  }

  const handleMysqlImport = async () => {
    if (!mysqlSelectedTable) return
    setMysqlLoading(true)
    try {
      const data = await connectMySQL({ ...mysqlForm, port: parseInt(mysqlForm.port), action: 'import_table', table: mysqlSelectedTable })
      setHasDataset(true)
      setFilename(`mysql:${mysqlSelectedTable}`)
      showAlert('success', data.message)
      await loadOverview(10, false)
      await loadColumnTypes()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Import failed')
    }
    setMysqlLoading(false)
  }

  // ── Supabase ─────────────────────────────────────────────────────────────
  const handleSupaConnect = async () => {
    setSupaLoading(true)
    try {
      const payload: Record<string, unknown> = { project_url: supaForm.project_url, db_password: supaForm.db_password, action: 'connect' }
      if (showAdvanced && supaForm.custom_host) {
        payload.custom_host = supaForm.custom_host
        payload.custom_port = parseInt(supaForm.custom_port)
        payload.custom_user = supaForm.custom_user || undefined
      }
      const data = await connectSupabase(payload)
      setSupaConnected(true)
      setSupaTables(data.tables ?? [])
      showAlert('success', data.message)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Connection failed')
    }
    setSupaLoading(false)
  }

  const handleSupaImport = async () => {
    if (!supaSelectedTable) return
    setSupaLoading(true)
    try {
      const data = await connectSupabase({ project_url: supaForm.project_url, db_password: supaForm.db_password, action: 'import_table', table: supaSelectedTable })
      setHasDataset(true)
      setFilename(`supabase:${supaSelectedTable}`)
      showAlert('success', data.message)
      await loadOverview(10, false)
      await loadColumnTypes()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      showAlert('error', err?.response?.data?.error ?? 'Import failed')
    }
    setSupaLoading(false)
  }

  // ── Column Types ─────────────────────────────────────────────────────────
  const handleUpdateTypes = async () => {
    setTypesLoading(true)
    try {
      await updateColumnTypes(localTypes)
      setColumnTypes({ ...localTypes })
      showAlert('success', 'Column types updated successfully')
    } catch {
      showAlert('error', 'Failed to update column types')
    }
    setTypesLoading(false)
  }

  const handleAnalyzeColumns = async () => {
    setAnalysisLoading(true)
    setAnalysisPct(0)
    try {
      // Simulate progress while backend processes
      const interval = setInterval(() => {
        setAnalysisPct(p => Math.min(p + 8, 90))
      }, 300)
      await analyzeColumns()
      clearInterval(interval)
      setAnalysisPct(100)
      showAlert('success', '🎉 Column analysis completed!')
      setTimeout(() => setAnalysisPct(0), 1000)
    } catch {
      showAlert('error', 'Column analysis failed')
    }
    setAnalysisLoading(false)
  }

  // ── Config ───────────────────────────────────────────────────────────────
  const handleExportConfig = async () => {
    try {
      const config = await exportConfig()
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'renvo_config.json'; a.click()
      URL.revokeObjectURL(url)
    } catch {
      showAlert('error', 'Export failed')
    }
  }

  const handleImportConfig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const text = await f.text()
      const config = JSON.parse(text)
      await importConfig(config)
      showAlert('success', '✅ Configuration imported')
      await loadColumnTypes()
    } catch {
      showAlert('error', '❌ Import failed — invalid JSON')
    }
    e.target.value = ''
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 32, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 4 }}>Renvo AI — Intelligent Data Cleaning Assistant</h1>
        <p style={{ color: 'var(--neutral-500)' }}>
          AI-powered tool designed for statistical agencies. Upload your dataset to begin.
        </p>
      </div>

      {/* Key features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 28 }}>
        {['Individual Column Analysis', 'AI-Powered Assistance', 'Multiple Cleaning Strategies', 'Comprehensive Audit Trail', 'Statistical Rigor'].map(f => (
          <div key={f} style={{ background: 'var(--primary-light)', borderRadius: 8, padding: '10px 12px', fontSize: 12, fontWeight: 500, color: 'var(--primary-dark)' }}>
            ✓ {f}
          </div>
        ))}
      </div>

      {alert && <div style={{ marginBottom: 16 }}><Alert type={alert.type} message={alert.message} /></div>}

      <Divider />

      {/* ── DATA IMPORT ────────────────────────────────────────────────── */}
      <SectionHeader title="📊 Data Import" />
      <Tabs tabs={['📁 File Upload', '🔌 MySQL Database', '🟢 Supabase']} active={tab} onChange={setTab} />

      {tab === 0 && (
        <Card>
          <p style={{ color: 'var(--neutral-600)', marginBottom: 16 }}>Upload a CSV or Excel file to get started:</p>
          <div
            onDragOver={onDragOver}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--neutral-300)',
              borderRadius: 10,
              padding: 40,
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--neutral-50)',
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ fontWeight: 500, color: 'var(--neutral-700)', marginBottom: 4 }}>
              Drop your file here or click to browse
            </div>
            <div style={{ fontSize: 12, color: 'var(--neutral-400)' }}>Supported: CSV, Excel (.xlsx, .xls)</div>
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} style={{ display: 'none' }} />
          </div>
          {filename && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--success-light)', borderRadius: 6, fontSize: 13, color: '#065f46' }}>
              📄 Loaded: <strong>{filename}</strong>
            </div>
          )}
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>🔌 Connect to MySQL Database</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Host</label>
              <Input value={mysqlForm.host} onChange={e => setMysqlForm(f => ({ ...f, host: e.target.value }))} placeholder="localhost" />
            </div>
            <div>
              <label style={labelStyle}>Port</label>
              <Input value={mysqlForm.port} onChange={e => setMysqlForm(f => ({ ...f, port: e.target.value }))} placeholder="3306" />
            </div>
            <div>
              <label style={labelStyle}>Database Name</label>
              <Input value={mysqlForm.database} onChange={e => setMysqlForm(f => ({ ...f, database: e.target.value }))} placeholder="mydb" />
            </div>
            <div>
              <label style={labelStyle}>Username</label>
              <Input value={mysqlForm.username} onChange={e => setMysqlForm(f => ({ ...f, username: e.target.value }))} placeholder="root" />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <Input type="password" value={mysqlForm.password} onChange={e => setMysqlForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={mysqlForm.use_ssl} onChange={e => setMysqlForm(f => ({ ...f, use_ssl: e.target.checked }))} />
                Use SSL Connection
              </label>
            </div>
          </div>
          <Button onClick={handleMysqlConnect} loading={mysqlLoading} fullWidth>🔗 Connect to Database</Button>

          {mysqlConnected && mysqlTables.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Select Table to Import</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <SelectInput value={mysqlSelectedTable} onChange={e => setMysqlSelectedTable(e.target.value)} style={{ flex: 1 }}>
                  <option value="">-- Select a table --</option>
                  {mysqlTables.map(t => <option key={t} value={t}>{t}</option>)}
                </SelectInput>
                <Button onClick={handleMysqlImport} loading={mysqlLoading} disabled={!mysqlSelectedTable}>Import</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === 2 && (
        <Card>
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>🟢 Connect to Supabase</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Project URL</label>
              <Input value={supaForm.project_url} onChange={e => setSupaForm(f => ({ ...f, project_url: e.target.value }))} placeholder="https://xxxx.supabase.co" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Database Password</label>
              <Input type="password" value={supaForm.db_password} onChange={e => setSupaForm(f => ({ ...f, db_password: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => setShowAdvanced(v => !v)} style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
              {showAdvanced ? '▲' : '▼'} Advanced Settings (Connection Pooler)
            </button>
            {showAdvanced && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
                <div>
                  <label style={labelStyle}>Custom Host</label>
                  <Input value={supaForm.custom_host} onChange={e => setSupaForm(f => ({ ...f, custom_host: e.target.value }))} placeholder="aws-0-xxx.pooler.supabase.com" />
                </div>
                <div>
                  <label style={labelStyle}>Port</label>
                  <Input value={supaForm.custom_port} onChange={e => setSupaForm(f => ({ ...f, custom_port: e.target.value }))} placeholder="6543" />
                </div>
                <div>
                  <label style={labelStyle}>Custom User (optional)</label>
                  <Input value={supaForm.custom_user} onChange={e => setSupaForm(f => ({ ...f, custom_user: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
          <Button onClick={handleSupaConnect} loading={supaLoading} fullWidth>🔗 Connect to Supabase</Button>

          {supaConnected && supaTables.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <label style={labelStyle}>Select Table to Import</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <SelectInput value={supaSelectedTable} onChange={e => setSupaSelectedTable(e.target.value)} style={{ flex: 1 }}>
                  <option value="">-- Select a table --</option>
                  {supaTables.map(t => <option key={t} value={t}>{t}</option>)}
                </SelectInput>
                <Button onClick={handleSupaImport} loading={supaLoading} disabled={!supaSelectedTable}>Import</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── DATASET OVERVIEW ────────────────────────────────────────────── */}
      {hasDataset && overview && (
        <>
          <Divider />

          {/* Metrics */}
          <SectionHeader title="📋 Dataset Overview" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <MetricCard label="Rows" value={overview.rows} icon="📝" />
            <MetricCard label="Columns" value={overview.columns} icon="📐" />
            <MetricCard label="Missing Values" value={overview.missing_values} icon="❓" />
            <MetricCard label="Memory" value={`${overview.memory_mb} MB`} icon="💾" />
          </div>

          {/* Preview */}
          <SectionHeader title="🔍 Data Preview" />
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: 'var(--neutral-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Rows to preview:
              <input
                type="range"
                min={5}
                max={overview.max_preview_rows}
                value={previewRows}
                onChange={e => setPreviewRows(Number(e.target.value))}
                style={{ width: 120 }}
              />
              <span style={{ fontWeight: 600, minWidth: 28 }}>{previewRows}</span>
            </label>
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={showInfo} onChange={e => setShowInfo(e.target.checked)} />
              Show column info
            </label>
          </div>

          {/* Column info table */}
          {showInfo && overview.column_info && (
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table style={tableStyle}>
                <thead>
                  <tr>{['Column', 'Type', 'Non-null', 'Missing', 'Unique'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {overview.column_info.map(ci => (
                    <tr key={ci.column} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                      <td style={tdStyle}><strong>{ci.column}</strong></td>
                      <td style={tdStyle}><code style={{ fontSize: 11, background: 'var(--neutral-100)', padding: '1px 5px', borderRadius: 3 }}>{ci.dtype}</code></td>
                      <td style={tdStyle}>{ci.non_null.toLocaleString()}</td>
                      <td style={{ ...tdStyle, color: ci.missing > 0 ? 'var(--error)' : 'inherit' }}>{ci.missing.toLocaleString()}</td>
                      <td style={tdStyle}>{ci.unique.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Data preview table */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--neutral-200)', borderRadius: 8 }}>
            <table style={tableStyle}>
              <thead>
                <tr>{overview.column_names.map(c => <th key={c} style={thStyle}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {overview.preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--neutral-100)', background: i % 2 === 1 ? 'var(--neutral-50)' : '#fff' }}>
                    {overview.column_names.map(col => (
                      <td key={col} style={tdStyle}>
                        {row[col] === null || row[col] === undefined
                          ? <span style={{ color: 'var(--neutral-300)', fontStyle: 'italic' }}>null</span>
                          : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── COLUMN TYPES ───────────────────────────────────────────── */}
          <Divider />
          <SectionHeader title="⚙️ Column Type Configuration" subtitle="Review and update the auto-detected column types before cleaning." />

          <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 0, background: 'var(--neutral-100)', borderBottom: '1px solid var(--neutral-200)' }}>
              {['Column', 'Detected Type', 'Set Type'].map(h => (
                <div key={h} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</div>
              ))}
            </div>
            {/* Column rows */}
            {overview.column_names.map((col, idx) => (
              <div
                key={col}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr',
                  alignItems: 'center',
                  borderBottom: idx < overview.column_names.length - 1 ? '1px solid var(--neutral-100)' : 'none',
                  background: idx % 2 === 1 ? 'var(--neutral-50)' : '#fff',
                }}
              >
                <div style={{ padding: '8px 14px', fontWeight: 500, fontSize: 13 }}>{col}</div>
                <div style={{ padding: '8px 14px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                    background: 'var(--primary-light)', color: 'var(--primary-dark)',
                  }}>{columnTypes[col] ?? 'unknown'}</span>
                </div>
                <div style={{ padding: '6px 10px' }}>
                  <SelectInput
                    value={localTypes[col] ?? columnTypes[col] ?? 'unknown'}
                    onChange={e => setLocalTypes(t => ({ ...t, [col]: e.target.value }))}
                    style={{ width: '100%', padding: '5px 8px' }}
                  >
                    {TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </SelectInput>
                </div>
              </div>
            ))}
          </div>

          {analysisLoading && analysisPct > 0 && (
            <div style={{ marginBottom: 12 }}>
              <ProgressBar value={analysisPct} max={100} />
              <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 4 }}>Analyzing columns… {analysisPct}%</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Button onClick={handleUpdateTypes} loading={typesLoading} variant="primary">💾 Update Column Types</Button>
            <Button onClick={handleAnalyzeColumns} loading={analysisLoading} variant="secondary">🔍 Start Column Analysis</Button>
          </div>

          {/* ── CONFIG MANAGEMENT ──────────────────────────────────────── */}
          <Divider />
          <SectionHeader title="💾 Configuration Management" subtitle="Export or import your column type and cleaning history settings." />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Button onClick={handleExportConfig} variant="outline">📤 Export Configuration</Button>
            <Button onClick={() => configInputRef.current?.click()} variant="outline">📥 Import Configuration</Button>
            <input ref={configInputRef} type="file" accept=".json" onChange={handleImportConfig} style={{ display: 'none' }} />
          </div>
        </>
      )}

      {!hasDataset && (
        <div style={{ marginTop: 24, padding: 32, background: 'var(--neutral-50)', border: '1px solid var(--neutral-200)', borderRadius: 10, textAlign: 'center', color: 'var(--neutral-400)' }}>
          👆 Upload a dataset to begin exploring features
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--neutral-600)', marginBottom: 4 }
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 }
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', background: 'var(--neutral-100)', fontWeight: 600, color: 'var(--neutral-600)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', position: 'sticky', top: 0 }
const tdStyle: React.CSSProperties = { padding: '6px 12px', color: 'var(--neutral-700)', whiteSpace: 'nowrap', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }
