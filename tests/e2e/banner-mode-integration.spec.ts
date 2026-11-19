/**
 * Banner Mode Integration E2E Tests
 * Tests banner integration with dashboard UI mode
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('banner integrates with simple mode toggle', async ({ page }) => {
  // Ensure banner is initially visible in full mode
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'full')
    localStorage.setItem('dashboardUiMode', 'original')
  })
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  
  // Toggle to simple mode
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'simple')
    localStorage.setItem('dashboardUiMode', 'simple')
  })
  
  // Banner should be hidden
  await page.waitForSelector('text=This is an advanced screen', { state: 'hidden', timeout: 2000 })
})

test('banner integrates with full mode', async ({ page }) => {
  // Ensure banner is visible in full mode
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'full')
    localStorage.setItem('dashboardUiMode', 'original')
  })
  
  // Banner should be visible
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  const banner = page.locator('text=This is an advanced screen')
  await expect(banner).toBeVisible()
  
  // Toggle to original mode should maintain visibility
  await page.evaluate(() => {
    localStorage.setItem('dashboardUiMode', 'original')
  })
  
  // Banner should still be visible
  await expect(banner).toBeVisible()
})