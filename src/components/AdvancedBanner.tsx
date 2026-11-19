import React from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface AdvancedBannerProps {
  /** Optional children or content */
  children?: React.ReactNode
}

export const AdvancedBanner: React.FC<AdvancedBannerProps> = ({ children }) => {
  const [mode, setMode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')

  const handleBackToHome = () => {
    window.location.href = '/'
  }

  const handleOpenInFullView = () => {
    localStorage.setItem('mode', 'original')
    window.location.href = '/'
  }

  // Hide banner in simple mode
  if (mode === 'simple') {
    return null
  }

  return (
    <div className="advanced-banner" role="alert" aria-label="This is an advanced screen">
      <p>{children || 'This is an advanced screen'}</p>
      <div className="banner-actions">
        <button onClick={handleBackToHome} className="btn-back-to-home" data-testid="back-to-home-btn">
          Back to Home
        </button>
        <button onClick={handleOpenInFullView} className="btn-open-full-view" data-testid="open-full-view-btn">
          Open in Full View
        </button>
      </div>
    </div>
  )
}

export default AdvancedBanner