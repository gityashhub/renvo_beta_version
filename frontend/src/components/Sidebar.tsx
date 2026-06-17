import { NavLink, useNavigate } from 'react-router-dom'
import {
  Database,
  LayoutDashboard,
  Wand2,
  Columns,
  ArrowRightLeft,
  TestTube2,
  Scale,
  BarChart3,
  FileText,
  Bot,
  Activity,
} from 'lucide-react'

const NAV = [
  {
    group: null,
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
    ],
  },
  {
    group: 'Data Cleaning',
    items: [
      { label: 'Anomaly Detection', icon: Activity, to: '/anomaly-detection' },
      { label: 'Data Transformation', icon: ArrowRightLeft, to: '/data-transformation' },
      { label: 'Column Analysis', icon: Columns, to: '/column-analysis' },
      { label: 'Cleaning Wizard', icon: Wand2, to: '/cleaning-wizard' },
    ],
  },
  {
    group: 'Data Analysis',
    items: [
      { label: 'Hypothesis Testing', icon: TestTube2, to: '/hypothesis-testing' },
      { label: 'Data Balancer', icon: Scale, to: '/data-balancer' },
    ],
  },
  {
    group: 'Visualization',
    items: [
      { label: 'Charts', icon: BarChart3, to: '/visualization' },
      { label: 'Reports', icon: FileText, to: '/reports' },
    ],
  },
  {
    group: 'AI',
    items: [
      { label: 'AI Assistant', icon: Bot, to: '/ai-assistant' },
    ],
  },
]

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="w-[240px] bg-white flex flex-col flex-shrink-0 border-r border-slate-200" style={{ height: '100vh' }}>
      {/* Logo */}
      <div
        className="h-16 flex items-center px-6 border-b border-slate-200 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <Database className="w-5 h-5 text-blue-600 mr-2 shrink-0" />
        <div>
          <h1 className="font-bold text-sm tracking-wide text-slate-900">Renvo AI</h1>
          <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">Data Cleaning Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-5">
        {NAV.map(({ group, items }) => (
          <div key={group ?? 'main'} className="space-y-0.5">
            {group && (
              <div className="px-6 text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">
                {group}
              </div>
            )}
            {items.map(({ label, icon: Icon, to }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center px-6 py-2 text-sm font-medium transition-colors border-l-[3px] ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-blue-600'
                      : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom user area */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-blue-700">DA</span>
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-semibold text-slate-900 truncate">Data Analyst</p>
            <p className="text-xs text-slate-500 truncate">renvo.ai</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
