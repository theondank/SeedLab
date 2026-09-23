import { useEffect, useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'
import type { Sensor } from '../types/sensor'
import { sensorService } from '../services'

export default function Sensors() {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await sensorService.getSensors()
        if (!cancelled) {
          setSensors(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de liaison avec les capteurs.')
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
      <div className="mb-6">
        <h1 className="titlebar text-xl font-bold uppercase tracking-wide text-ink">Capteurs</h1>
        <p className="tag mt-2 text-muted">Télémétrie en direct</p>
      </div>

      {loading && (
        <div className="card p-6 font-mono text-sm text-muted">
          <LuRefreshCw className="mr-2 inline animate-spin" />
          Établissement de la liaison…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-alert/50 bg-alert/10 p-6 font-mono text-sm text-alert">
          {error}
        </div>
      )}

      {!loading && !error && sensors.length === 0 && (
        <div className="card p-6 font-mono text-sm text-muted">
          Aucun capteur connecté au réseau.
        </div>
      )}

      {!loading && !error && sensors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sensors.map(({ id, name, type, unit, lastReading, lastUpdate }) => {
            const operational = lastReading !== null && lastUpdate !== null
            return (
              <article key={id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-ink">{name}</h2>
                    <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-muted">
                      {type}
                    </p>
                  </div>
                  {operational ? (
                    <span className="tag inline-flex items-center gap-2 rounded-md border border-neon/40 bg-neon/10 px-2.5 py-1 text-neon">
                      <span className="h-1.5 w-1.5 rounded-full bg-neon" />
                      En ligne
                    </span>
                  ) : (
                    <span className="tag inline-flex items-center gap-2 rounded-md border border-warn/40 bg-warn/10 px-2.5 py-1 text-warn">
                      <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                      Hors-ligne
                    </span>
                  )}
                </div>

                <dl className="mt-5 border-t border-line pt-4 font-mono">
                  <div className="flex items-baseline justify-between">
                    <dt className="tag text-muted">Dernier relevé</dt>
                    <dd className="neon-copy text-lg font-bold">
                      {operational ? `${lastReading} ${unit}` : 'Aucune donnée'}
                    </dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}