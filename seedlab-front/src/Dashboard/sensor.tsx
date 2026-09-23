import { useEffect, useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'
import type { CapteurStatus } from '../types/sensor'
import { sensorService } from '../services'
import { subscribeWs } from '../services/wsClient'

const formatArrosage = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return 'Jamais'
  return `${Math.round(value)} s`
}

export default function Sensors() {
  const [status, setStatus] = useState<CapteurStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await sensorService.getStatus()
        if (!cancelled) {
          setStatus(data)
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

    const unsubscribe = subscribeWs<CapteurStatus>('capteur:update', (data) => {
      setStatus(data)
      setError(null)
    })

    return () => {
      cancelled = true
      unsubscribe()
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

      {!loading && !error && status && (
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {status.online ? (
              <span className="tag inline-flex items-center gap-2 rounded-md border border-neon/40 bg-neon/10 px-3 py-1.5 text-neon">
                <span className="h-1.5 w-1.5 rounded-full bg-neon" />
                Réseau de bacs en ligne
              </span>
            ) : (
              <span className="tag inline-flex items-center gap-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-1.5 text-warn">
                <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                Hors-ligne
              </span>
            )}
            <span className="tag rounded-md border border-line bg-panel-2/70 px-3 py-1.5 text-muted">
              {status.etat}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Température',
                value: `${status.temperature} °C`,
                accent: 'neon-copy',
              },
              { label: 'Humidité sol', value: `${status.humidite} %`, accent: 'cyber-copy' },
              { label: 'Luminosité', value: `${status.luminosite} lux`, accent: 'neon-copy' },
              {
                label: 'Dernier arrosage',
                value: formatArrosage(status.dernier_arrosage),
                accent: 'cyber-copy',
              },
            ].map(({ label, value, accent }) => (
              <article key={label} className="card p-5">
                <p className="tag text-muted">{label}</p>
                <p className={`${accent} mt-3 text-2xl font-bold`}>{value}</p>
              </article>
            ))}
          </div>

          <p className="mt-5 font-mono text-xs uppercase tracking-widest text-muted">
            Dernière mise à jour : {new Date(status.date_heure).toLocaleString('fr-FR')}
          </p>
        </div>
      )}
    </div>
  )
}