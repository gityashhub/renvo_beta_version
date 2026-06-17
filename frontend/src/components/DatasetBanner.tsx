import { useEffect, useState } from 'react'
import { getOverview } from '../api/dataset'
import { Database, Columns, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface BannerStats { rows: number; columns: number; missing_values: number }

export default function DatasetBanner() {
  const [stats, setStats] = useState<BannerStats | null>(null)

  useEffect(() => {
    getOverview(1, false)
      .then(d => setStats({ rows: d.rows, columns: d.columns, missing_values: d.missing_values }))
      .catch(() => {})
  }, [])

  if (!stats) return null

  const completeness = stats.rows > 0 && stats.columns > 0
    ? (100 - (stats.missing_values / (stats.rows * stats.columns)) * 100)
    : 100
  const completenessStr = `${completeness.toFixed(1)}%`

  const metrics = [
    {
      label: 'ROWS',
      value: stats.rows.toLocaleString(),
      icon: Database,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'COLUMNS',
      value: stats.columns.toLocaleString(),
      icon: Columns,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'MISSING',
      value: stats.missing_values.toLocaleString(),
      icon: AlertTriangle,
      iconBg: stats.missing_values > 0 ? 'bg-amber-50' : 'bg-emerald-50',
      iconColor: stats.missing_values > 0 ? 'text-amber-600' : 'text-emerald-600',
      valueColor: stats.missing_values > 0 ? 'text-amber-600' : 'text-slate-900',
    },
    {
      label: 'COMPLETENESS',
      value: completenessStr,
      icon: CheckCircle2,
      iconBg: completeness >= 95 ? 'bg-emerald-50' : 'bg-amber-50',
      iconColor: completeness >= 95 ? 'text-emerald-600' : 'text-amber-600',
      valueColor: completeness >= 95 ? 'text-emerald-600' : 'text-amber-600',
    },
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-6">
      {metrics.map(({ label, value, icon: Icon, iconBg, iconColor, valueColor }) => (
        <div key={label} className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{label}</div>
            <div className={`text-lg font-bold leading-tight ${valueColor ?? 'text-slate-900'}`}>{value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
