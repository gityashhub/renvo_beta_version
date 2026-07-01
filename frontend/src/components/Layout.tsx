import { createContext, useContext, useState, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'

interface SidebarContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

export const SidebarContext = createContext<SidebarContextValue>({ open: false, setOpen: () => {} })
export const useSidebar = () => useContext(SidebarContext)

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div
        className="flex h-screen bg-slate-50 overflow-hidden text-slate-900"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        {/* Mobile overlay */}
        {open && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top bar */}
          <header className="lg:hidden flex items-center h-14 px-4 bg-white border-b border-slate-200 shrink-0 z-20">
            <button
              onClick={() => setOpen(true)}
              className="p-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors -ml-1"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="ml-3 font-bold text-sm text-slate-900 tracking-wide">Renvo AI</span>
          </header>

          <main className="flex-1 overflow-auto bg-slate-50">
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
