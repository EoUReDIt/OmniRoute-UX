/**
 * Full View E2E Tests
 * Tests that all sections are visible in Full Mode
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

test('full view shows all 10 sections', async ({ page }) => {
  await page.goto('/')
  
  // In full mode, all 10 sidebar sections should be visible
  const allSections = [
    'text=Home',
    'text=OmniProxy',
    'text=Analytics',
    'text=Costs',
    'text=Monitoring',
    'text=Dev Tools',
    'text=Agentic Features',
    'text=Other Features',
    'text=Configuration',
    'text=Help'
  ]
  
  for (const selector of allSections) {
    await expect(page.locator(selector)).toBeVisible()
  }
})

test('full view presets work as before', async ({ page }) => {
  await page.goto('/')
  
  // In full mode, presets should work as before
  await page.evaluate(() => {
    localStorage.setItem('dashboardUiMode', 'original')
  })
  
  // All sections should still be visible
  await expect(page.locator('text=OmniProxy')).toBeVisible()
  await expect(page.locator('text=Analytics')).toBeVisible()
  await expect(page.locator('text=Costs')).toBeVisible()
})

test('full view protected items always present', async ({ page }) => {
  await page.goto('/')
  
  // proxy and settings-sidebar should always be in full view
  await expect(page.locator('text=proxy')).toBeVisible()
  await expect(page.locator('text=settings-sidebar')).toBeVisible()
})