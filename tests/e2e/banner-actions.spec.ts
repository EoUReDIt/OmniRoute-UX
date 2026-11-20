/**
 * Banner Actions E2E Tests
 * Tests banner action button interactions
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('click "Back to Home" navigates away', async ({ page }) => {
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  
  // Click "Back to Home"
  await page.click('text=Back to Home')
  
  // Should navigate away from advanced screen
  const banner = page.locator('text=This is an advanced screen')
  await expect(banner).not.toBeVisible({ timeout: 2000 })
})

test('click "Open in Full View" stores original and navigates', async ({ page }) => {
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  
  // Click "Open in Full View"
  await page.click('text=Open in Full View')
  
  // Should store "original" in localStorage
  const storedMode = await page.evaluate(() => localStorage.getItem('mode'))
  expect(storedMode).toBe('original')
  
  // Should navigate to home/full view
  await page.waitForLoadState('networkidle')
  
  // Dashboard mode should be original
  const dashboardMode = await page.evaluate(() => localStorage.getItem('dashboardUiMode'))
  expect(dashboardMode).toBe('original')
})
