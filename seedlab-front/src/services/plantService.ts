import type { Plant } from '../types/plant'
import { request } from './api-client'

export function getPlant(): Promise<Plant> {
  return request<Plant>('/api/capteurs/status')
}