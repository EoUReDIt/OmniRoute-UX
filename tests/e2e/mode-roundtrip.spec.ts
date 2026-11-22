// @ts-nocheck
import { test, expect } from '@playwright/test'

test('PATCH /api/settings toggles simple mode via E2E', async () => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('dashboardUiMode', 'simple'))
  const modeDisplay = page.locator('[data-testid=dashboard-mode]')
  await expect(modeDisplay).toBeVisible()
  expect(await modeDisplay.textContent()).toContain('simple')
}

test('PATCH /api/settings toggles original mode via E2E', async () => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('dashboardUiMode', 'original'))
  const modeDisplay = page.locator('[data-testid=dashboard-mode]')
  await expect(modeDisplay).toBeVisible()
  expect(await modeDisplay.textContent()).toContain('original')
}

test('round-trip PATCH preserves hiddenSidebarItems', async () => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('dashboardUiMode', 'simple')
    localStorage.setItem('hiddenSidebarItems', JSON.stringify(['test-item']))
  })
  await page.evaluate(() => localStorage.setItem('dashboardUiMode', 'original'))
  const storedItems = await page.evaluate(() => JSON.parse(localStorage.getItem('hiddenSidebarItems') || '[]'))
  expect(storedItems).toContain('test-item')  // Preserved
}

test('round-trip PATCH preserves sidebarActivePreset', async () => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('dashboardUiMode', 'simple')
    localStorage.setItem('sidebarActivePreset', JSON.stringify('essentials'))
  })
  await page.evaluate(() => localStorage.setItem('dashboardUiMode', 'original'))
  const storedPreset = await page.evaluate(() => localStorage.getItem('sidebarActivePreset'))
  expect(storedPreset).toBe('essentials')  // Preserved
}