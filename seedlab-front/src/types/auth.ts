export type LoginCredentials = {
  identifiant: string
  password: string
  remember: boolean
}

export type User = {
  id: number
  name: string
  email: string
}

export type Session = {
  token: string
  user: User
}