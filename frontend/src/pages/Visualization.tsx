import { useState, useEffect, useRef } from 'react'
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

function PlotlyChart({ chartJson, loading }: { chartJson: any | null, loading?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chartJson || !ref.current) return
    const timer = setTimeout(() => {
      if (window.Plotly && ref.current) {
        try {
          const { data, layout } = chartJson
          window.Plotly.newPlot(ref.current, data ?? [], {
            ...(layout ?? {}),
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Inter, sans-serif' },
            autosize: true,
            margin: { t: 40, r: 20, b: 40, l: 60 }
          }, { responsive: true, displayModeBar: false })
        } catch (e) {
          console.error("Plotly error:", e)
        }
      }
    }, 100)
    return () => {
      clearTimeout(timer)
      if (ref.current && window.Plotly) {
        try { window.Plotly.purge(ref.current) } catch {}
      }
    }
  }, [chartJson])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mb-2" />
        <span className="text-slate-400 text-sm">Generating visualization...</span>
      </div>
    )
  }

  if (!chartJson) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <span className="text-slate-400 text-sm italic">No data to display. Click load to generate.</span>
      </div>
    )
  }

  return (
    <div ref={ref} className="w-full h-[350px]" />
  )
}

export default function Visualization() {
  const [columns, setColumns] = useState<string[]>([])
  const [charts, setCharts] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // Custom Chart State
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
    }).catch(() => setError("Failed to load column metadata"))
  }, [])

  const loadChart = async (key: string, fn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      const res = await fn()
      setCharts(prev => ({ ...prev, [key]: res.chart_json }))
    } catch (e) {
      setError(`Failed to load ${key} chart`)
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <SectionHeader 
        title="Visualization" 
        subtitle="Explore your data through interactive statistical charts"
      />
      <DatasetBanner />

      {error && <Alert type="error" message={error} className="mb-6" />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Missing Patterns */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Missing Patterns</h3>
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
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Column Overview</h3>
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
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Correlation Matrix</h3>
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
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Distribution</h3>
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            <SelectInput 
              options={columns} 
              value={distCol} 
              onChange={(e) => setDistCol(e.target.value)}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadChart('distribution', () => getColumnDistribution(distCol))}
              loading={loading['distribution']}
            >
              Show
            </Button>
          </div>
          <PlotlyChart chartJson={charts['distribution']} loading={loading['distribution']} />
        </Card>
      </div>

      {/* Custom Chart Builder */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-lg">Custom Chart Builder</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
          <SelectInput 
            label="X Column" 
            options={columns} 
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
          className="w-full mb-6" 
          onClick={() => loadChart('custom', () => getCustomChart(customX, customY === '(None)' ? '' : customY, customType, customColor === '(None)' ? undefined : customColor))}
          loading={loading['custom']}
        >
          Generate Custom Chart
        </Button>

        <PlotlyChart chartJson={charts['custom']} loading={loading['custom']} />
      </Card>
    </div>
  )
}
