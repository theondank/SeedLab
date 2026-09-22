export type PlantStatus = 'ok' | 'warning' | 'alert'

export type Plant = {
  id: number
  name: string
  variety: string
  humidity: number
  temperature: number
  status: PlantStatus
}