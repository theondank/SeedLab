import type { LoginCredentials, Session } from '../types/auth'
import { request } from './api-client'

export function login(credentials: LoginCredentials): Promise<Session> {
  return request<Session>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}