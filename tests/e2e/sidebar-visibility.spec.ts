import { test, expect } from '@playwright/test'

test('sidebar shows essentials sections in simple mode', async () => {
  await page.goto('/')
  
  const essentialSections = [
    'text=Home',
    'text=Endpoints',
    'text=Providers',
    'text=Models'
  ]
  
  for (const selector of essentialSections) {
        await expect(page.locator(selector)).toBeVisible()
      }
    })

  test('sidebar hides advanced sections in simple mode', async () => {
  await page.goto('/')
  
  const advancedSections = [
    'text=OmniProxy',
    'text=Analytics',
    'text=Costs',
    'text=Monitoring'
  ]
  
  for (const selector of advancedSections) {
    await expect(page.locator(selector)).not.toBeVisible({ timeout: 2000 })
  }
})

test('sidebar shows all sections in full mode', async () => {
  await page.goto('/')
  
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