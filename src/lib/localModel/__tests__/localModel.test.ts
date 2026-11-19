/**
 * Local Model Unit Tests
 * Qwen3-0.6B local model for setup assistance
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadLocalModel, generateHint, isModelLoaded, unloadLocalModel } from '@/lib/localModel/localModel'

describe('Local Model Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads local model without errors', async () => {
    const result = await loadLocalModel()
    expect(result.success).toBe(true)
  })

  it('generates hint for setup question', async () => {
    await loadLocalModel()
    const hint = await generateHint('How do I add a provider?')
    expect(typeof hint).toBe('string')
    expect(hint.length).toBeGreaterThan(0)
  })

  it('defaults to OFF when model not available', async () => {
    const loaded = isModelLoaded()
    expect(loaded).toBe(false)
  })

  it('generates hint for MCP setup question', async () => {
    await loadLocalModel()
    const hint = await generateHint('How do I enable MCP?')
    expect(hint).toContain('MCP')
  })

  it('generates hint for client key question', async () => {
    await loadLocalModel()
    const hint = await generateHint('How do I create a client API key?')
    expect(hint).toContain('key')
  })

  it('unloads model correctly', async () => {
    await loadLocalModel()
    expect(isModelLoaded()).toBe(true)
    
    unloadLocalModel()
    expect(isModelLoaded()).toBe(false)
  })

  it('handles missing model gracefully', async () => {
    vi.doMock('@/lib/localModel/weights', () => {
      throw new Error('Model weights not found')
    })
    
    const result = await loadLocalModel()
    expect(result.success).toBe(false)
  })
})