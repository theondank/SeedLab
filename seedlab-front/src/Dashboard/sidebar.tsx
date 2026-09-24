import { NavLink, useNavigate } from 'react-router-dom'
import {
  LuChartLine,
  LuDroplets,
  LuLayoutDashboard,
  LuLogOut,
  LuSettings,
  LuSprout,
  LuThermometer,
  LuTriangleAlert,
  LuX,
} from 'react-icons/lu'
import logo from '../assets/seedlab-logo-trimmed.png'
import { authService } from '../services'

const navItems = [
  { label: 'Tableau de bord', to: '/dashboard', icon: LuLayoutDashboard },
  { label: 'Plantes', to: '/dashboard/plantes', icon: LuSprout },
  { label: 'Capteurs', to: '/dashboard/capteurs', icon: LuThermometer },
  { label: 'Irrigation', to: '/irrigation', icon: LuDroplets },
  { label: 'Alertes', to: '/alertes', icon: LuTriangleAlert },
  { label: 'Rapports', to: '/rapports', icon: LuChartLine },
  { label: 'Paramètres', to: '/dashboard/parametres', icon: LuSettings },
]

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // déconnexion locale même si le serveur est injoignable
    }
    navigate('/')
  }

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-panel/90 backdrop-blur-md transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <img src={logo} alt="SeedLab" className="h-10 w-auto" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="rounded-md p-1 text-muted transition hover:text-cyber lg:hidden"
          >
            <LuX className="text-xl" />
          </button>
        </div>

        <p className="tag px-5 pb-4 text-muted/70">Pilotage · v2080</p>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-neon/10 text-neon'
                    : 'text-muted hover:bg-panel-2 hover:text-ink'
                }`
              }
            >
              <Icon className="text-lg" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md border border-line-2 bg-panel-2/60 px-3 py-2.5 text-sm text-muted transition hover:border-alert/50 hover:text-alert"
          >
            <LuLogOut className="text-lg" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}