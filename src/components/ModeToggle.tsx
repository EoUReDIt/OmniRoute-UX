import React, { useState, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface ModeToggleProps {
  /** Optional initial mode override */
  initialMode?: 'simple' | 'full'
}

export const ModeToggle: React.FC<ModeToggleProps> = ({ initialMode = 'full' }) => {
  const [mode, setMode] = useLocalStorage<'simple' | 'full'>(
    'simpleMode',
    initialMode
  )

  const toggleMode = () => {
    setMode(mode === 'simple' ? 'full' : 'simple')
  }

  return (
    <div className="mode-toggle">
      <input
        type="checkbox"
        role="checkbox"
        name="simple mode"
        checked={mode === 'simple'}
        onChange={toggleMode}
        aria-label={mode === 'simple' ? 'Switch to full mode' : 'Switch to simple mode'}
        data-testid="mode-toggle-checkbox"
      />
      <span className="mode-display" data-testid="mode-display">
        {mode}
      </span>
    </div>
  )
}

ModeToggle.defaultProps = {
  initialMode: 'full',
}

export default ModeToggle