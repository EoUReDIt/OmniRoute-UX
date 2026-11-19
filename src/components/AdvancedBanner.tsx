import React from 'react'
import { useBannerVisibility } from '@/hooks/useBannerVisibility'
import { useLocalStorage } from '@/hooks/useLocalStorage'

interface AdvancedBannerProps {
  /** Optional children or custom content */
  children?: React.ReactNode
}

export const AdvancedBanner: React.FC<AdvancedBannerProps> = ({ children }) => {
  const { isVisible, mode, canToggle } = useBannerVisibility()
  const [simpleMode, setSimpleMode] = useLocalStorage<'simple' | 'full'>('simpleMode', 'full')

  // Hide banner in simple mode
  if (simpleMode === 'simple') {
    return null
  }

  const handleBackToHome = () => {
    window.location.href = '/'
  }

  const handleOpenInFullView = () => {
    localStorage.setItem('mode', 'original')
    window.location.href = '/'
  }

  // If banner is not visible, render nothing
  if (!isVisible) {
    return null
  }

  return (
    <div
      role="alert"
      aria-label="This is an advanced screen"
      style={{
        padding: '16px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeeba',
        borderRadius: '4px',
        margin: '16px',
      }}
    >
      <p style={{ margin: '0 0 12px 0', color: '#856404' }}>
        {children || 'This is an advanced screen'}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleBackToHome}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Back to Home
        </button>
        <button
          onClick={handleOpenInFullView}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Open in Full View
        </button>
      </div>
    </div>
  )
}

export default AdvancedBanner