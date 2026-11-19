/**
 * Protected Sidebar Items E2E Tests
 * Tests that proxy and settings-sidebar are always visible
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

test('proxy sidebar item always visible', async ({ page }) => {
  await page.goto('/')
  
  // proxy should always be visible regardless of simple/full mode
  await expect(page.locator('text=proxy')).toBeVisible()
})

test('settings-sidebar always visible', async ({ page }) => {
  await page.goto('/')
  
  // settings-sidebar should always be visible regardless of simple/full mode
  await expect(page.locator('text=settings-sidebar')).toBeVisible()
})

test('protected items visible after mode toggle', async ({ page }) => {
  await page.goto('/')
  
  // Toggle to simple mode
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'simple')
    localStorage.setItem('dashboardUiMode', 'simple')
  })
  
  // proxy and settings-sidebar should still be visible
  await expect(page.locator('text=proxy')).toBeVisible()
  await expect(page.locator('text=settings-sidebar')).toBeVisible()
  
  // Toggle to full mode
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'full')
    localStorage.setItem('dashboardUiMode', 'full')
  })
  
  // proxy and settings-sidebar should still be visible
  await expect(page.locator('text=proxy')).toBeVisible()
  await expect(page.locator('text=settings-sidebar')).toBeVisible()
})