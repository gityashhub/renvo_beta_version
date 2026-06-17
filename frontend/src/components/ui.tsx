import type { ReactNode, CSSProperties } from 'react'

// ─── Button ─────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'
interface BtnProps {
  children: ReactNode
  onClick?: () => void
  variant?: BtnVariant
  disabled?: boolean
  loading?: boolean
  style?: CSSProperties
  type?: 'button' | 'submit'
  fullWidth?: boolean
}

const btnStyles: Record<BtnVariant, CSSProperties> = {
  primary: { background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' },
  secondary: { background: 'var(--neutral-100)', color: 'var(--neutral-800)', border: '1px solid var(--neutral-200)' },
  danger: { background: 'var(--error)', color: '#fff', border: '1px solid var(--error)' },
  outline: { background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' },
  ghost: { background: 'transparent', color: 'var(--neutral-700)', border: '1px solid transparent' },
}

export function Button({ children, onClick, variant = 'primary', disabled, loading, style, type = 'button', fullWidth }: BtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 8,
        fontWeight: 500,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.15s',
        width: fullWidth ? '100%' : undefined,
        ...btnStyles[variant],
        ...style,
      }}
    >
      {loading ? '⏳' : null}
      {children}
    </button>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--neutral-200)',
      borderRadius: 10,
      padding: 20,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Alert ───────────────────────────────────────────────────────────────────
type AlertType = 'success' | 'error' | 'info' | 'warning'
const alertStyles: Record<AlertType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: 'var(--success-light)', border: 'var(--success)', color: '#065f46', icon: '✅' },
  error: { bg: 'var(--error-light)', border: 'var(--error)', color: '#991b1b', icon: '❌' },
  info: { bg: 'var(--primary-light)', border: 'var(--primary)', color: 'var(--primary-dark)', icon: 'ℹ️' },
  warning: { bg: 'var(--warning-light)', border: 'var(--warning)', color: '#92400e', icon: '⚠️' },
}

export function Alert({ type, message }: { type: AlertType; message: string }) {
  const s = alertStyles[type]
  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: 8,
      padding: '10px 14px',
      color: s.color,
      fontSize: 13,
      display: 'flex',
      gap: 8,
      alignItems: 'flex-start',
    }}>
      <span>{s.icon}</span>
      <span>{message}</span>
    </div>
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
export function MetricCard({ label, value, icon }: { label: string; value: string | number; icon?: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--neutral-200)',
      borderRadius: 10,
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 12, color: 'var(--neutral-500)', fontWeight: 500, marginBottom: 4 }}>
        {icon && <span style={{ marginRight: 4 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--neutral-900)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
interface TabsProps {
  tabs: string[]
  active: number
  onChange: (i: number) => void
}
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--neutral-200)', marginBottom: 20 }}>
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: active === i ? 600 : 400,
            color: active === i ? 'var(--primary)' : 'var(--neutral-500)',
            borderBottom: active === i ? '2px solid var(--primary)' : '2px solid transparent',
            background: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ─── Input / Select ──────────────────────────────────────────────────────────
const inputBase: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--neutral-300)',
  borderRadius: 6,
  fontSize: 13,
  background: '#fff',
  color: 'var(--neutral-800)',
  outline: 'none',
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputBase, ...props.style }} />
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputBase, ...props.style }} />
}

// ─── Divider ─────────────────────────────────────────────────────────────────
export function Divider() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--neutral-200)', margin: '20px 0' }} />
}

// ─── Section Header ──────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h2>
      {subtitle && <p style={{ color: 'var(--neutral-500)', fontSize: 13 }}>{subtitle}</p>}
    </div>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────────────────
export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ background: 'var(--neutral-200)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s' }} />
    </div>
  )
}
