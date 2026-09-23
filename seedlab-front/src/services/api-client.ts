export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  })

  if (!response.ok) {
    let message = `Erreur API ${response.status} sur ${path}`
    try {
      const data = (await response.json()) as Record<string, unknown> | null
      if (data && typeof data.message === 'string') {
        message = data.message
      }
    } catch {
      // réponse non-JSON : on garde le message générique
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}