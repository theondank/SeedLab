import { useEffect, useState } from 'react'
import { LuPlus, LuRefreshCw } from 'react-icons/lu'
import type { Plant } from '../types/plant'
import { plantService } from '../services'

const statusMeta = {
  ok: { label: 'Stable', classes: 'border-neon/40 bg-neon/10 text-neon' },
  warning: { label: 'À surveiller', classes: 'border-warn/40 bg-warn/10 text-warn' },
  alert: { label: 'Alerte', classes: 'border-alert/40 bg-alert/10 text-alert' },
} as const

export default function Plants() {
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await plantService.getPlants()
        if (!cancelled) {
          setPlants(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de liaison avec les bacs.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="titlebar text-xl font-bold uppercase tracking-wide text-ink">Plantes</h1>
          <p className="tag mt-2 text-muted">Inventaire des bacs connectés</p>
        </div>
        <button type="button" className="btn-neon">
          <LuPlus />
          Ajouter un bac
        </button>
      </div>

      {loading && (
        <div className="card p-6 font-mono text-sm text-muted">
          <LuRefreshCw className="mr-2 inline animate-spin" />
          Synchronisation des bacs…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-alert/50 bg-alert/10 p-6 font-mono text-sm text-alert">
          {error}
        </div>
      )}

      {!loading && !error && plants.length === 0 && (
        <div className="card p-6 font-mono text-sm text-muted">
          Aucun bac détecté sur le réseau.
        </div>
      )}

      {!loading && !error && plants.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plants.map(({ id, name, variety, humidity, temperature, status }) => (
            <article key={id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-ink">{name}</h2>
                  <p className="mt-0.5 font-mono text-xs text-muted">{variety}</p>
                </div>
                <span
                  className={`tag rounded-md border px-2.5 py-1 ${statusMeta[status].classes}`}
                >
                  {statusMeta[status].label}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 font-mono text-sm">
                <div>
                  <dt className="tag text-muted">Humidité sol</dt>
                  <dd className="cyber-copy mt-1 font-bold">{humidity} %</dd>
                </div>
                <div>
                  <dt className="tag text-muted">Température</dt>
                  <dd className="neon-copy mt-1 font-bold">{temperature} °C</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}