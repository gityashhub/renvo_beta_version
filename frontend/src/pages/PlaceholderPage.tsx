import { TestTube2, Scale, BarChart3, FileText, Bot, Construction } from 'lucide-react'

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TestTube2, Scale, BarChart3, FileText, Bot,
}

interface Props {
  title: string
  description?: string
  icon?: string
}

export default function PlaceholderPage({ title, description, icon }: Props) {
  const Icon = (icon && ICONS[icon]) ? ICONS[icon] : Construction

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
          <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
            <Icon className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Coming Soon</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            {description ?? 'This module is currently under development and will be available in the next release.'}
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            In Development
          </div>
        </div>
      </div>
    </div>
  )
}
