export type PlantStatus = 'ok' | 'warning' | 'alert'

export type Plant = {
  online: boolean
  temperature: number
  humidite: number
  luminosite: number
  etat: string
  dernier_arrosage: number
  date_heure: string
}

export function mapEtatStatus(etat: string): PlantStatus {
  if (etat.includes('arrosage')) return 'alert'
  if (etat.includes('chaleur')) return 'warning'
  return 'ok'
}