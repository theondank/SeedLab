import type { Diagnostic } from '../types/diagnostic'
import { request } from './api-client'

// Contrat d'API en attente du code backend (autre dev) : ces constantes sont les
// seules à ajuster si le format diffère.
export const IA_ANALYSE_ENDPOINT = '/api/ia/analyser'
export const IA_DIAGNOSTIC_ENDPOINT = '/api/ia/diagnostic'

const emptyDiagnostic = (): Diagnostic => ({
  etat: undefined,
  diagnostic: undefined,
  actions: [],
  image: undefined,
  capteurs: undefined,
  date: undefined,
  statut: 'vide',
})

const toArrayString = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string') return value.split('\n').filter(Boolean)
  return []
}

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
    return Number(value)
  return undefined
}

const normaliserStatut = (value: unknown): Diagnostic['statut'] => {
  if (typeof value !== 'string') return undefined
  const statut = value.toLowerCase()
  if (statut.includes('en_cours') || statut.includes('en cours') || statut.includes('running'))
    return 'en_cours'
  if (statut.includes('pret') || statut.includes('prêt') || statut.includes('done') || statut.includes('ready'))
    return 'pret'
  if (statut.includes('vide') || statut.includes('empty') || statut.includes('awaiting'))
    return 'vide'
  if (statut.includes('erreur') || statut.includes('error') || statut.includes('failed'))
    return 'erreur'
  return statut
}

export function normaliserDiagnostic(payload: unknown): Diagnostic {
  if (!payload || typeof payload !== 'object') return emptyDiagnostic()

  const raw = payload as Record<string, unknown>
  const statsExternes = typeof raw.capteurs === 'object' && raw.capteurs !== null
    ? (raw.capteurs as Record<string, unknown>)
    : undefined
  const etat_raw = raw.etat ?? raw.etat_plants ?? raw.statut
  const image_raw = raw.image ?? raw.image_url ?? raw.photo ?? raw.fichier

  return {
    etat: typeof etat_raw === 'string' ? etat_raw : undefined,
    diagnostic:
      typeof raw.diagnostic === 'string'
        ? raw.diagnostic
        : typeof raw.analyse === 'string'
          ? raw.analyse
          : typeof raw.message === 'string'
            ? raw.message
            : undefined,
    actions: toArrayString(raw.actions ?? raw.action ?? raw.recommandations),
    image: typeof image_raw === 'string' ? image_raw : undefined,
    capteurs: statsExternes
      ? {
          temperature: asNumber(statsExternes.temperature),
          humidite: asNumber(statsExternes.humidite),
          luminosite: asNumber(statsExternes.luminosite),
        }
      : undefined,
    date: typeof raw.date === 'string' ? raw.date : typeof raw.created_at === 'string' ? raw.created_at : undefined,
    statut: raw.status === undefined ? normaliserStatut(etat_raw) : normaliserStatut(raw.status),
  }
}

export async function getDiagnostic(): Promise<Diagnostic> {
  try {
    const data = await request<unknown>(IA_DIAGNOSTIC_ENDPOINT)
    return normaliserDiagnostic(data)
  } catch {
    return emptyDiagnostic()
  }
}

export async function demanderAnalyse(): Promise<boolean> {
  try {
    await request<unknown>(IA_ANALYSE_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    return true
  } catch {
    return false
  }
}