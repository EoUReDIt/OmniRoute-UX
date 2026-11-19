/**
 * Banner localStorage E2E Tests
 * Tests banner localStorage integration
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('open in full view stores original in localStorage', async ({ page }) => {
  // Ensure banner is visible
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  
  // Click "Open in Full View"
  await page.click('text=Open in Full View')
  
  // Verify "original" stored in localStorage
  const storedMode = await page.evaluate(() => localStorage.getItem('mode'))
  expect(storedMode).toBe('original')
  
  // Verify dashboardUiMode is original
  const dashboardMode = await page.evaluate(() => localStorage.getItem('dashboardUiMode'))
  expect(dashboardMode).toBe('original')
})

test('localStorage mode persists across reloads', async ({ page }) => {
  // Set mode to original
  await page.evaluate(() => {
    localStorage.setItem('mode', 'original')
    localStorage.setItem('dashboardUiMode', 'original')
  })
  
  // Reload the page
  await page.reload()
  
  // Mode should persist
  const storedMode = await page.evaluate(() => localStorage.getItem('mode'))
  expect(storedMode).toBe('original')
  
  const dashboardMode = await page.evaluate(() => localStorage.getItem('dashboardUiMode'))
  expect(dashboardMode).toBe('original')
})