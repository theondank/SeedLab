import type { Plant } from '../types/plant'
import { request } from './api-client'

export function getPlants(): Promise<Plant[]> {
  return request<Plant[]>('/api/plants')
}

export async function getPlantById(id: number): Promise<Plant | undefined> {
  return (await getPlants()).find((plant) => plant.id === id)
}