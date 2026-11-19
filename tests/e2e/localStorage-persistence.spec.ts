/**
 * E2E localStorage Persistence Tests
 * Tests mode persistence across page loads and sessions
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

test('persists mode choice across page loads', async ({ page }) => {
  // Set mode to simple
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'simple')
  })
  
  // Reload the page
  await page.reload()
  
  // Check that mode persisted
  const storedMode = await page.evaluate(() => localStorage.getItem('simpleMode'))
  expect(storedMode).toBe('simple')
})

test('persists full mode across page loads', async ({ page }) => {
  // Set mode to full
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'full')
  })
  
  // Reload the page
  await page.reload()
  
  // Check that mode persisted
  const storedMode = await page.evaluate(() => localStorage.getItem('simpleMode'))
  expect(storedMode).toBe('full')
})

test('mode toggle updates localStorage', async ({ page }) => {
  // Start with full mode
  await page.evaluate(() => {
    localStorage.setItem('simpleMode', 'full')
  })
  
  // Click toggle to switch to simple
  await page.click('text=Simple mode')
  
  // Verify localStorage updated
  const storedMode = await page.evaluate(() => localStorage.getItem('simpleMode'))
  expect(storedMode).toBe('simple')
  
  // Toggle back to full
  await page.click('text=Full mode')
  
  // Verify localStorage updated back to full
  const storedMode2 = await page.evaluate(() => localStorage.getItem('simpleMode'))
  expect(storedMode2).toBe('full')
})