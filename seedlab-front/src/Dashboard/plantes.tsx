import { useEffect, useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'
import { mapEtatStatus, type Plant } from '../types/plant'
import { plantService } from '../services'

const statusMeta = {
  ok: { label: 'Stable', classes: 'border-neon/40 bg-neon/10 text-neon' },
  warning: { label: 'À surveiller', classes: 'border-warn/40 bg-warn/10 text-warn' },
  alert: { label: 'Alerte', classes: 'border-alert/40 bg-alert/10 text-alert' },
} as const

export default function Plants() {
  const [plant, setPlant] = useState<Plant | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const data = await plantService.getPlant()
        if (!cancelled) {
          setPlant(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur de liaison avec le bac.')
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
        <h1 className="titlebar text-xl font-bold uppercase tracking-wide text-ink">Plantes</h1>
        <p className="tag mt-2 text-muted">État courant du bac connecté</p>
      </div>

      {loading && (
        <div className="card p-6 font-mono text-sm text-muted">
          <LuRefreshCw className="mr-2 inline animate-spin" />
          Synchronisation du bac…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-md border border-alert/50 bg-alert/10 p-6 font-mono text-sm text-alert">
          {error}
        </div>
      )}

      {!loading && !error && plant && (
        <article className="card max-w-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`tag rounded-md border px-3 py-1.5 ${statusMeta[mapEtatStatus(plant.etat)].classes}`}
              >
                {statusMeta[mapEtatStatus(plant.etat)].label}
              </span>
              {plant.online ? (
                <span className="tag inline-flex items-center gap-2 rounded-md border border-neon/40 bg-neon/10 px-3 py-1.5 text-neon">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon" />
                  En ligne
                </span>
              ) : (
                <span className="tag inline-flex items-center gap-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-1.5 text-warn">
                  <span className="h-1.5 w-1.5 rounded-full bg-warn" />
                  Hors-ligne
                </span>
              )}
            </div>
          </div>

          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted">{plant.etat}</p>

          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 font-mono text-sm sm:grid-cols-4">
            <div>
              <dt className="tag text-muted">Humidité sol</dt>
              <dd className="cyber-copy mt-1 font-bold">{plant.humidite} %</dd>
            </div>
            <div>
              <dt className="tag text-muted">Température</dt>
              <dd className="neon-copy mt-1 font-bold">{plant.temperature} °C</dd>
            </div>
            <div>
              <dt className="tag text-muted">Luminosité</dt>
              <dd className="cyber-copy mt-1 font-bold">{plant.luminosite} lux</dd>
            </div>
            <div>
              <dt className="tag text-muted">Dernier arrosage</dt>
              <dd className="neon-copy mt-1 font-bold">
                {plant.dernier_arrosage > 0 ? `${plant.dernier_arrosage} s` : 'Jamais'}
              </dd>
            </div>
          </dl>

          <p className="mt-5 font-mono text-xs uppercase tracking-widest text-muted">
            Dernière mise à jour : {new Date(plant.date_heure).toLocaleString('fr-FR')}
          </p>
        </article>
      )}
    </div>
  )
}