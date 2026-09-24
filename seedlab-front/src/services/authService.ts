import type { LoginCredentials, Session } from '../types/auth'
import { request } from './api-client'

type LoginResponse = {
  success: boolean
  message?: string
  token: string
  user: Session['user']
}

export async function login(credentials: LoginCredentials): Promise<Session> {
  const data = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  return { token: data.token, user: data.user }
}

export function logout(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/auth/logout', {
    method: 'POST',
  })
}

export function startFingerprint(): Promise<{ success: boolean; message: string }> {
  return request('/api/auth/fingerprint/start', { method: 'POST' })
}

export function getFingerprintStatus(): Promise<{
  active: boolean
  status: 'idle' | 'waiting' | 'success' | 'failed'
  scan_required: boolean
  user: Session['user'] | null
  token: string | null
  message: string | null
}> {
  return request('/api/auth/fingerprint/status')
}

export function cancelFingerprint(): Promise<{ success: boolean }> {
  return request('/api/auth/fingerprint/cancel', { method: 'POST' })
}