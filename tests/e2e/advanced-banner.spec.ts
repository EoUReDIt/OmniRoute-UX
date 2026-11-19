/**
 * Advanced Banner E2E Flow Tests
 * Tests the advanced banner end-to-end flow
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

beforeEach(async ({ page }) => {
  // Clear localStorage before each test
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.goto('/')
})

test('displays advanced banner on advanced screen', async ({ page }) => {
  // Wait for banner to be visible
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  
  // Verify banner text
  const banner = page.locator('text=This is an advanced screen')
  await expect(banner).toBeVisible()
})

test('clicks "Back to Home" button', async ({ page }) => {
  // First, ensure banner is visible
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  
  // Click "Back to Home"
  await page.click('text=Back to Home')
  
  // Should navigate away from advanced screen
  const banner = page.locator('text=This is an advanced screen')
  await expect(banner).not.toBeVisible({ timeout: 2000 })
})

test('clicks "Open in Full View" button', async ({ page }) => {
  // Wait for banner
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  
  // Click "Open in Full View"
  await page.click('text=Open in Full View')
  
  // Should store "original" in localStorage
  const storedValue = await page.evaluate(() => localStorage.getItem('mode'))
  expect(storedValue).toBe('original')
  
  // Should navigate to home/full view
  await page.waitForLoadState('networkidle')
})

test('banner hides when simple mode is active', async ({ page }) => {
  // Set mode to simple
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'simple')
  })
  await page.reload()
  
  // Banner should not be visible in simple mode
  await page.waitForSelector('text=This is an advanced screen', { state: 'hidden', timeout: 2000 })
})