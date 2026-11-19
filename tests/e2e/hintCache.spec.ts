/**
 * Routing Hint Cache E2E Tests
 * Tests hint cache via API endpoints
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

test.describe('Routing Hint Cache E2E', () => {
  test('stores hint via API', async ({ page }) => {
    const response = await page.request.post('/api/hints', {
      data: { connectionId: 'conn-e2e-1', hint: 'e2e-hint', generation: 1 }
    })
    expect(response.ok()).toBeTruthy()
  })

  test('retrieves hint via API', async ({ page }) => {
    await page.request.post('/api/hints', {
      data: { connectionId: 'conn-e2e-2', hint: 'e2e-hint-2', generation: 1 }
    })
    
    const response = await page.request.get('/api/hints/conn-e2e-2?generation=1')
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data.hint).toBe('e2e-hint-2')
  })

  test('returns 404 for non-existent connection', async ({ page }) => {
    const response = await page.request.get('/api/hints/non-existent?generation=1')
    expect(response.status()).toBe(404)
  })

  test('returns 404 when generation mismatches', async ({ page }) => {
    await page.request.post('/api/hints', {
      data: { connectionId: 'conn-e2e-3', hint: 'gen-1-hint', generation: 1 }
    })
    
    const response = await page.request.get('/api/hints/conn-e2e-3?generation=2')
    expect(response.status()).toBe(404)
  })

  test('breaker generation increment evicts all hints', async ({ page }) => {
    await page.request.post('/api/hints', {
      data: { connectionId: 'conn-e2e-4', hint: 'before-break', generation: 1 }
    })
    
    // Trigger breaker generation increment
    await page.request.post('/api/admin/breaker/increment')
    
    const response = await page.request.get('/api/hints/conn-e2e-4?generation=1')
    expect(response.status()).toBe(404)
  })
})