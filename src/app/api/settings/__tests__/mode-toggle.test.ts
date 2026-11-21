import { describe, it, expect, beforeEach } from 'vitest'

describe('Mode Toggle Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('PATCH /api/settings toggles dashboardUiMode to simple', async () => {
    const result = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardUiMode: 'simple' }),
    })
    expect(result.status).toBe(200)
    const data = await result.json()
    expect(data.dashboardUiMode).toBe('simple')
  })

  it('PATCH /api/settings toggles dashboardUiMode to original', async () => {
    const result = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardUiMode: 'original' }),
    })
    expect(result.status).toBe(200)
    const data = await result.json()
    expect(data.dashboardUiMode).toBe('original')
  })

  it('round-trip PATCH preserves hiddenSidebarItems', async () => {
    const result = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardUiMode: 'simple', hiddenSidebarItems: ['test-item'] }),
    })
    expect(result.status).toBe(200)
    const data = await result.json()
    expect(data.hiddenSidebarItems).toContain('test-item')
  })

  it('round-trip PATCH preserves sidebarActivePreset', async () => {
    const result = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboardUiMode: 'simple', sidebarActivePreset: 'essentials' }),
    })
    expect(result.status).toBe(200)
    const data = await result.json()
    expect(data.sidebarActivePreset).toBe('essentials')
  })
})