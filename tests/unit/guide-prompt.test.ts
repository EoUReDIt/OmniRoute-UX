/**
 * Guide Prompt Unit Tests
 * Tests the guide prompt construction using boolean flags ONLY
 * CRITICAL: Must use boolean flags (true/false), NEVER raw secret values
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { buildGuidePrompt } from '@/lib/guide/prompt'

describe('Guide Prompt Unit Tests', () => {
  beforeEach(() => {
    // Clear any global state
    vi.clearAllMocks()
  })

  it('builds prompt with boolean flags only - oidcClientSecretConfigured', () => {
    // Should use boolean flag, never raw secret
    const result = buildGuidePrompt({
      hasOidcClientSecret: true,
      oidcClientSecretConfigured: true,
    })
    
    // Prompt should contain boolean flag status, NOT the secret value
    expect(result).toContain('oidcClientSecretConfigured: true')
    // Should NOT contain the actual secret value
    expect(result).not.toContain('your-actual-secret-value')
  })

  it('builds prompt with boolean flags only - entraGraphClientSecretConfigured', () => {
    const result = buildGuidePrompt({
      hasEntraGraphClientSecret: true,
      entraGraphClientSecretConfigured: false,
    })
    
    // Prompt should reflect the configured flag status
    expect(result).toContain('entraGraphClientSecretConfigured: false')
    // Should NOT contain the actual secret
    expect(result).not.toContain('your-actual-entra-secret')
  })

  it('handles missing flag gracefully', () => {
    const result = buildGuidePrompt({
      // No flags set
    })
    
    // Should still generate a valid prompt structure
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('does not include secret values in prompt output', () => {
    const result = buildGuidePrompt({
      hasOidcClientSecret: true,
      oidcClientSecret: '«redacted:sk-…»',  // raw secret
      oidcClientSecretConfigured: true,
    })
    
    // The secret value should NOT appear in the prompt
    expect(result).not.toContain('«redacted:sk-…»')
    // But the configured flag SHOULD appear
    expect(result).toContain('oidcClientSecretConfigured: true')
  })
})