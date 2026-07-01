import { useState, useRef, useEffect, useCallback } from 'react'
import {
  uploadFile, getOverview, getColumnTypes, updateColumnTypes,
  analyzeColumns, exportConfig, importConfig,
  connectMySQL, connectSupabase,
} from '../api/dataset'
import {
  Button, Card, Alert, MetricCard, Tabs, Input, SelectInput, SectionHeader, ProgressBar, Badge
} from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'
import { Upload, Database, Cloud, FileText, Settings, Info, Save, Play, Download, Import } from 'lucide-react'

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
  }, [hasDataset, previewRows, showInfo, loadOverview, loadColumnTypes])

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-5 sm:space-y-6 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Upload and configure your dataset to begin analysis.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => configInputRef.current?.click()}>
            <Import className="h-4 w-4 mr-1.5" />
            Import Config
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportConfig}>
            <Save className="h-4 w-4 mr-1.5" />
            Export Config
          </Button>
          {hasDataset && (
            <a href="/api/reports/download-csv" download="cleaned_dataset.csv">
              <Button variant="primary" size="sm">
                <Download className="h-4 w-4 mr-1.5" />
                Download Cleaned Data
              </Button>
            </a>
          )}
          <input ref={configInputRef} type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
        </div>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} className="mb-4" />}

      <DatasetBanner />

      {/* Import Section */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <SectionHeader 
            title="Data Import" 
            subtitle="Connect your data source to start cleaning"
            className="mb-0"
          />
        </div>
        <div className="p-6 space-y-6">
          <Tabs 
            tabs={['File Upload', 'MySQL', 'Supabase']} 
            active={tab} 
            onChange={setTab} 
          />

          {tab === 0 && (
            <div className="space-y-4">
              <div
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-200 rounded-lg p-12 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
              >
                <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-lg font-medium text-slate-900 mb-1">Drop your file here</div>
                <div className="text-slate-500 mb-2">or click to browse</div>
                <div className="text-xs text-slate-400">CSV, Excel (.xlsx, .xls) up to 100MB</div>
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={onFileChange} className="hidden" />
              </div>
              {filename && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-sm">
                  <FileText className="h-4 w-4" />
                  <span>Loaded: <strong>{filename}</strong></span>
                </div>
              )}
            </div>
          )}

          {tab === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Host" 
                  value={mysqlForm.host} 
                  onChange={e => setMysqlForm(f => ({ ...f, host: e.target.value }))} 
                  placeholder="localhost" 
                />
                <Input 
                  label="Port" 
                  value={mysqlForm.port} 
                  onChange={e => setMysqlForm(f => ({ ...f, port: e.target.value }))} 
                  placeholder="3306" 
                />
                <Input 
                  label="Database Name" 
                  value={mysqlForm.database} 
                  onChange={e => setMysqlForm(f => ({ ...f, database: e.target.value }))} 
                  placeholder="mydb" 
                />
                <Input 
                  label="Username" 
                  value={mysqlForm.username} 
                  onChange={e => setMysqlForm(f => ({ ...f, username: e.target.value }))} 
                  placeholder="root" 
                />
                <Input 
                  label="Password" 
                  type="password" 
                  value={mysqlForm.password} 
                  onChange={e => setMysqlForm(f => ({ ...f, password: e.target.value }))} 
                />
                <div className="flex items-end h-9">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={mysqlForm.use_ssl} 
                      onChange={e => setMysqlForm(f => ({ ...f, use_ssl: e.target.checked }))} 
                    />
                    Use SSL Connection
                  </label>
                </div>
              </div>
              <Button onClick={handleMysqlConnect} loading={mysqlLoading} className="w-full md:w-auto">
                <Database className="h-4 w-4 mr-2" />
                Connect to Database
              </Button>

              {mysqlConnected && mysqlTables.length > 0 && (
                <div className="pt-6 border-t border-slate-100">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <SelectInput 
                        label="Select Table to Import"
                        value={mysqlSelectedTable} 
                        onChange={e => setMysqlSelectedTable(e.target.value)}
                        options={[{ value: '', label: '-- Select a table --' }, ...mysqlTables.map(t => ({ value: t, label: t }))]}
                      />
                    </div>
                    <Button onClick={handleMysqlImport} loading={mysqlLoading} disabled={!mysqlSelectedTable} className="w-full md:w-auto">
                      Import Table
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <Input 
                  label="Project URL" 
                  value={supaForm.project_url} 
                  onChange={e => setSupaForm(f => ({ ...f, project_url: e.target.value }))} 
                  placeholder="https://xxxx.supabase.co" 
                />
                <Input 
                  label="Database Password" 
                  type="password" 
                  value={supaForm.db_password} 
                  onChange={e => setSupaForm(f => ({ ...f, db_password: e.target.value }))} 
                />
              </div>
              <div>
                <button 
                  onClick={() => setShowAdvanced(v => !v)} 
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Settings (Connection Pooler)
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <Input 
                      label="Custom Host" 
                      value={supaForm.custom_host} 
                      onChange={e => setSupaForm(f => ({ ...f, custom_host: e.target.value }))} 
                      placeholder="aws-0-xxx.pooler.supabase.com" 
                    />
                    <Input 
                      label="Port" 
                      value={supaForm.custom_port} 
                      onChange={e => setSupaForm(f => ({ ...f, custom_port: e.target.value }))} 
                      placeholder="6543" 
                    />
                    <Input 
                      label="Custom User (optional)" 
                      value={supaForm.custom_user} 
                      onChange={e => setSupaForm(f => ({ ...f, custom_user: e.target.value }))} 
                    />
                  </div>
                )}
              </div>
              <Button onClick={handleSupaConnect} loading={supaLoading} className="w-full md:w-auto">
                <Cloud className="h-4 w-4 mr-2" />
                Connect to Supabase
              </Button>

              {supaConnected && supaTables.length > 0 && (
                <div className="pt-6 border-t border-slate-100">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                      <SelectInput 
                        label="Select Table to Import"
                        value={supaSelectedTable} 
                        onChange={e => setSupaSelectedTable(e.target.value)}
                        options={[{ value: '', label: '-- Select a table --' }, ...supaTables.map(t => ({ value: t, label: t }))]}
                      />
                    </div>
                    <Button onClick={handleSupaImport} loading={supaLoading} disabled={!supaSelectedTable} className="w-full md:w-auto">
                      Import Table
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Dataset Overview */}
      {hasDataset && overview && (
        <div className="space-y-6">
          <SectionHeader 
            title="Dataset Overview" 
            subtitle="Initial metrics and column statistics" 
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Rows" value={overview.rows.toLocaleString()} icon={<FileText className="h-5 w-5 text-blue-600" />} />
            <MetricCard label="Columns" value={overview.columns} icon={<Settings className="h-5 w-5 text-blue-600" />} />
            <MetricCard label="Missing Values" value={overview.missing_values.toLocaleString()} icon={<Info className="h-5 w-5 text-amber-600" />} />
            <MetricCard label="Memory" value={`${overview.memory_mb.toFixed(2)} MB`} icon={<Database className="h-5 w-5 text-emerald-600" />} />
          </div>

          {/* Data Preview */}
          <Card>
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <SectionHeader 
                title="Data Preview" 
                subtitle="Explore the first few rows of your dataset"
                className="mb-0"
              />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-600 font-medium">Show:</span>
                  <select 
                    value={previewRows} 
                    onChange={e => setPreviewRows(Number(e.target.value))}
                    className="h-8 rounded-md border-slate-200 text-sm focus:ring-blue-500"
                  >
                    {[5, 10, 25, 50, 100].filter(n => n <= overview.max_preview_rows).map(n => (
                      <option key={n} value={n}>{n} rows</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600">
                  <input 
                    type="checkbox" 
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={showInfo} 
                    onChange={e => setShowInfo(e.target.checked)} 
                  />
                  Column Info
                </label>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {showInfo && overview.column_info && (
                <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                  <div className="overflow-hidden border border-slate-200 rounded-lg bg-white">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {['Column', 'Type', 'Non-null', 'Missing', 'Unique'].map(h => (
                            <th key={h} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {overview.column_info.map(ci => (
                          <tr key={ci.column} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-2 text-sm font-medium text-slate-900">{ci.column}</td>
                            <td className="px-4 py-2 text-sm"><code className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-mono">{ci.dtype}</code></td>
                            <td className="px-4 py-2 text-sm text-slate-600">{ci.non_null.toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm">
                              {ci.missing > 0 ? (
                                <Badge variant="error">{ci.missing.toLocaleString()}</Badge>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm text-slate-600">{ci.unique.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {overview.column_names.map(c => (
                      <th key={c} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[120px]">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.preview.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      {overview.column_names.map(col => (
                        <td key={col} className="px-4 py-2.5 text-sm text-slate-600 truncate max-w-[200px]">
                          {row[col] === null || row[col] === undefined
                            ? <span className="text-slate-300 italic">null</span>
                            : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Column Configuration */}
          <SectionHeader 
            title="Column Configuration" 
            subtitle="Review and override auto-detected data types" 
          />
          
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Column Name</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detected Type</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Override Type</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overview.column_names.map((col) => (
                    <tr key={col} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{col}</td>
                      <td className="px-6 py-4 text-sm">
                        <Badge variant="info" className="font-mono">{columnTypes[col] || 'unknown'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={localTypes[col] || ''}
                          onChange={e => setLocalTypes(prev => ({ ...prev, [col]: e.target.value }))}
                          className="w-full h-9 rounded-md border-slate-200 text-sm focus:ring-blue-500"
                        >
                          {TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="group relative">
                          <Info className="h-4 w-4 text-slate-300 cursor-help" />
                          <div className="hidden group-hover:block absolute right-0 bottom-full mb-2 w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl z-10">
                            Changing this affects how cleaning algorithms treat this column.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-4">
              <Button onClick={handleUpdateTypes} loading={typesLoading}>
                <Save className="h-4 w-4 mr-2" />
                Apply Configuration
              </Button>
              <Button variant="outline" onClick={handleAnalyzeColumns} loading={analysisLoading}>
                <Play className="h-4 w-4 mr-2" />
                Run Column Analysis
              </Button>
            </div>
            {analysisLoading && (
              <div className="px-6 pb-6">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                  <span>Analyzing statistical properties...</span>
                  <span>{analysisPct}%</span>
                </div>
                <ProgressBar value={analysisPct} />
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
