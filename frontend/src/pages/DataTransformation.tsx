import { useState, useEffect } from 'react'
import { validateMerge, mergeColumns, splitColumn, detectJsonColumns, expandJson, columnsToJson } from '../api/cleaning'
import { getColumnTypes } from '../api/dataset'
import { Button, Card, Alert, Tabs, Input, SelectInput, SectionHeader, Divider, Badge } from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'
import { cn } from '../lib/utils'
import { Check, Columns, Scissors, FileJson, Table, Search, Sparkles } from 'lucide-react'

type AlertKind = 'success' | 'error' | 'info' | 'warning'
type AlertState = { type: AlertKind; message: string } | null

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
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-5 sm:space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Data Transformation</h2>
        <p className="text-sm text-slate-500 mt-1">Merge, split, and expand dataset columns</p>
      </div>

      <DatasetBanner />

      {alert && <Alert type={alert.type} message={alert.message} className="mb-6" />}

      <Tabs tabs={['Merge / Split Columns', 'Expand JSON Data']} active={tab} onChange={setTab} />

      {/* ── MERGE / SPLIT ── */}
      {tab === 0 && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <Button
              variant={mode === 'merge' ? 'primary' : 'outline'}
              onClick={() => { setMode('merge'); setMergePreview(null) }}
              className="flex-1"
            >
              <Columns className="mr-2 h-4 w-4" />
              Merge Columns
            </Button>
            <Button
              variant={mode === 'split' ? 'primary' : 'outline'}
              onClick={() => { setMode('split'); setMergePreview(null) }}
              className="flex-1"
            >
              <Scissors className="mr-2 h-4 w-4" />
              Split Column
            </Button>
          </div>

          {mode === 'merge' && (
            <Card className="p-6">
              <SectionHeader title="Merge Columns" subtitle="Combine multiple columns into one with a separator." />
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-2 block uppercase tracking-wider">Select columns to merge (minimum 2)</label>
                  <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50 grid grid-cols-2 gap-2">
                    {columns.map(col => (
                      <label key={col} className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={mergeSelected.includes(col)}
                          onChange={() => toggleMergeCol(col)}
                        />
                        <span className="text-slate-700 truncate">{col}</span>
                      </label>
                    ))}
                  </div>
                  {mergeSelected.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      <span className="text-xs font-medium text-slate-500 mr-1 self-center">Selected:</span>
                      {mergeSelected.map(c => (
                        <Badge key={c} variant="info" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                {mergeSelected.length >= 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Separator"
                      value={separator}
                      onChange={e => setSeparator(e.target.value)}
                      placeholder="e.g. -, _, /"
                    />
                    <Input
                      label="New Column Name"
                      value={newColName}
                      onChange={e => setNewColName(e.target.value)}
                      placeholder={mergeSelected.length >= 2 ? `${mergeSelected.slice(0, 2).join('_')}_merged` : "merged_column"}
                    />
                    <SelectInput
                      label="Handle Missing Values"
                      value={handleMissing}
                      onChange={e => setHandleMissing(e.target.value)}
                      options={[
                        { label: 'Skip missing values', value: 'skip' },
                        { label: 'Replace with empty string', value: 'empty' },
                        { label: 'Replace with "NULL"', value: 'null_string' },
                        { label: 'Fail (mark row as null if any missing)', value: 'fail' }
                      ]}
                    />
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={isDatetime}
                          onChange={e => setIsDatetime(e.target.checked)}
                        />
                        DateTime-aware merge
                      </label>
                    </div>
                  </div>
                )}

                {isDatetime && (
                  <Input
                    label="DateTime Output Format"
                    value={datetimeFormat}
                    onChange={e => setDatetimeFormat(e.target.value)}
                    placeholder="%Y-%m-%d %H:%M:%S"
                  />
                )}

                {mergeSelected.length >= 2 ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-3">
                      <Button variant="outline" onClick={handleValidate}>
                        <Check className="mr-2 h-4 w-4 text-emerald-600" />
                        Validate
                      </Button>
                      <Button variant="outline" onClick={handleMergePreview} loading={loading}>
                        <Search className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      <Button onClick={handleMergeApply} loading={loading}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Apply Merge
                      </Button>
                    </div>

                    {validation && (
                      <div className="space-y-2">
                        {validation.warnings.map((w, i) => <Alert key={i} type="warning" message={w} />)}
                        {validation.errors.map((e, i) => <Alert key={i} type="error" message={e} />)}
                        {validation.valid && validation.warnings.length === 0 && validation.errors.length === 0 && (
                          <Alert type="success" message="Validation passed" />
                        )}
                      </div>
                    )}
                  </div>
                ) : mergeSelected.length > 0 ? (
                  <Alert type="info" message="Select at least 2 columns to merge." />
                ) : null}
              </div>
              <PreviewSection data={mergePreview} />
            </Card>
          )}

          {mode === 'split' && (
            <Card className="p-6">
              <SectionHeader title="Split Column" subtitle="Split a single column into multiple columns." />
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SelectInput
                    label="Column to Split"
                    value={splitCol}
                    onChange={e => { setSplitCol(e.target.value); setSplitPrefix(e.target.value); setMergePreview(null) }}
                    options={['-- Select column --', ...columns]}
                  />
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={isDtSplit}
                        onChange={e => setIsDtSplit(e.target.checked)}
                      />
                      DateTime split (extract components)
                    </label>
                  </div>
                </div>

                {splitCol && !isDtSplit && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Separator"
                      value={splitSep}
                      onChange={e => setSplitSep(e.target.value)}
                      placeholder="-"
                    />
                    <Input
                      label="New Column Prefix"
                      value={splitPrefix}
                      onChange={e => setSplitPrefix(e.target.value)}
                      placeholder={splitCol}
                    />
                  </div>
                )}

                {splitCol && isDtSplit && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">DateTime components to extract</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      {DT_COMPONENTS.map(c => (
                        <label key={c} className="flex items-center gap-2 px-2 py-1 bg-white border border-slate-200 rounded text-sm cursor-pointer hover:border-blue-300 transition-colors">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={dtComponents.includes(c)}
                            onChange={() => toggleDtComponent(c)}
                          />
                          <span className="text-slate-700">{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {splitCol && (
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleSplitPreview} loading={loading}>
                      <Search className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button onClick={handleSplitApply} loading={loading}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Apply Split
                    </Button>
                  </div>
                )}
              </div>
              <PreviewSection data={mergePreview} />
            </Card>
          )}
        </div>
      )}

      {/* ── JSON ── */}
      {tab === 1 && (
        <div className="space-y-6">
          <Tabs tabs={['Expand Keys', 'Combine to JSON']} active={jsonTab} onChange={setJsonTab} />

          {jsonTab === 0 && (
            <Card className="p-6">
              <SectionHeader
                title="Expand JSON Data"
                subtitle="Extract keys from JSON columns into new columns."
                action={
                  <Button variant="outline" onClick={handleDetectJson} loading={loading}>
                    <FileJson className="mr-2 h-4 w-4 text-blue-600" />
                    Detect JSON Columns
                  </Button>
                }
              />

              {jsonDetected && jsonColumns.length === 0 && (
                <Alert type="info" message="No JSON/dictionary columns detected in the dataset." />
              )}

              {jsonColumns.length > 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {jsonColumns.map(col => (
                      <div
                        key={col.column}
                        className={cn(
                          "border rounded-lg p-3 transition-all cursor-pointer",
                          selectedJsonCol === col.column ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" : "border-slate-200 hover:border-slate-300 bg-white"
                        )}
                        onClick={() => {
                          setSelectedJsonCol(col.column)
                          setJsonPrefix(col.column)
                          setSelectedKeys(col.keys.slice(0, 3))
                          setJsonPreview(null)
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-900 truncate">{col.column}</span>
                          <Badge variant={col.is_array ? 'info' : 'success'} className="text-[10px]">
                            {col.is_array ? 'Array' : 'Object'}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          <p>{col.json_percentage.toFixed(1)}% JSON coverage</p>
                          <p className="truncate">Keys: {col.keys.slice(0, 3).join(', ')}{col.keys.length > 3 ? '...' : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Divider />

                  {selectedJsonCol && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Column Prefix"
                          value={jsonPrefix}
                          onChange={e => setJsonPrefix(e.target.value)}
                        />
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 font-medium">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              checked={explodeArrays}
                              onChange={e => setExplodeArrays(e.target.checked)}
                            />
                            Explode arrays into separate rows
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Keys to Extract</label>
                        <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50 grid grid-cols-2 md:grid-cols-3 gap-2">
                          {jsonColumns.find(c => c.column === selectedJsonCol)?.keys.map(k => (
                            <label key={k} className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={selectedKeys.includes(k)}
                                onChange={e => setSelectedKeys(prev => e.target.checked ? [...prev, k] : prev.filter(x => x !== k))}
                              />
                              <span className="text-slate-700 truncate">{k}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={handleJsonPreview} loading={loading}>
                          <Search className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        <Button onClick={handleJsonApply} loading={loading}>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Apply Expansion
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <PreviewSection data={jsonPreview} />
            </Card>
          )}

          {jsonTab === 1 && (
            <Card className="p-6">
              <SectionHeader title="Convert Columns to JSON" subtitle="Combine multiple columns into a JSON/dictionary column." />
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-2 block uppercase tracking-wider">Columns to combine</label>
                  <div className="border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto bg-slate-50 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {columns.map(col => (
                      <label key={col} className="flex items-center gap-2 p-1.5 rounded hover:bg-white transition-colors cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={combineColumns.includes(col)}
                          onChange={e => setCombineColumns(prev => e.target.checked ? [...prev, col] : prev.filter(c => c !== col))}
                        />
                        <span className="text-slate-700 truncate">{col}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Input
                  label="New JSON Column Name"
                  value={newJsonColName}
                  onChange={e => setNewJsonColName(e.target.value)}
                  placeholder="combined_json"
                />

                {combineColumns.length >= 1 && (
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => handleColumnsToJson(true)} loading={loading}>
                      <Search className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    <Button onClick={() => handleColumnsToJson(false)} loading={loading}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Apply Conversion
                    </Button>
                  </div>
                )}
              </div>
              <PreviewSection data={jsonPreview} />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function PreviewSection({ data }: { data: { headers: string[]; rows: Record<string, unknown>[] } | null }) {
  if (!data || data.rows.length === 0) return null

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <Table className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Preview (first 10 rows)</h3>
      </div>
      <div className="overflow-hidden border border-slate-200 rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                {data.headers.map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  {data.headers.map(h => {
                    const val = row[h]
                    return (
                      <td key={h} className="px-4 py-3 text-sm text-slate-600 truncate max-w-[200px]">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
