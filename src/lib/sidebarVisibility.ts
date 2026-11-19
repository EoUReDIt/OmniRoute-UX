import { useLocalStorage } from '@/hooks/useLocalStorage'

/**
 * Check if advanced sidebar sections should be visible
 * Returns false in Simple mode, true in Full mode
 */
export function useSidebarVisibility = (): boolean => {
  const [mode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  return mode === 'full'
}

/**
 * Get the current mode
 */
export function useCurrentMode = (): 'simple' | 'full' => {
  const [mode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  return mode
}

export default useSidebarVisibility