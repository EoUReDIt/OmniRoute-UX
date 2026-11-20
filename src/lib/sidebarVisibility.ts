/**
 * Enhanced Sidebar Visibility Hooks
 * Handles sidebar sections visibility by mode and protected items
 * 
 * GREEN phase — implements hooks for sidebar visibility gating
 */

type SidebarSection = 'home' | 'endpoints' | 'providers' | 'models' |
  'omniproxy' | 'analytics' | 'costs' | 'monitoring' |
  'dev-tools' | 'agentic-features' | 'other-features' | 'configuration' | 'help'

type ProtectedSidebarItem = 'proxy' | 'settings-sidebar'

/**
 * Checks if advanced sidebar sections should be visible
 * Returns false in Simple mode (only essentials), true in Full mode
 */
export const useSidebarVisibility = (): boolean => {
  const [mode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  return mode === 'full'
}

/**
 * Gets the current mode
 */
export const useCurrentMode = (): 'simple' | 'full' => {
  const [mode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  return mode
}

/**
 * Gets sidebar sections visible based on mode
 * Simple mode: only essentials (home, endpoints, providers, models)
 * Full mode: all 10 sections
 */
export const useSidebarSections = (): {
  visible: SidebarSection[]
  hidden: SidebarSection[]
} => {
  const [mode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')

  const essentialSections: SidebarSection[] = [
    'home',
    'endpoints',
    'providers',
    'models',
  ]

  const allSections: SidebarSection[] = [
    'home',
    'endpoints',
    'providers',
    'models',
    'omniproxy',
    'analytics',
    'costs',
    'monitoring',
    'dev-tools',
    'agentic-features',
    'other-features',
    'configuration',
    'help',
  ]

  let visible: SidebarSection[]
  let hidden: SidebarSection[]

  if (mode === 'simple') {
    visible = essentialSections
    hidden = allSections.filter(s => !essentialSections.includes(s))
  } else {
    visible = allSections
    hidden = []
  }

  return { visible, hidden }
}

/**
 * Checks if a protected sidebar item should always be visible
 * proxy and settings-sidebar are always visible regardless of mode
 */
export const useProtectedSidebarItems = (): ProtectedSidebarItem[] => {
  // Protected items are always visible - no localStorage dependency
  return ['proxy', 'settings-sidebar']
}

/**
 * Gets the current dashboard mode
 */
export const useDashboardMode = (): 'simple' | 'full' => {
  const [mode] = useLocalStorage<'simple' | 'full'>('dashboardUiMode', 'full')
  return mode
}

export default useSidebarVisibility