import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { LuMenu } from 'react-icons/lu'
import Sidebar from './sidebar'

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-panel/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            className="rounded-md border border-line p-1.5 text-muted transition hover:border-cyber/50 hover:text-cyber"
          >
            <LuMenu className="text-xl" />
          </button>
          <span className="tag text-ink">
            SeedLab <span className="neon-copy">OS</span>
          </span>
        </header>

        <main className="p-6 lg:p-8">{<Outlet />}</main>
      </div>
    </div>
  )
}