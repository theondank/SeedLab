import type { Plant, PlantRecord } from '../types/plant'
import { request } from './api-client'

export function getPlant(): Promise<Plant> {
  return request<Plant>('/api/capteurs/status')
}

export function getPlants(): Promise<{ plantes: PlantRecord[] }> {
  return request<{ plantes: PlantRecord[] }>('/api/plantes')
}

export function addPlant(nom: string): Promise<{ plante: PlantRecord }> {
  return request<{ plante: PlantRecord }>('/api/plantes', {
    method: 'POST',
    body: JSON.stringify({ nom }),
  })
}