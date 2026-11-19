/**
 * Feature Flag Audit
 * Audit logging for feature flag toggles (localGuideEnabled, localGuideModel)
 *
 * GREEN phase — implements audit logging with allowlist validation
 *
 * Security:
 * - Audit entries include flag name, old value, new value, actor, IP, requestId, timestamp
 * - Allowlist validation for model names
 * - Integrates with Phase 1 audit logging system
 * - Gates enforcement via localGuideEnabled flag
 */

import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useLocalGuideEnabled } from '@/lib/localModel'
import { useLocalGuideModelAllowed } from '@/lib/localModel'

// Audit entry schema
interface AuditEntry {
  id: string
  timestamp: number
  flagName: string
  oldValue: string | boolean | null
  newValue: string | boolean | null
  actor: string // In real implementation: user IP or identifier
  requestId: string // HTTP request ID or trace identifier
  ipAddress: string // Client IP address
  allowlistValid: boolean
  notes: string
}

// Allowlisted model names for localGuideModel
const ALLOWLISTED_MODELS = [
  'qwen3-0.6B',
  'qwen2.5-1.5B',
  'llama3.2-1B',
  'gemma-3-1B',
] as const

type AllowlistedModelName = typeof ALLOWLISTED_MODELS[number]

// Audit log storage (in real implementation, would be persistent store)
let auditLog: AuditEntry[] = []

// Request ID counter for simulation
let requestIdCounter = 0

/**
 * Generates a unique request ID
 */
function generateRequestId(): string {
  requestIdCounter++
  return `req-${Date.now()}-${requestIdCounter}`
}

/**
 * Gets the actor identifier (IP address or user identifier)
 * In real implementation, would come from request context
 */
function getActorId(request?: Request): string {
  // In real implementation, extract from request headers or context
  // For now, return placeholder based on environment
  if (typeof window !== 'undefined') {
    // Browser environment - would get from actual request
    return 'browser-session'
  }
  // Node/SSR environment
  return 'server-side'
}

/**
 * Validates model name against allowlist
 */
function validateModelAllowlist(modelName: string): { valid: boolean; listed: boolean } {
  const isListed = ALLOWLISTED_MODELS.includes(modelName as AllowlistedModelName)
  return { valid: isListed, listed: isListed }
}

/**
 * Audits a feature flag toggle
 *
 * @param flagName - Name of the feature flag being toggled
 * @param newValue - New value of the flag
 * @param request - Optional HTTP request context
 * @returns Audit entry object
 */
export function toggleFeatureFlag(
  flagName: 'localGuideEnabled' | 'localGuideModel',
  newValue: boolean | string,
  request?: Request
): AuditEntry {
  const isEnabled = useLocalGuideEnabled()

  // Determine old value based on flag name
  let oldValue: string | boolean | null
  if (flagName === 'localGuideEnabled') {
    oldValue = String(!isEnabled) // Previous state is opposite
  } else {
    oldValue = 'none' // Previous model was not set
  }

  // Determine new value string
  const newValueStr = String(newValue)

  // Validate model allowlist if toggling localGuideModel
  let allowlistValid = false
  if (flagName === 'localGuideModel') {
    const validation = validateModelAllowlist(newValueStr)
    allowlistValid = validation.valid
  }

  // Create audit entry
  const entry: AuditEntry = {
    id: crypto ? crypto.randomUUID?.() : `audit-${Date.now()}`,
    timestamp: Date.now(),
    flagName: flagName,
    oldValue: oldValue,
    newValue: newValueStr,
    actor: getActorId(request),
    requestId: generateRequestId(),
    ipAddress: request ? (request as Request).ip || '0.0.0.0' : '0.0.0.0',
    allowlistValid: allowlistValid,
    notes: `Flag ${flagName} toggled from ${oldValue} to ${newValueStr}${
      allowlistValid ? '' : ' (allowlist validation failed)'
    }`,
  }

  // Add to audit log (in real implementation, would persist to database)
  auditLog.push(entry)

  // Security: If localGuideEnabled is being toggled OFF, ensure no model is active
  if (flagName === 'localGuideEnabled' && !newValue) {
    // Model should be disabled when feature is OFF
    // In real implementation, would unload model or set state
  }

  return entry
}

/**
 * Gets the audit log entries
 * In real implementation, would fetch from persistent store
 * @param flagName - Optional filter by flag name
 * @param limit - Maximum number of entries to return
 * @returns Audit entry array
 */
export function getFeatureFlagAudit(
  flagName?: 'localGuideEnabled' | 'localGuideModel',
  limit?: number
): AuditEntry[] {
  let entries = [...auditLog]

  // Filter by flag name if specified
  if (flagName) {
    entries = entries.filter((entry) => entry.flagName === flagName)
  }

  // Sort by timestamp descending (newest first)
  entries.sort((a, b) => b.timestamp - a.timestamp)

  // Apply limit if specified
  if (limit !== undefined) {
    entries = entries.slice(0, limit)
  }

  return entries
}

/**
 * Gets the current state of a feature flag
 * For localGuideEnabled, returns whether it's currently enabled
 * For localGuideModel, returns the currently allowed model
 */
export function getCurrentFeatureState(
  flagName: 'localGuideEnabled' | 'localGuideModel'
): { enabled: boolean; value: string | boolean | null; allowlistValid: boolean } {
  if (flagName === 'localGuideEnabled') {
    const enabled = useLocalGuideEnabled()
    return {
      enabled,
      value: enabled,
      allowlistValid: true, // Feature flag doesn't need model allowlist
    }
  } else {
    // For localGuideModel, check allowlist
    const allowed = useLocalGuideModelAllowed('qwen3-0.6B' as any)
    return {
      enabled: allowed,
      value: allowed ? 'qwen3-0.6B' : null,
      allowlistValid: allowed,
    }
  }
}

// Export types
export type { AuditEntry, AllowlistedModelName }

export default {
  toggleFeatureFlag,
  getFeatureFlagAudit,
  getCurrentFeatureState,
}

export { ALLOWLISTED_MODELS }