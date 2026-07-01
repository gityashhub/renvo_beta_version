import React, { useState, useEffect, useRef } from 'react'
import { getColumnTypes } from '../api/dataset'
import { 
  getMissingPatterns, 
  getColumnOverview, 
  getCorrelationMatrix, 
  getColumnDistribution, 
  getCustomChart 
} from '../api/visualization'
import { Button, Card, SectionHeader, SelectInput, Alert } from '../components/ui'
import DatasetBanner from '../components/DatasetBanner'
import { BarChart3, Grid3X3, Hash, Layers, Settings2, RefreshCw } from 'lucide-react'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { Plotly: any } }
/* eslint-enable @typescript-eslint/no-explicit-any */

const CHART_HEIGHT = 320

function PlotlyChart({ chartJson, loading }: { chartJson: any | null, loading?: boolean }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const plotRef   = useRef<HTMLDivElement>(null)
  const rendered  = useRef(false)

  // Render / re-render whenever chartJson changes
  useEffect(() => {
    rendered.current = false
    if (!chartJson || !plotRef.current) return

    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout>

    const render = () => {
      if (cancelled || !plotRef.current || !wrapperRef.current) return
      if (!window.Plotly) { retryTimer = setTimeout(render, 150); return }

      const w = wrapperRef.current.clientWidth || 400
      const { data, layout } = chartJson

      // strip any incoming width/height so ours win
      const { width: _w, height: _h, ...safeLayout } = layout ?? {}

      try {
        window.Plotly.react(plotRef.current, data ?? [], {
          ...safeLayout,
          paper_bgcolor: 'rgba(0,0,0,0)',
          plot_bgcolor:  'rgba(248,250,252,1)',
          font:   { family: 'Inter, sans-serif', size: 11 },
          width:  w,
          height: CHART_HEIGHT,
          autosize: false,
          margin: { t: 44, r: 16, b: 48, l: 54 },
          legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center', font: { size: 10 } },
        }, { displayModeBar: false, responsive: false })
        rendered.current = true
      } catch (e) {
        console.error('Plotly render error:', e)
      }
    }

    const t = setTimeout(render, 30)
    return () => {
      cancelled = true
      clearTimeout(t)
      clearTimeout(retryTimer)
      if (plotRef.current && window.Plotly) {
        try { window.Plotly.purge(plotRef.current) } catch {}
      }
      rendered.current = false
    }
  }, [chartJson])

  // Resize: relayout with new pixel width — never let Plotly overflow the wrapper
  useEffect(() => {
    if (!wrapperRef.current || !plotRef.current) return
    const ro = new ResizeObserver(() => {
      if (!rendered.current || !plotRef.current || !wrapperRef.current || !window.Plotly) return
      const w = wrapperRef.current.clientWidth
      try { window.Plotly.relayout(plotRef.current, { width: w, height: CHART_HEIGHT }) } catch {}
    })
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  const placeholder = (content: React.ReactNode) => (
    <div
      className="flex flex-col items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200"
      style={{ height: CHART_HEIGHT }}
    >
      {content}
    </div>
  )

  if (loading) return placeholder(
    <>
      <RefreshCw className="w-7 h-7 text-slate-300 animate-spin mb-2" />
      <span className="text-slate-400 text-sm">Generating visualization…</span>
    </>
  )

  if (!chartJson) return placeholder(
    <span className="text-slate-400 text-sm italic text-center px-6">
      No data yet — click the button above to load this chart.
    </span>
  )

  return (
    <div ref={wrapperRef} className="w-full overflow-hidden" style={{ height: CHART_HEIGHT }}>
      <div ref={plotRef} style={{ width: '100%', height: CHART_HEIGHT }} />
    </div>
  )
}

export default function Visualization() {
  const [columns, setColumns] = useState<string[]>([])
  const [charts, setCharts] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const [customX, setCustomX] = useState('')
  const [customY, setCustomY] = useState('')
  const [customType, setCustomType] = useState('bar')
  const [customColor, setCustomColor] = useState('')
  const [distCol, setDistCol] = useState('')

  useEffect(() => {
    getColumnTypes().then(d => {
      const cols = Object.keys(d.column_types)
      setColumns(cols)
      if (cols.length > 0) {
        setDistCol(cols[0])
        setCustomX(cols[0])
        if (cols.length > 1) setCustomY(cols[1])
      }
    }).catch(() => setError("Failed to load column metadata — upload a dataset first."))
  }, [])

  const loadChart = async (key: string, fn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [key]: true }))
    setError(null)
    try {
      const res = await fn()
      setCharts(prev => ({ ...prev, [key]: res.chart_json }))
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? `Failed to load ${key} chart`
      setError(msg)
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full space-y-6">
      <SectionHeader 
        title="Visualization" 
        subtitle="Explore your data through interactive statistical charts"
      />
      <DatasetBanner />

      {error && <Alert type="error" message={error} className="mb-2" />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Missing Patterns */}
        <Card className="p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-blue-600 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Missing Patterns</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadChart('missing', getMissingPatterns)}
              loading={loading['missing']}
            >
              Load Heatmap
            </Button>
          </div>
          <PlotlyChart chartJson={charts['missing']} loading={loading['missing']} />
        </Card>

        {/* Column Overview */}
        <Card className="p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Column Overview</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadChart('overview', getColumnOverview)}
              loading={loading['overview']}
            >
              Load Overview
            </Button>
          </div>
          <PlotlyChart chartJson={charts['overview']} loading={loading['overview']} />
        </Card>

        {/* Correlation Matrix */}
        <Card className="p-4 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-600 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Correlation Matrix</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadChart('correlation', getCorrelationMatrix)}
              loading={loading['correlation']}
            >
              Load Matrix
            </Button>
          </div>
          <PlotlyChart chartJson={charts['correlation']} loading={loading['correlation']} />
        </Card>

        {/* Column Distribution */}
        <Card className="p-4 sm:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-blue-600 shrink-0" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Distribution</h3>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <SelectInput 
              options={columns.length ? columns : ['—']} 
              value={distCol} 
              onChange={(e) => setDistCol(e.target.value)}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm"
              className="sm:shrink-0"
              onClick={() => loadChart('distribution', () => getColumnDistribution(distCol))}
              loading={loading['distribution']}
              disabled={!distCol}
            >
              Show
            </Button>
          </div>
          <PlotlyChart chartJson={charts['distribution']} loading={loading['distribution']} />
        </Card>
      </div>

      {/* Custom Chart Builder */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Settings2 className="w-5 h-5 text-blue-600 shrink-0" />
          <h3 className="font-bold text-slate-900 text-base sm:text-lg">Custom Chart Builder</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5 items-end">
          <SelectInput 
            label="X Column" 
            options={columns.length ? columns : ['—']} 
            value={customX} 
            onChange={e => setCustomX(e.target.value)} 
          />
          <SelectInput 
            label="Y Column" 
            options={['(None)', ...columns]} 
            value={customY} 
            onChange={e => setCustomY(e.target.value)} 
          />
          <SelectInput 
            label="Chart Type" 
            options={['bar', 'scatter', 'line', 'box', 'histogram']} 
            value={customType} 
            onChange={e => setCustomType(e.target.value)} 
          />
          <SelectInput 
            label="Color (Optional)" 
            options={['(None)', ...columns]} 
            value={customColor} 
            onChange={e => setCustomColor(e.target.value)} 
          />
        </div>
        
        <Button 
          className="w-full mb-5" 
          onClick={() => loadChart('custom', () => getCustomChart(
            customX, 
            customY === '(None)' ? '' : customY, 
            customType, 
            customColor === '(None)' ? undefined : customColor
          ))}
          loading={loading['custom']}
          disabled={!customX}
        >
          Generate Custom Chart
        </Button>

        <PlotlyChart chartJson={charts['custom']} loading={loading['custom']} />
      </Card>
    </div>
  )
}
