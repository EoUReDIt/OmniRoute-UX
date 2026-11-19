import { describe, it, expect, beforeEach } from 'vitest'
import { emitFeatureFlagChangeAudit } from '@/lib/api/featureFlagsAudit'

describe('Feature flag audit log', () => {
  beforeEach(() => {
    // Setup test audit context
    vi.clearAllMocks()
  })

  it('should write audit entry when localGuideEnabled is toggled ON', async () => {
    const result = await emitFeatureFlagChangeAudit({
      action: 'feature_flag_toggle',
      flag: 'localGuideEnabled',
      value: true,
      actor: 'test-operator',
      ip: '192.168.1.1',
      requestId: 'test-request-1'
    })
    expect(result.status).toBe('success')
  })

  it('should write audit entry when localGuideEnabled is toggled OFF', async () => {
    const result = await emitFeatureFlagChangeAudit({
      action: 'feature_flag_toggle',
      flag: 'localGuideEnabled',
      value: false,
      actor: 'test-operator',
      ip: '192.168.1.1',
      requestId: 'test-request-2'
    })
    expect(result.status).toBe('success')
  })

  it('audit entry should include flag name and new value', async () => {
    const result = await emitFeatureFlagChangeAudit({
      action: 'feature_flag_toggle',
      flag: 'localGuideEnabled',
      value: true,
      actor: 'test-operator',
      ip: '192.168.1.1',
      requestId: 'test-request-3'
    })
    const data = await result.json()
    expect(data.flag).toBe('localGuideEnabled')
    expect(data.value).toBe(true)
    expect(data.actor).toBe('test-operator')
  })
})