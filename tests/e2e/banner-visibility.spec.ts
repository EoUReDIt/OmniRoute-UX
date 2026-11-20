/**
 * Banner Visibility E2E Tests
 * Tests banner visibility by mode
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('banner visible in full mode', async ({ page }) => {
  // Ensure full mode
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'full')
    localStorage.setItem('dashboardUiMode', 'original')
  })
  
  // Banner should be visible
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  const banner = page.locator('text=This is an advanced screen')
  await expect(banner).toBeVisible()
})

test('banner hidden in simple mode', async ({ page }) => {
  // Set mode to simple
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'simple')
    localStorage.setItem('dashboardUiMode', 'simple')
  })
  await page.reload()
  
  // Banner should be hidden in simple mode
  await page.waitForSelector('text=This is an advanced screen', { state: 'hidden', timeout: 2000 })
  const banner = page.locator('text=This is an advanced screen')
  await expect(banner).not.toBeVisible()
})
