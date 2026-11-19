/**
 * HINT API Route
 * POST /api/hint - Store/retrieve hint values
 *
 * Integrates with hintCache.ts for localStorage persistence
 *
 * Security:
 * - No secrets in hint values
 * - Rate limiting applied
 * - Requires management auth
 */

import { requireManagementAuth } from '@/lib/api/requireManagementAuth'
import { RateLimiter } from '@/lib/rate-limit/rateLimiter'
import { storeHint, getHint, incrementBreakerGeneration, getBreakerGeneration } from '@/lib/cache/hintCache'

interface HintBody {
  connectionId: string
  hint: string
  generation?: number
}

export async function POST(request: Request): Promise<Response> {
  // 1. Auth gate
  const authError = await requireManagementAuth(request)
  if (authError) return authError

  // 2. Rate limiting
  const ipRateLimiter = new RateLimiter({ windowMs: 60_000, max: 10, keyPrefix: 'hint-ip' })
  const rateLimitCheck = await ipRateLimiter.check(request)
  if (rateLimitCheck.exceeded) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfter: rateLimitCheck.retryAfter }),
      { status: 429, headers: { 'Retry-After': String(rateLimitCheck.retryAfter) } }
    )
  }

  // 3. Parse body
  let body: HintBody
  try {
    body = (await request.json()) as HintBody
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!body.connectionId || !body.hint) {
    return new Response(
      JSON.stringify({ error: 'connectionId and hint are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 3. Handle based on operation type
  const operation = body.hint.substring(0, 10) // Simple heuristic

  if (body.hint.startsWith('STORE:')) {
    // Store hint value
    const actualValue = body.hint.substring(6)
    const success = await storeHint(body.connectionId, actualValue, body.generation ?? getBreakerGeneration())
    return new Response(
      JSON.stringify({ success, value: actualValue }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } else if (body.hint.startsWith('GET:')) {
    // Get hint value
    const testId = body.hint.substring(4)
    const value = getHint(testId, body.generation ?? getBreakerGeneration())
    return new Response(
      JSON.stringify({ success: value !== null, value }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } else if (body.hint.startsWith('INCREMENT')) {
    // Increment breaker generation
    const newGen = incrementBreakerGeneration()
    return new Response(
      JSON.stringify({ success: true, newGeneration: newGen }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } else {
    // Default: store the hint
    const success = await storeHint(body.connectionId, body.hint, body.generation ?? getBreakerGeneration())
    return new Response(
      JSON.stringify({ success, value: body.hint }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export { storeHint, getHint, incrementBreakerGeneration, getBreakerGeneration }