import { useEffect, useState } from 'react'
import { getOverview } from '../api/dataset'

interface BannerStats { rows: number; columns: number; missing_values: number; filename: string | null }

export default function DatasetBanner() {
  const [stats, setStats] = useState<BannerStats | null>(null)

  useEffect(() => {
    getOverview(1, false)
      .then(d => setStats({ rows: d.rows, columns: d.columns, missing_values: d.missing_values, filename: null }))
      .catch(() => {})
  }, [])

  if (!stats) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f5e9 100%)',
      border: '1px solid var(--neutral-200)',
      borderRadius: 10,
      padding: '12px 20px',
      marginBottom: 24,
      display: 'flex',
      gap: 32,
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>📊</span>
        <div>
          <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 500 }}>ROWS</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--neutral-900)' }}>{stats.rows.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🗂️</span>
        <div>
          <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 500 }}>COLUMNS</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--neutral-900)' }}>{stats.columns.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>❓</span>
        <div>
          <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 500 }}>MISSING</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: stats.missing_values > 0 ? 'var(--warning)' : 'var(--success)' }}>{stats.missing_values.toLocaleString()}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>✅</span>
        <div>
          <div style={{ fontSize: 11, color: 'var(--neutral-500)', fontWeight: 500 }}>COMPLETENESS</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success)' }}>
            {stats.rows > 0 && stats.columns > 0
              ? `${(100 - (stats.missing_values / (stats.rows * stats.columns)) * 100).toFixed(1)}%`
              : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}
