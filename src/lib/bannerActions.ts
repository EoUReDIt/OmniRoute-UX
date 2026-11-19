import { useLocalStorage } from '@/hooks/useLocalStorage'

export function useBackToHomeAction = (): () => void => {
  const [, setMode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  return () => {
    setMode('full')
    window.location.href = '/'
  }
}

export function useOpenInFullViewAction = (): () => void => {
  const [, setMode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  return () => {
    localStorage.setItem('mode', 'original')
    setMode('full')
    window.location.href = '/'
  }
}

export function useToggleModeAction = (): () => void => {
  const [simpleMode, setSimpleMode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  return () => {
    setSimpleMode(simpleMode === 'simple' ? 'full' : 'simple')
  }
}

export default { useBackToHomeAction, useOpenInFullViewAction, useToggleModeAction }