import { useState } from 'react'
import type { Settings } from '../types/settings'
import { getStoredTheme, setTheme } from '../theme'
import type { Theme } from '../theme'

const PREFS_KEY = 'seedlab-prefs'

const defaultPrefs: Settings = {
  language: 'fr',
  timezone: 'Europe/Paris',
  emailNotifications: true,
  pushNotifications: false,
}

function loadPrefs(): Settings {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    // préférences corrompues : on repart des valeurs par défaut
  }
  return defaultPrefs
}

const themeOptions: { value: Theme; label: string; hint: string }[] = [
  { value: 'light', label: 'Clair', hint: 'Interface lumineuse' },
  { value: 'dark', label: 'Sombre', hint: 'Interface sombre' },
]


const toggleSpan =
  'peer-checked:before:translate-x-6 flex h-6 w-11 items-center rounded-full border border-line bg-panel-2 transition before:h-4 before:w-4 before:translate-x-1 before:rounded-full before:bg-muted before:transition-transform peer-checked:border-neon peer-checked:bg-neon/15 peer-checked:before:bg-neon peer-focus-visible:ring-2 peer-focus-visible:ring-neon/30'

export default function Parameters() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme())
  const [prefs, setPrefs] = useState<Settings>(() => loadPrefs())

  const handleTheme = (value: Theme) => {
    setTheme(value)
    setThemeState(value)
  }

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="titlebar text-xl font-bold uppercase tracking-wide text-ink">Paramètres</h1>
        <p className="tag mt-2 text-muted">Configuration locale du terminal</p>
      </div>

      <div className="space-y-5">
        <section className="card p-5">
          <h2 className="titlebar text-sm font-bold tracking-widest text-ink">Apparence</h2>

          <div className="mt-4 flex gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleTheme(option.value)}
                aria-pressed={theme === option.value}
                className={`flex-1 rounded-lg border p-3 text-left transition ${
                  theme === option.value
                    ? 'border-neon/70 bg-neon/10 text-neon'
                    : 'border-line bg-panel-2/60 text-muted hover:border-cyber/50 hover:text-ink'
                }`}
              >
                <span className="block font-mono text-sm font-bold uppercase tracking-widest">
                  {option.label}
                </span>
                <span className="mt-0.5 block font-mono text-xs uppercase tracking-widest opacity-70">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="titlebar text-sm font-bold tracking-widest text-ink">Notifications</h2>

          <div className="mt-4 space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm text-ink">
                E-mail
                <span className="block font-mono text-xs uppercase tracking-widest text-muted">
                  Un message à chaque alerte
                </span>
              </span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={prefs.emailNotifications}
                onChange={(e) => update('emailNotifications', e.target.checked)}
              />
              <span className={toggleSpan} />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm text-ink">
                Notifications push
                <span className="block font-mono text-xs uppercase tracking-widest text-muted">
                  Alertes en temps réel
                </span>
              </span>
              <input
                type="checkbox"
                className="peer sr-only"
                checked={prefs.pushNotifications}
                onChange={(e) => update('pushNotifications', e.target.checked)}
              />
              <span className={toggleSpan} />
            </label>
          </div>
        </section>
      </div>
    </div>
  )
}