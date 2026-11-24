/**
 * Whether a hintless 429 may skip the executor's same-key sleep.
 *
 * A healthy alternate is whatever getProviderCredentialsWithQuotaPreflight
 * returns with the current connection excluded. That is the selection account
 * rotation uses, so plan, catalog, quota, lease, and tool-calling filters are
 * not copied here. A sibling that shares an email, org, workspace, account, or
 * project is the same quota window, so the same-key wait stays. After this
 * request has already switched accounts, the wait stays too, so one 429 cannot
 * walk the whole pool.
 */
import { getProviderCredentialsWithQuotaPreflight } from "@/sse/services/auth";

export interface QuotaIdentitySource {
  email?: unknown;
  projectId?: unknown;
  providerSpecificData?: unknown;
}

const IDENTITY_FIELDS = [
  ["organizationId", "org"],
  ["orgId", "org"],
  ["org_id", "org"],
  ["workspaceId", "workspace"],
  ["accountId", "account"],
  ["chatgptUserId", "account"],
] as const;

function addToken(tokens: string[], kind: string, value: unknown) {
  if (typeof value !== "string") return;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return;
  tokens.push(`${kind}:${trimmed}`);
}

export function quotaIdentityTokens(source: QuotaIdentitySource | null | undefined): string[] {
  if (!source) return [];
  const tokens: string[] = [];
  addToken(tokens, "email", source.email);
  addToken(tokens, "project", source.projectId);
  const data =
    source.providerSpecificData &&
    typeof source.providerSpecificData === "object" &&
    !Array.isArray(source.providerSpecificData)
      ? (source.providerSpecificData as Record<string, unknown>)
      : {};
  addToken(tokens, "email", data.email);
  addToken(tokens, "project", data.projectId ?? data.project_id);
  for (const [field, kind] of IDENTITY_FIELDS) addToken(tokens, kind, data[field]);
  return tokens;
}

/** True when both connections carry the same account, org, workspace, or project token. */
export function sharesQuotaIdentity(
  current: QuotaIdentitySource | null | undefined,
  alternate: QuotaIdentitySource | null | undefined
): boolean {
  const left = new Set(quotaIdentityTokens(current));
  if (left.size === 0) return false;
  return quotaIdentityTokens(alternate).some((token) => left.has(token));
}

function connectionIdOf(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const id = (value as { connectionId?: unknown }).connectionId;
  return typeof id === "string" && id.trim().length > 0 ? id : null;
}

export async function shouldDeferHintless429(input: {
  enabled: boolean;
  forced?: boolean;
  alreadyFailedOver?: boolean;
  provider: string;
  model?: string | null;
  currentConnectionId: string;
  current?: QuotaIdentitySource | null;
  allowedConnections?: string[] | null;
  excludedConnectionIds?: string[];
  requireToolCalling?: boolean;
  sessionKey?: string | null;
  preferredConnectionIds?: string[] | null;
  allowRateLimitedConnections?: boolean;
  bypassQuotaPolicy?: boolean;
}): Promise<boolean> {
  if (input.enabled !== true || input.forced === true || input.alreadyFailedOver === true) {
    return false;
  }
  const currentId = input.currentConnectionId?.trim();
  if (!input.provider?.trim() || !currentId) return false;

  const excluded = new Set(input.excludedConnectionIds ?? []);
  excluded.add(currentId);
  let selected: unknown;
  try {
    selected = await getProviderCredentialsWithQuotaPreflight(
      input.provider,
      null,
      input.allowedConnections ?? null,
      input.model ?? null,
      {
        excludeConnectionIds: Array.from(excluded),
        requireToolCalling: input.requireToolCalling === true,
        sessionKey: input.sessionKey ?? null,
        preferredConnectionIds: input.preferredConnectionIds ?? null,
        allowRateLimitedConnections: input.allowRateLimitedConnections === true,
        bypassQuotaPolicy: input.bypassQuotaPolicy === true,
        reserveOAuthSession: false,
        reserveAntigravityLease: false,
      }
    );
  } catch {
    return false;
  }

  const alternateId = connectionIdOf(selected);
  if (!alternateId || alternateId === currentId) return false;
  if (sharesQuotaIdentity(input.current, selected as QuotaIdentitySource)) return false;
  (selected as { releaseOAuthSession?: () => void }).releaseOAuthSession?.();
  return true;
}
