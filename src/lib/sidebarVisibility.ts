import { useEffect, useState } from 'react'

type SidebarSection = 'home' | 'endpoints' | 'providers' | 'models' |
  'omniproxy' | 'analytics' | 'costs' | 'monitoring' |
  'dev-tools' | 'agentic-features' | 'other-features' | 'configuration' | 'help'

type ProtectedSidebarItem = 'proxy' | 'settings-sidebar'

interface SidebarVisibilityState {
  mode: 'simple' | 'full'
  visibleSections: SidebarSection[]
  protectedItems: ProtectedSidebarItem[]
  hiddenSections: SidebarSection[]
}

/**
 * Checks if advanced sidebar sections should be visible
 * Returns false in Simple mode (only essentials), true in Full mode
 */
export function useSidebarVisibility = (): boolean => {
  const [mode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  return mode === 'full'
}

/**
 * Gets the current mode
 */
export function useCurrentMode = (): 'simple' | 'full' => {
  const [mode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  return mode
}

/**
 * Gets sidebar sections visible based on mode
 * Simple mode: only essentials (home, endpoints, providers, models)
 * Full mode: all 10 sections
 */
export function useSidebarSections = (): {
  visible: SidebarSection[]
  hidden: SidebarSection[]
} => {
  const [mode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')

  const essentialSections: SidebarSection[] = [
    'home', 'endpoints', 'providers', 'models',
  ]

  const allSections: SidebarSection[] = [
    'home', 'endpoints', 'providers', 'models',
    'omniproxy', 'analytics', 'costs', 'monitoring',
    'dev-tools', 'agentic-features', 'other-features', 'configuration', 'help',
  ]

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
export function useProtectedSidebarItems = (): ProtectedSidebarItem[] => {
  return ['proxy', 'settings-sidebar']
}

/**
 * Gets the current dashboard mode
 */
export function useDashboardMode = (): 'simple' | 'full' => {
  const [mode] = useLocalStorage<'simple' | 'full'>('dashboardUiMode', 'full')
  return mode
}

export default useSidebarVisibility