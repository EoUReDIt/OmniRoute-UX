/**
 * Simple Mode Toggle Integration E2E Tests
 * Tests the complete Simple Mode toggle flow end-to-end
 *
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('full simple mode toggle flow', async ({ page }) => {
  // Verify page loads
  await page.waitForSelector('text=Simple mode', { state: 'visible' })
  
  // Initial state should be full mode
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'full')
  })
  
  // Verify full mode sidebar
  await expect(page.locator('text=OmniProxy')).toBeVisible()
  await expect(page.locator('text=Analytics')).toBeVisible()
  
  // Toggle to simple mode
  await page.click('text=Simple mode')
  
  // Verify simple mode - only essentials visible
  await expect(page.locator('text=Home')).toBeVisible()
  await expect(page.locator('text=OmniProxy')).not.toBeVisible({ timeout: 2000 })
  await expect(page.locator('text=Analytics')).not.toBeVisible({ timeout: 2000 })
  
  // Toggle back to full mode
  await page.click('text=Simple mode')
  
  // Verify full mode restored
  await expect(page.locator('text=OmniProxy')).toBeVisible()
  await expect(page.locator('text=Analytics')).toBeVisible()
})

test('dashboardUiMode integration with simple mode', async ({ page }) => {
  // Set full mode
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'full')
    localStorage.setItem('dashboardUiMode', 'original')
  })
  await page.waitForSelector('text=This is an advanced screen', { state: 'visible' })
  
  // Toggle to simple mode
  await page.click('text=Simple mode')
  
  // Banner should hide in simple mode
  await page.waitForSelector('text=This is an advanced screen', { state: 'hidden', timeout: 2000 })
  
  // dashboardUiMode should be simple
  await page.evaluate(() => {
    localStorage.setItem('dashboardUiMode', 'simple')
  })
})