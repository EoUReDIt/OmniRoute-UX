import { describe, it, expect, beforeEach } from 'vitest'
import { useSidebarVisibility, useCurrentMode } from '@/lib/sidebarVisibility'

describe('Sidebar Visibility Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('useSidebarVisibility returns false in simple mode') {
    const [visible] = useSidebarVisibility()
    expect(visible).toBe(false)
  }

  it('useSidebarVisibility returns true in full mode') {
    const [visible] = useSidebarVisibility()
    expect(visible).toBe(true)
  }

  it('useCurrentMode defaults to full') {
    const [mode] = useCurrentMode()
    expect(mode).toBe('full')
  }

  it('sidebar protected items always visible') {
    const protectedIds = ['proxy', 'settings-sidebar']
    protectedIds.forEach(id => {
      const [visible] = useSidebarVisibility()
      expect(visible).toBe(true)  // Protected items always visible
    })
  }
})