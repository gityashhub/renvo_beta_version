import React from 'react'
import { cn } from '../lib/utils'
import { Loader2, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react'

/* ─── Button ─────────────────────────────────────────────────────────────── */
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-600 shadow-sm',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
  outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
  destructive: 'bg-red-500 text-white hover:bg-red-600 border border-red-500 shadow-sm',
}
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-6 text-sm',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: React.ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

/* ─── Card ───────────────────────────────────────────────────────────────── */
interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Card({ children, className, style }: CardProps) {
  return (
    <div
      className={cn('bg-white border border-slate-200 rounded-lg shadow-sm', className)}
      style={style}
    >
      {children}
    </div>
  )
}

/* ─── Alert ──────────────────────────────────────────────────────────────── */
type AlertKind = 'success' | 'error' | 'warning' | 'info'
const alertStyles: Record<AlertKind, { wrapper: string; icon: string; Icon: React.ComponentType<{ className?: string }> }> = {
  success: { wrapper: 'bg-emerald-50 border-emerald-200 text-emerald-800', icon: 'text-emerald-600', Icon: CheckCircle2 },
  error: { wrapper: 'bg-red-50 border-red-200 text-red-800', icon: 'text-red-600', Icon: XCircle },
  warning: { wrapper: 'bg-amber-50 border-amber-200 text-amber-800', icon: 'text-amber-600', Icon: AlertTriangle },
  info: { wrapper: 'bg-blue-50 border-blue-200 text-blue-800', icon: 'text-blue-600', Icon: Info },
}

interface AlertProps { type: AlertKind; message: string; className?: string }

export function Alert({ type, message, className }: AlertProps) {
  const s = alertStyles[type]
  return (
    <div className={cn(`flex items-start gap-3 p-3 rounded-lg border text-sm ${s.wrapper}`, className)}>
      <s.Icon className={`h-4 w-4 mt-0.5 shrink-0 ${s.icon}`} />
      <span>{message}</span>
    </div>
  )
}

/* ─── MetricCard ─────────────────────────────────────────────────────────── */
interface MetricCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  sub?: string
  color?: string
  className?: string
}

export function MetricCard({ label, value, icon, sub, className }: MetricCardProps) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-lg shadow-sm p-5', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        {icon && <div className="h-8 w-8 bg-slate-50 rounded-md flex items-center justify-center border border-slate-100">{icon}</div>}
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

/* ─── Tabs ───────────────────────────────────────────────────────────────── */
interface TabsProps {
  tabs: string[]
  active: number
  onChange: (i: number) => void
  className?: string
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex bg-slate-100 p-1 rounded-lg gap-1', className)}>
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => onChange(i)}
          className={cn(
            'flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all',
            active === i
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

/* ─── Input ──────────────────────────────────────────────────────────────── */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-semibold text-slate-600">{label}</label>}
      <input
        className={cn(
          'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50',
          error && 'border-red-300 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

/* ─── SelectInput ────────────────────────────────────────────────────────── */
interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[] | string[]
}

export function SelectInput({ label, options, className, ...props }: SelectInputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-semibold text-slate-600">{label}</label>}
      <select
        className={cn(
          'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 cursor-pointer',
          className
        )}
        {...props}
      >
        {options.map((opt) => {
          const value = typeof opt === 'string' ? opt : opt.value
          const label = typeof opt === 'string' ? opt : opt.label
          return <option key={value} value={value}>{label}</option>
        })}
      </select>
    </div>
  )
}

/* ─── ProgressBar ────────────────────────────────────────────────────────── */
interface ProgressBarProps { value: number; max?: number; className?: string; color?: string }

export function ProgressBar({ value, max = 100, className, color }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const barColor = color ?? (pct >= 80 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444')
  return (
    <div className={cn('w-full h-2 bg-slate-100 rounded-full overflow-hidden', className)}>
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  )
}

/* ─── SectionHeader ──────────────────────────────────────────────────────── */
interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 ml-4">{action}</div>}
    </div>
  )
}

/* ─── Divider ────────────────────────────────────────────────────────────── */
export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-slate-200 my-4', className)} />
}

/* ─── Badge ──────────────────────────────────────────────────────────────── */
type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'
const badgeStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
}

export function Badge({ variant = 'default', children, className }: { variant?: BadgeVariant; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border', badgeStyles[variant], className)}>
      {children}
    </span>
  )
}
