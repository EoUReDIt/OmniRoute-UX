/**
 * E2E Mode Toggle Flow Tests
 * Tests the Simple/Full mode toggle end-to-end flow
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect, beforeEach } from '@playwright/test'

beforeEach(async ({ page }) => {
  // Clear localStorage before each test
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.goto('/')
})

test('toggles simple mode via header checkbox', async ({ page }) => {
  // Wait for page load
  await page.waitForSelector('text=Simple mode', { state: 'visible' })
  
  // Click the toggle
  await page.click('text=Simple mode')
  
  // Verify mode changed
  const modeDisplay = page.locator('[data-testid=mode-display]')
  await expect(modeDisplay).toBeVisible()
  const modeText = await modeDisplay.textContent()
  expect(modeText).toContain('simple')
})

test('persists mode in localStorage after toggle', async ({ page }) => {
  // Toggle to simple mode
  await page.click('text=Simple mode')
  
  // Check localStorage
  const storedMode = await page.evaluate(() => localStorage.getItem('simpleMode'))
  expect(storedMode).toBe('simple')
})

test(' toggles back to full mode', async ({ page }) => {
  // First toggle to simple
  await page.click('text=Simple mode')
  
  // Toggle back to full
  await page.click('text=Full mode') // assuming there's a full mode option
  
  // Verify mode is full
  const modeDisplay = page.locator('[data-testid=mode-display]')
  await expect(modeDisplay).toBeVisible()
  const modeText = await modeDisplay.textContent()
  expect(modeText).toContain('full')
})