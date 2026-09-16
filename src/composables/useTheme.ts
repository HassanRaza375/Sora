import { ref, watch } from 'vue'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'sora:theme'

function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
  } catch {
    // Private browsing / storage disabled — fall back to the default
    // rather than erroring; the theme still works for this session, it
    // just won't persist across reloads.
    return 'system'
  }
}

const media = window.matchMedia('(prefers-color-scheme: dark)')

function applyTheme(preference: ThemePreference) {
  const isDark = preference === 'dark' || (preference === 'system' && media.matches)
  document.documentElement.classList.toggle('dark', isDark)
}

// Module-level singleton — one shared `theme` ref and one set of side
// effects (localStorage write, DOM class toggle, OS-preference listener)
// no matter how many components call useTheme(), rather than a fresh
// localStorage-backed ref per call that could drift out of sync with
// other callers. Applied immediately at module load (import time), not
// gated behind a component mount, so the correct class is on <html> as
// early as this module is reached in App.vue's import graph.
const theme = ref<ThemePreference>(readStoredTheme())
applyTheme(theme.value)

watch(theme, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Ignore — see readStoredTheme()'s note; the in-memory theme still applies this session.
  }
  applyTheme(value)
})

// Only matters while "System" is selected — re-applies whenever the OS
// preference flips while the app is open.
media.addEventListener('change', () => {
  if (theme.value === 'system') applyTheme('system')
})

export function useTheme() {
  function setTheme(preference: ThemePreference) {
    theme.value = preference
  }
  return { theme, setTheme }
}
