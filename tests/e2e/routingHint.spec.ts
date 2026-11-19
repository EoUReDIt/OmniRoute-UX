/**
 * Routing Hint E2E Tests
 * Tests routing hint display and behavior
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

test.describe('Routing Hint E2E', () => {
  test('displays routing hint on advanced page when enabled', async ({ page }) => {
    await page.goto('/advanced-page')
    
    // Enable routing hints
    await page.evaluate(() => {
      localStorage.setItem('routingHintsEnabled', 'true')
    })
    await page.reload()
    
    const hint = page.locator('[data-testid="routing-hint"]')
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('routing hint')
  })

  test('hides routing hint when disabled', async ({ page }) => {
    await page.goto('/advanced-page')
    
    // Disable routing hints
    await page.evaluate(() => {
      localStorage.setItem('routingHintsEnabled', 'false')
    })
    await page.reload()
    
    const hint = page.locator('[data-testid="routing-hint"]')
    await expect(hint).not.toBeVisible()
  })

  test('routing hint shows connection-specific advice', async ({ page }) => {
    await page.goto('/dashboard/providers/some-provider')
    
    await page.evaluate(() => {
      localStorage.setItem('routingHintsEnabled', 'true')
    })
    await page.reload()
    
    const hint = page.locator('[data-testid="routing-hint"]')
    await expect(hint).toBeVisible()
    await expect(hint).toContainText('provider')
  })

  test('routing hint does not expose secrets', async ({ page }) => {
    await page.goto('/advanced-page')
    
    await page.evaluate(() => {
      localStorage.setItem('routingHintsEnabled', 'true')
    })
    await page.reload()
    
    const hint = page.locator('[data-testid="routing-hint"]')
    await expect(hint).toBeVisible()
    
    const hintText = await hint.textContent()
    expect(hintText).not.toContain('sk-')
    expect(hintText).not.toContain('secret')
    expect(hintText).not.toContain('password')
  })

  test('routing hint respects breaker generation', async ({ page }) => {
    await page.goto('/dashboard/providers')
    
    await page.evaluate(() => {
      localStorage.setItem('routingHintsEnabled', 'true')
      localStorage.setItem('breakerGeneration', '5')
    })
    await page.reload()
    
    const hint = page.locator('[data-testid="routing-hint"]')
    await expect(hint).toBeVisible()
    
    // Increment breaker generation
    await page.evaluate(() => {
      localStorage.setItem('breakerGeneration', '6')
    })
    await page.reload()
    
    // Hint should be updated/cleared for stale generation
    await expect(hint).not.toBeVisible()
  })
})