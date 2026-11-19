/**
 * Sidebar Visibility Unit Tests
 * Tests sidebar visibility configuration and protected items
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useSidebarVisibility, useCurrentMode, useProtectedSidebarItems } from '@/lib/sidebarVisibility'

describe('Sidebar Visibility Unit Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  it('useSidebarVisibility returns boolean based on simpleMode', () => {
    const visible = useSidebarVisibility()
    expect(typeof visible).toBe('boolean')
  })

  it('useCurrentMode returns default full mode', () => {
    const [mode] = useCurrentMode()
    expect(mode).toBe('full')
  })

  it('useProtectedSidebarItems returns protected item IDs', () => {
    const protectedItems = useProtectedSidebarItems()
    expect(protectedItems).toContain('proxy')
    expect(protectedItems).toContain('settings-sidebar')
  })

  it('protected items array has correct length', () => {
    const protectedItems = useProtectedSidebarItems()
    expect(protectedItems).toHaveLength(2)
  })
})