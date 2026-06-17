import type { ReactNode } from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {children}
      </main>
    </div>
  )
}
