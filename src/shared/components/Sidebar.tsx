import React from 'react'
import { useSidebarSections } from '@/lib/sidebarVisibility'
import { useProtectedSidebarItems } from '@/lib/sidebarVisibility'
import { useDashboardMode } from '@/lib/sidebarVisibility'

interface SidebarProps {
  className?: string
}

export const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const { visible, hidden } = useSidebarSections()
  const protectedItems = useProtectedSidebarItems()
  const dashboardMode = useDashboardMode()

  return (
    <nav className={`sidebar ${className || ''}`} aria-label="Main navigation sidebar">
      <div className="sidebar-header">
        <span>OmniRoute</span>
      </div>

      <div className="sidebar-nav">
        {visible.map((section, index) => (
          <div
            key={index}
            className={`sidebar-section ${section}${hidden.includes(section) ? ' hidden' : ''}`}
            aria-label={section}
          >
            <span className="section-icon">{section[0]}</span>
            <span className="section-name">{section}</span>
          </div>
        ))}

        {/* Protected items - always visible */}
        {protectedItems.map((item, index) => (
          <div
            key={index}
            className="sidebar-section protected"
            aria-label={item}
          >
            <span className="section-icon">🔒</span>
            <span className="section-name">{item}</span>
          </div>
        ))}
      </div>

      <div className="mode-toggle-footer">
        Mode: {dashboardMode}
        <button
          onClick={() => {
            localStorage.setItem('simpleMode', dashboardMode === 'simple' ? 'full' : 'simple')
            window.location.reload()
          }}
        >
          Switch to {dashboardMode === 'simple' ? 'Full' : 'Simple'} Mode
        </button>
      </div>
    </nav>
  )
}

Sidebar.defaultProps = { className: '' }
export default Sidebar