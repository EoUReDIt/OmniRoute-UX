/**
 * Banner Actions
 * Handles banner action button interactions
 * 
 * GREEN phase — implements action handlers for banner
 */

import React from 'react'

/**
 * Action to navigate back to home
 * Clears any banner-related state and navigates to root
 */
export const useBackToHomeAction = (): () => void => {
  const [_simpleMode, setSimpleMode] = React.useState<'simple' | 'full'>('full')

  return () => {
    // Reset mode to full on back navigation
    setSimpleMode('full')
    // Navigate to home
    window.location.href = '/'
  }
}

/**
 * Action to open banner in full view
 * Stores "original" in localStorage and navigates to home
 */
export const useOpenInFullViewAction = (): () => void => {
  const [_simpleMode, setSimpleMode] = React.useState<'simple' | 'full'>('full')

  return () => {
    // Store "original" in localStorage
    localStorage.setItem('mode', 'original')
    // Reset mode to full
    setSimpleMode('full')
    // Navigate to home
    window.location.href = '/'
  }
}

/**
 * Toggle banner visibility mode
 * Switches between simple and full mode
 */
export const useToggleModeAction = (): () => void => {
  const [_simpleMode, setSimpleMode] = React.useState<'simple' | 'full'>('full')

  return () => {
    setSimpleMode(_simpleMode === 'simple' ? 'full' : 'simple')
  }
}

const bannerActions = { useBackToHomeAction, useOpenInFullViewAction, useToggleModeAction }
export default bannerActions
