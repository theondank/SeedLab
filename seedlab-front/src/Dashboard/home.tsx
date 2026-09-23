import { useEffect, useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'
import { sensorService } from '../services'
import { subscribeWs } from '../services/wsClient'
import type { CapteurStatus } from '../types/sensor'

type SensorStatus = 'loading' | 'ok' | 'down'

export default function Home() {
  const [status, setStatus] = useState<SensorStatus>('loading')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const operational = await sensorService.getSensorStatus()
        if (!cancelled) setStatus(operational ? 'ok' : 'down')
      } catch {
        if (!cancelled) setStatus('down')
      }
    }

    void load()

    const unsubscribe = subscribeWs<CapteurStatus>('capteur:update', (data) => {
      setStatus(data.online ? 'ok' : 'down')
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const statusBadge = {
    loading: (
      <span className="tag inline-flex items-center gap-2 rounded-md border border-line bg-panel-2/70 px-3 py-1.5 text-muted">
        <LuRefreshCw className="animate-spin" />
        Verrouillage des capteurs…
      </span>
    ),
    ok: (
      <span className="tag inline-flex items-center gap-2 rounded-md border border-neon/40 bg-neon/10 px-3 py-1.5 text-neon">
        <span className="h-1.5 w-1.5 rounded-full bg-neon" />
        Capteurs opérationnels
      </span>
    ),
    down: (
      <span className="tag inline-flex items-center gap-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-1.5 text-warn">
        <span className="h-1.5 w-1.5 rounded-full bg-warn" />
        Capteurs hors-ligne
      </span>
    ),
  }[status]

  return (
    <section className="card max-w-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titlebar text-xl font-bold tracking-wide text-ink">Tableau de bord</h1>
        {statusBadge}
      </div>
      <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted">
        Interface SeedLab — surveillance et pilotage de la serre.
      </p>
      <p className="mt-2 text-sm text-muted">
        Les modules de pilotage des bancs <span className="neon-copy">2080</span> sont en cours
        d'alignement. Liaison avec le réseau de bacs en attente.
      </p>
    </section>
  )
}