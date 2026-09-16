import { ref } from 'vue'

const isOpen = ref(false)
const query = ref<string | number>('')

function open() {
  isOpen.value = true
  query.value = ''
}
function close() {
  isOpen.value = false
}
function toggle() {
  if (isOpen.value) close()
  else open()
}

// Global Cmd/Ctrl+K shortcut, attached once at module scope — the same
// singleton pattern as useTheme.ts/useNotificationsPreference.ts (Phase
// 12), so every mount site (Sidebar's trigger button, BottomNav's,
// CommandPalette.vue itself) shares this one listener instead of each
// wiring its own. Ctrl+K (Windows/Linux) / Cmd+K (Mac, via metaKey) is
// the near-universal command-palette shortcut (VS Code, Linear, Notion,
// GitHub, Superhuman...) — nothing already in this codebase had
// established a different convention to follow instead. Fires
// regardless of what currently has focus (including while typing in the
// task drawer) since Ctrl/Cmd+K isn't a text-editing shortcut anything
// else in this app uses; pressing it again while already open closes it
// (toggle, not just open).
window.addEventListener('keydown', (event) => {
  const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
  if (!isShortcut) return
  event.preventDefault()
  toggle()
})

export function useCommandPalette() {
  return { isOpen, query, open, close, toggle }
}
