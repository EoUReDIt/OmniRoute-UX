import { test, expect } from '@playwright/test'

test('test with page', async () => {
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('key', 'value'))
  const locator = page.locator('text=test')
  await expect(locator).toBeVisible()
  expect(await locator.textContent()).toContain('test')
})