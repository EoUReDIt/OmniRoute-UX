/**
 * useBannerVisibility Hook
 * Controls banner visibility based on mode and integration settings
 * 
 * GREEN phase — implements hook for banner visibility gating
 */

import React from 'react'

type BannerMode = 'simple' | 'full'

interface BannerVisibilityState {
  isVisible: boolean
  mode: BannerMode
  canToggle: boolean
}

/** 
 * Determines banner visibility based on dashboardUiMode and simpleMode
 */
export const useBannerVisibility = (): BannerVisibilityState => {
  // Use React.useState explicitly with localStorage initializer
  const [simpleMode] = React.useState<'simple' | 'full'>(() => {
    const stored = localStorage.getItem('simpleMode')
    return stored ? (stored as 'simple' | 'full') : 'full'
  })
  const [dashboardUiMode] = React.useState<'simple' | 'original'>(() => {
    const stored = localStorage.getItem('dashboardUiMode')
    return stored ? (stored as 'simple' | 'original') : 'original'
  })

  // Derive visibility during render instead of effect
  const visible = !(simpleMode === 'simple' && dashboardUiMode === 'simple')

  return { isVisible: visible, mode: simpleMode, canToggle: true }
}

export default useBannerVisibility
