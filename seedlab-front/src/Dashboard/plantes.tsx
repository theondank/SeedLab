import { useEffect, useState } from 'react'
import { LuPlus, LuRefreshCw, LuX, LuWand } from 'react-icons/lu'
import { mapEtatStatus, type Plant, type PlantRecord } from '../types/plant'
import type { Diagnostic } from '../types/diagnostic'
import { iaService, plantService } from '../services'
import { subscribeWs } from '../services/wsClient'

const statusMeta = {
  ok: { label: 'Stable', classes: 'border-neon/40 bg-neon/10 text-neon' },
  warning: { label: 'À surveiller', classes: 'border-warn/40 bg-warn/10 text-warn' },
  alert: { label: 'Alerte', classes: 'border-alert/40 bg-alert/10 text-alert' },
} as const

const iaStatusLabel = {
  vide: 'Pas encore de diagnostic',
  en_cours: 'Analyse en cours…',
  pret: 'Diagnostic disponible',
  erreur: 'Échec de l’analyse',
} as const

export default function Plants() {
  const [plant, setPlant] = useState<Plant | null>(null)
  const [plantes, setPlantes] = useState<PlantRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [nom, setNom] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [selected, setSelected] = useState<PlantRecord | null>(null)
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null)
  const [iaLoading, setIaLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const [status, { plantes }, iaDiag] = await Promise.all([
          plantService.getPlant(),
          plantService.getPlants(),
          iaService.getDiagnostic(),
        ])
        if (!cancelled) {
          setPlant(status)
          setPlantes(plantes)
          setDiagnostic(iaDiag)
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

    const unsubscribe = subscribeWs<Plant>('capteur:update', (data) => {
      setPlant(data)
    })

    const unsubscribeIa = subscribeWs<unknown>('ia:diagnostic', (data) => {
      setDiagnostic(iaService.normaliserDiagnostic(data))
    })

    return () => {
      cancelled = true
      unsubscribe()
      unsubscribeIa()
    }
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim() || adding) return

    setAdding(true)
    setAddError(null)
    try {
      const { plante } = await plantService.addPlant(nom.trim())
      setPlantes((prev) => [plante, ...prev])
      setModalOpen(false)
      setNom('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Impossible d’ajouter la plante.')
    } finally {
      setAdding(false)
    }
  }

  const handleAnalyse = async () => {
    if (iaLoading) return
    setIaLoading(true)
    try {
      const ok = await iaService.demanderAnalyse()
      if (ok) {
        setDiagnostic({ ...(diagnostic ?? {}), statut: 'en_cours' })
      }
    } finally {
      setIaLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="titlebar text-xl font-bold uppercase tracking-wide text-ink">Plantes</h1>
          <p className="tag mt-2 text-muted">État courant du bac connecté</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setAddError(null)
            setNom('')
            setModalOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-md border border-neon/50 bg-neon/10 px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon transition hover:bg-neon/20"
        >
          <LuPlus className="text-lg" />
          Ajouter une plante
        </button>
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

      <section className="mt-8">
        <h2 className="titlebar text-sm font-bold uppercase tracking-widest text-ink">
          Plantes enregistrées
        </h2>

        {plantes.length === 0 && (
          <p className="tag mt-4 text-muted">Aucune plante enregistrée pour le moment.</p>
        )}

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plantes.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setSelected(p)}
                className="card w-full p-4 text-left transition hover:border-neon/50 hover:shadow-[0_0_18px_rgba(0,255,163,0.08)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-ink">{p.nom}</span>
                  <span
                    className={`tag rounded-md border px-2 py-1 font-mono text-xs uppercase ${statusMeta[mapEtatStatus(p.etat)].classes}`}
                  >
                    {statusMeta[mapEtatStatus(p.etat)].label}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && plant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="titlebar text-sm font-bold uppercase tracking-widest text-ink">
                  {selected.nom}
                </h2>
                <span
                  className={`tag rounded-md border px-2 py-1 font-mono text-xs uppercase ${statusMeta[mapEtatStatus(plant.etat)].classes}`}
                >
                  {statusMeta[mapEtatStatus(plant.etat)].label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fermer"
                className="rounded-md border border-line p-1.5 text-muted transition hover:border-alert/50 hover:text-alert"
              >
                <LuX className="text-lg" />
              </button>
            </div>

            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted">{plant.etat}</p>

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

            <div className="mt-6 border-t border-line pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="tag inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink">
                  <LuWand className="text-cyber" />
                  Diagnostic IA
                </h3>
                <button
                  type="button"
                  onClick={handleAnalyse}
                  disabled={iaLoading}
                  className="inline-flex items-center gap-2 rounded-md border border-cyber/50 bg-cyber/10 px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest text-cyber transition hover:bg-cyber/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {iaLoading ? (
                    <LuRefreshCw className="animate-spin" />
                  ) : (
                    <LuWand />
                  )}
                  Analyser maintenant
                </button>
              </div>

              {(!diagnostic || diagnostic.statut === 'vide' || !diagnostic.diagnostic) && (
                <p className="mt-3 font-mono text-xs text-muted">
                  {iaStatusLabel[diagnostic?.statut === 'en_cours' ? 'en_cours' : 'vide']}
                </p>
              )}

              {diagnostic?.statut === 'en_cours' && (
                <p className="mt-3 inline-flex items-center gap-2 font-mono text-xs text-cyber">
                  <LuRefreshCw className="animate-spin" />
                  L’IA analyse les données et la dernière photo…
                </p>
              )}

              {diagnostic?.diagnostic && (
                <div className="mt-3">
                  {diagnostic.etat && (
                    <span
                      className={`tag rounded-md border px-2 py-1 font-mono text-xs uppercase ${statusMeta[mapEtatStatus(diagnostic.etat)].classes}`}
                    >
                      {statusMeta[mapEtatStatus(diagnostic.etat)].label}
                    </span>
                  )}

                  {diagnostic.image && (
                    <img
                      src={diagnostic.image}
                      alt="Capteur ESP32"
                      className="mt-3 w-full rounded-md border border-line object-cover"
                    />
                  )}

                  <p className="mt-3 text-sm text-ink">{diagnostic.diagnostic}</p>

                  {diagnostic.actions && diagnostic.actions.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {diagnostic.actions.map((action, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 font-mono text-xs text-muted"
                        >
                          <span className="text-cyber">›</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  )}

                  {diagnostic.date && (
                    <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted">
                      Analyse du : {new Date(diagnostic.date).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <p className="mt-5 font-mono text-xs uppercase tracking-widest text-muted">
              Dernière mise à jour :{' '}
              {new Date(plant.date_heure).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !adding && setModalOpen(false)}
        >
          <form
            onSubmit={handleAdd}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="titlebar text-sm font-bold uppercase tracking-widest text-ink">
                Ajouter une plante
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={adding}
                aria-label="Fermer"
                className="rounded-md border border-line p-1.5 text-muted transition hover:border-alert/50 hover:text-alert disabled:opacity-40"
              >
                <LuX className="text-lg" />
              </button>
            </div>

            <label className="mt-5 block text-sm text-ink">
              Nom de la plante
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex : Basilic, Tomate…"
                autoFocus
                maxLength={50}
                className="mt-2 w-full rounded-md border border-line bg-panel-2/60 px-3 py-2 font-mono text-sm text-ink placeholder:opacity-40 focus:border-neon/60 focus:outline-none focus:ring-2 focus:ring-neon/20"
              />
            </label>

            {addError && (
              <p className="mt-3 font-mono text-xs text-alert">{addError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={adding}
                className="rounded-md border border-line px-4 py-2 font-mono text-sm uppercase tracking-widest text-muted transition hover:border-cyber/50 hover:text-ink disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!nom.trim() || adding}
                className="inline-flex items-center gap-2 rounded-md border border-neon/50 bg-neon/10 px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest text-neon transition hover:bg-neon/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {adding && <LuRefreshCw className="animate-spin" />}
                Ajouter
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
