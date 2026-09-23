export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'seedlab-theme'

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function getStoredTheme(): Theme {
  const value = localStorage.getItem(STORAGE_KEY)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'light'
}

function isDark(theme: Theme): boolean {
  return theme === 'dark' || (theme === 'system' && prefersDark())
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', isDark(theme))
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme)
  applyTheme(theme)
}

export function initTheme(): void {
  applyTheme(getStoredTheme())
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system')
  })
}