/**
 * Decide whether a hintless 429 should skip the executor's same-key sleep.
 *
 * The 2s intra-URL retry (BaseExecutor.RETRY_CONFIG) was written to retry the
 * same URL before falling through to another base URL of that node. Account
 * rotation happens only after the executor returns. When another connection
 * for this provider is active, not cooling down, not in a terminal status, and
 * not model-locked, waiting on the throttled key delays that rotation.
 *
 * Returns false when the answer is uncertain (one connection, a pinned allowlist
 * with no sibling, a locked sibling). The same-key retry then runs as before.
 */
import { getProviderConnectionsCount, getRawProviderConnections } from "@/lib/db/providers";
import { isAccountUnavailable, isModelLocked } from "./accountFallback.ts";

const TERMINAL_TEST_STATUS = new Set(["banned", "expired", "credits_exhausted"]);

export async function hasHealthyAlternateConnection(input: {
  provider: string;
  connectionId: string;
  model?: string | null;
  allowedConnectionIds?: string[] | null;
}): Promise<boolean> {
  const provider = input.provider?.trim();
  const connectionId = input.connectionId?.trim();
  if (!provider || !connectionId) return false;

  const allow =
    Array.isArray(input.allowedConnectionIds) && input.allowedConnectionIds.length > 0
      ? new Set(input.allowedConnectionIds)
      : null;
  if (allow && ![...allow].some((id) => id !== connectionId)) return false;

  // One indexed count before loading rows. A single active key keeps the same-key retry.
  if (getProviderConnectionsCount({ provider, isActive: true }) < 2) return false;

  const rows = await getRawProviderConnections({ provider, isActive: true }, undefined, undefined, [
    "id",
    "test_status",
    "rate_limited_until",
  ]);

  for (const row of rows) {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id || id === connectionId) continue;
    if (allow && !allow.has(id)) continue;
    const testStatus = typeof row.testStatus === "string" ? row.testStatus.toLowerCase() : "";
    if (TERMINAL_TEST_STATUS.has(testStatus)) continue;
    const until = row.rateLimitedUntil;
    const untilValue =
      typeof until === "string" || typeof until === "number" || until instanceof Date
        ? until
        : null;
    if (isAccountUnavailable(untilValue)) continue;
    if (input.model && isModelLocked(provider, id, input.model)) continue;
    return true;
  }
  return false;
}
