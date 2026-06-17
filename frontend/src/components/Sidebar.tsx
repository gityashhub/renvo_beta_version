import { NavLink } from 'react-router-dom'

const NAV = [
  {
    group: 'Data Cleaning',
    items: [
      { label: '🔍 Anomaly Detection', to: '/anomaly-detection' },
      { label: '🔄 Data Transformation', to: '/data-transformation' },
      { label: '📊 Column Analysis', to: '/column-analysis' },
      { label: '🧹 Cleaning Wizard', to: '/cleaning-wizard' },
    ],
  },
  {
    group: 'Data Analysis',
    items: [
      { label: '📋 Hypothesis Testing', to: '/hypothesis-testing' },
      { label: '⚖️ Data Balancer', to: '/data-balancer' },
    ],
  },
  {
    group: 'Visualization',
    items: [
      { label: '📈 Charts', to: '/visualization' },
      { label: '📄 Reports', to: '/reports' },
    ],
  },
  {
    group: 'AI',
    items: [
      { label: '🤖 AI Assistant', to: '/ai-assistant' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside style={{
      width: 240,
      minWidth: 240,
      background: 'var(--neutral-50)',
      borderRight: '1px solid var(--neutral-200)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <NavLink to="/" style={{ textDecoration: 'none' }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--neutral-200)' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>
            Renvo AI
          </div>
          <div style={{ fontSize: 11, color: 'var(--neutral-500)', marginTop: 2 }}>
            Intelligent Data Cleaning
          </div>
        </div>
      </NavLink>

      {/* Navigation */}
      <nav style={{ padding: '12px 0', flex: 1 }}>
        {NAV.map(({ group, items }) => (
          <div key={group} style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--neutral-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '6px 16px',
            }}>
              {group}
            </div>
            {items.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--primary)' : 'var(--neutral-700)',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                })}
              >
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
