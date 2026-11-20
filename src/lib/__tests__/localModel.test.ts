/**
 * Local Model Unit Tests
 * Tests local LLM model loading and inference
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { loadLocalModel, generateText } from '@/lib/localModel'

describe('Local Model Unit Tests', () => {
  beforeEach(() => {
    // Clear model cache before each test
    // (mock - actual clearing happens in implementation)
  })

  it('loads local model without errors', async () => {
    const result = await loadLocalModel('qwen3-0.6b')
    expect(result).toBeDefined()
    expect(result.modelName).toBe('qwen3-0.6b')
  })

  it('generates text with local model', async () => {
    const result = await generateText('qwen3-0.6b', 'Hello, how are you?')
    expect(result).toBeDefined()
    expect(typeof result.text).toBe('string')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('defaults to OFF when model not available', async () => {
    const result = await loadLocalModel('non-existent-model')
    expect(result).toBeNull()
  })
})
