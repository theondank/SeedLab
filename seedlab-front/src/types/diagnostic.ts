export type DiagnosticStatut = 'vide' | 'en_cours' | 'pret' | 'erreur' | string

export type Diagnostic = {
  etat?: string
  diagnostic?: string
  actions?: string[]
  image?: string
  capteurs?: {
    temperature?: number
    humidite?: number
    luminosite?: number
  }
  date?: string
  statut?: DiagnosticStatut
}