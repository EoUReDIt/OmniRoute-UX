/**
 * Sidebar Gating E2E Tests
 * Tests sidebar sections shown/hidden by mode
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

test('sidebar shows essentials in simple mode', async ({ page }) => {
  await page.goto('/')
  
  // In simple mode, only essential sections should be visible
  const essentialSelectors = [
    'text=Home',
    'text=Endpoints', 
    'text=Providers',
    'text=Models'
  ]
  
  for (const selector of essentialSelectors) {
    await expect(page.locator(selector)).toBeVisible()
  }
})

test('sidebar hides advanced sections in simple mode', async ({ page }) => {
  await page.goto('/')
  
  // In simple mode, advanced sections should be hidden
  const advancedSelectors = [
    'text=Dev Tools',
    'text=Agentic Features',
    'text=Other Features',
    'text=Configuration',
    'text=Help'
  ]
  
  for (const selector of advancedSelectors) {
    await expect(page.locator(selector)).not.toBeVisible({ timeout: 2000 })
  }
})

test('sidebar shows all sections in full mode', async ({ page }) => {
  await page.goto('/')
  
  // In full mode, all 10 sections should be visible
  const allSelectors = [
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
  
  for (const selector of allSelectors) {
    await expect(page.locator(selector)).toBeVisible()
  }
})

test('protected items always visible', async ({ page }) => {
  await page.goto('/')
  
  // proxy and settings-sidebar should always be visible regardless of mode
  const protectedSelectors = [
    'text=proxy',
    'text=settings-sidebar'
  ]
  
  for (const selector of protectedSelectors) {
    await expect(page.locator(selector)).toBeVisible()
  }
})