import type { Sensor } from '../types/sensor'
import { request } from './api-client'

export function getSensors(): Promise<Sensor[]> {
  return request<Sensor[]>('/api/sensors')
}

export async function getSensorStatus(): Promise<boolean> {
  const sensors = await getSensors()
  return sensors.length > 0 && sensors.every((s) => s.lastReading !== null && s.lastUpdate !== null)
}