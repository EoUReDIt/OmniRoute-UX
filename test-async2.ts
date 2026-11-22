import { test, expect } from '@playwright/test'

test('first', async () => {
  await expect(true).toBeTruthy()
})

test('second', async () => {
  await expect(false).toBeFalsy()
})