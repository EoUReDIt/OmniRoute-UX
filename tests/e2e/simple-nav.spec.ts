/**
 * Simple Navigation E2E Tests
 * Tests simplified navigation in Simple Mode
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

test('simple nav shows essential links only', async ({ page }) => {
  await page.goto('/')
  
  // In simple mode, only essential navigation links should be visible
  const essentialLinks = [
    'text=Home',
    'text=Endpoints',
    'text=Providers', 
    'text=Models'
  ]
  
  for (const link of essentialLinks) {
    await expect(page.locator(link)).toBeVisible()
  }
})

test('simple nav hides advanced links', async ({ page }) => {
  await page.goto('/')
  
  // In simple mode, advanced navigation links should be hidden
  const advancedLinks = [
    'text=Dev Tools',
    'text=Agentic Features',
    'text=Other Features',
    'text=Configuration'
  ]
  
  for (const link of advancedLinks) {
    await expect(page.locator(link)).not.toBeVisible({ timeout: 2000 })
  }
})

test('dashboard mode displayed correctly in simple', async ({ page }) => {
  await page.goto('/')
  
  // Verify simple mode is displayed
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'simple')
  })
  
  const modeDisplay = page.locator('[data-testid=dashboard-mode]')
  await expect(modeDisplay).toBeVisible()
  const modeText = await modeDisplay.textContent()
  expect(modeText).toContain('simple')
})