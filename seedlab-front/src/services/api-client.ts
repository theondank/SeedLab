export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`Erreur API ${response.status} sur ${path}`)
  }

  return response.json() as Promise<T>
}