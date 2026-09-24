import type { CapteurStatus } from '../types/sensor'
import { request } from './api-client'

export function getStatus(): Promise<CapteurStatus> {
  return request<CapteurStatus>('/api/capteurs/status')
}

export async function getSensorStatus(): Promise<boolean> {
  const status = await getStatus()
  return status.online
}