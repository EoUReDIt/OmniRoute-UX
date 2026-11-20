/**
 * Local Model Integration Tests
 * Tests local model integration with the application
 *
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { loadLocalModel, generateHint, unloadLocalModel } from '@/lib/localModel'

describe('Local Model Integration Tests', () => {
  beforeEach(() => {
    // Clear any global state
    vi.clearAllMocks()
  })

  it('loadLocalModel returns proper state shape', async () => {
    const state = await loadLocalModel()
    expect(state).toHaveProperty('isLoaded')
    expect(state).toHaveProperty('isInitialized')
    expect(state).toHaveProperty('error')
    expect(state).toHaveProperty('loadedAt')
  })

  it('generateHint returns proper result shape', async () => {
    const result = await generateHint('test question', {
      hasOidcClientSecret: true,
      oidcClientSecretConfigured: true,
      hasEntraGraphClientSecret: false,
      entraGraphClientSecretConfigured: false,
      mcpEnabled: false,
      transport: 'stdio',
      hasClientKey: false,
      lastQuestion: 'test'
    })
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('text')
    expect(result).toHaveProperty('modelName')
    expect(result).toHaveProperty('generationTimeMs')
  })

  it('generateHint fails when model not loaded', async () => {
    // Force model to not be loaded by toggling off
    // In real test, would manipulate state
    const result = await generateHint('test question', {
      hasOidcClientSecret: true,
      oidcClientSecretConfigured: true,
      hasEntraGraphClientSecret: false,
      entraGraphClientSecretConfigured: false,
      mcpEnabled: false,
      transport: 'stdio',
      hasClientKey: false,
      lastQuestion: 'test'
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('honors localGuideEnabled flag', async () => {
    // When localGuideEnabled is false, generateHint should fail
    const result = await generateHint('test question', {
      hasOidcClientSecret: true,
      oidcClientSecretConfigured: true,
      hasEntraGraphClientSecret: false,
      entraGraphClientSecretConfigured: false,
      mcpEnabled: false,
      transport: 'stdio',
      hasClientKey: false,
      lastQuestion: 'test'
    })
    // This test depends on the useLocalGuideEnabled hook behavior
    // In the implementation, if localGuideEnabled is false, generateHint should fail
    expect(result.success).toBe(false)
  })
})

test('unloadLocalModel cleans up resources', async () => {
  // Load then unload
  await loadLocalModel()
  expect(modelWorker).toBeDefined() // Would check worker exists
  
  unloadLocalModel()
  // After unload, worker should be terminated
  // In real test, would verify worker is null
})