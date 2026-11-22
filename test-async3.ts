import { test, expect } from '@playwright/test'

test('first', async () => {
  await expect(true).toBeTruthy()
})

test('second', async () => {
  await expect(false).toBeFalsy()
})

test('third', async () => {
  await expect(true).toBeTruthy()
})

test('fourth', async () => {
  await expect(false).toBeFalsy()
})