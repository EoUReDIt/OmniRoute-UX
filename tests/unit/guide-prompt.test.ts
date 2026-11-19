/**
 * Guide Prompt Unit Tests
 * Tests the guide prompt construction using boolean flags ONLY
 * CRITICAL: Must use boolean flags ONLY, NEVER raw secret values
 * 
 * RED phase — these tests are expected to FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { buildGuidePrompt } from '@/lib/guide/prompt'

describe('Guide Prompt Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds prompt with boolean flags only - oidcClientSecretConfigured', () => {
    const result = buildGuidePrompt({
      hasOidcClientSecret: true,
      oidcClientSecretConfigured: true,
    })
    
    expect(result).toContain('oidcClientSecretConfigured: true')
    expect(result).not.toContain('your-actual-secret-value')
  })

  it('builds prompt with boolean flags only - entraGraphClientSecretConfigured', () => {
    const result = buildGuidePrompt({
      hasEntraGraphClientSecret: true,
      entraGraphClientSecretConfigured: false,
    })
    
    expect(result).toContain('entraGraphClientSecretConfigured: false')
    expect(result).not.toContain('your-actual-entra-secret')
  })

  it('includes transport and mcp flags', () => {
    const result = buildGuidePrompt({
      mcpEnabled: true,
      transport: 'streamable',
      hasClientKey: true,
      lastQuestion: 'How do I add a provider?',
    })
    
    expect(result).toContain('mcpEnabled: true')
    expect(result).toContain('transport: streamable')
    expect(result).toContain('hasClientKey: true')
    expect(result).toContain('How do I add a provider?')
  })

  it('handles missing flags gracefully', () => {
    const result = buildGuidePrompt({})
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('does not include secret values in prompt output', () => {
    const result = buildGuidePrompt({
      hasOidcClientSecret: true,
      oidcClientSecret: 'sk-live-redacted-secret',
      oidcClientSecretConfigured: true,
    })
    
    expect(result).not.toContain('sk-live-redacted-secret')
    expect(result).toContain('oidcClientSecretConfigured: true')
  })

  it('validates transport enum', () => {
    const result = buildGuidePrompt({
      transport: 'stdio',
      mcpEnabled: true,
    })
    
    expect(result).toContain('transport: stdio')
  })

  it('handles all allowed transport values', () => {
    const transports = ['stdio', 'streamable', 'sse']
    
    for (const transport of transports) {
      const result = buildGuidePrompt({
        transport,
        mcpEnabled: true,
      })
      expect(result).toContain(`transport: ${transport}`)
    }
  })
})