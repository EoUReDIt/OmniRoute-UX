import { useEffect, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'

interface BannerVisibilityState {
  isVisible: boolean
  mode: 'simple' | 'full'
  canToggle: boolean
}

export function useBannerVisibility = (): BannerVisibilityState => {
  const [simpleMode, setSimpleMode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')
  const [dashboardUiMode, setDashboardUiMode] = useLocalStorage<'simple' | 'original'>('dashboardUiMode', 'original')
  const [isVisible, setIsVisible] = useState(true)
  const [mode, setMode] = useState<'simple' | 'full'>('full')
  const [canToggle, setCanToggle] = useState(false)

  useEffect(() => {
    let visible = true
    let canToggleFlag = false

    if (simpleMode === 'simple' && dashboardUiMode === 'simple') {
      visible = false
    } else if (simpleMode === 'full') {
      visible = true
    } else if (dashboardUiMode === 'original') {
      visible = true
    }

    // Can toggle if in simple mode (to go full) or full mode (to go simple)
    canToggleFlag = simpleMode === 'simple' || simpleMode === 'full'

    setIsVisible(visible)
    setMode(simpleMode)
    setCanToggle(canToggleFlag)
  }, [simpleMode, dashboardUiMode])

  return { isVisible, mode, canToggle }
}

export default useBannerVisibility