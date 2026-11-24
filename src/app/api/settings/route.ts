import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getSettings,
  getSettingsRevision,
  updateSettings,
  SettingsRevisionConflictError,
} from "@/lib/db/settings";
import { getRuntimePorts } from "@/lib/runtime/ports";
import { updateSettingsSchema } from "@/shared/validation/settingsSchemas";
import { oidcAdmissionClaimSchema } from "@/shared/utils/oidcAdmissionClaim";
import {
  DASHBOARD_SESSION_STATE_SETTINGS_KEYS,
  SECURITY_IMPACTING_SETTINGS_KEYS,
} from "@/shared/constants/securityImpactingSettings";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import { isFeatureFlagEnabled } from "@/shared/utils/featureFlags";
import { resolveModelLockoutSettings } from "@/lib/resilience/modelLockoutSettings";
import {
  validateProxyUrl,
  upsertUpstreamProxyConfig,
  getUpstreamProxyConfig,
} from "@/lib/db/upstreamProxy";
import { getProviderConnections } from "@/lib/db/providers";
import { clearCliproxyapiUrlCache } from "@omniroute/open-sse/executors/cliproxyapi.ts";
import {
  ensurePersistentManagementPasswordHash,
  getStoredManagementPassword,
  hasManagementPasswordConfigured,
  hashManagementPassword,
  verifyManagementPassword,
} from "@/lib/auth/managementPassword";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { requireOperatorCredential } from "@/lib/api/operatorCredential";
import { isPaidModelTarget } from "@/shared/utils/freeModels";
import { getAuditRequestContext, logAuditEvent } from "@/lib/compliance";
import { deriveSettingsAuditActor, emitSettingsFailureAudit } from "@/lib/api/settingsAudit";
import { maskSecretSettings, unchangedSecretSettingKeys } from "@/lib/api/settingsSecrets";
import { isAuthRequired } from "@/shared/utils/apiAuth";
import {
  DASHBOARD_SESSION_COOKIE,
  REVOKED_SESSIONS_SETTING,
  SESSIONS_VALID_AFTER_SETTING,
  getDashboardJwtSecret,
  mintDashboardSessionToken,
  verifyDashboardSessionToken,
} from "@/shared/utils/dashboardSessionToken";
import { getRadarAdminUrl } from "@/lib/radar/links";
import {
  AUTHZ_HEADER_AUTH_ID,
  AUTHZ_HEADER_AUTH_KIND,
  AUTHZ_HEADER_PEER_LOCALITY,
} from "@/server/authz/headers";

/**
 * Force this route to run dynamically per-request and never be cached/prerendered.
 * Combined with the `Cache-Control: no-store` response header below, this keeps
 * persisted settings (e.g. dashboard preferences, debugMode, hidden sidebar
 * items) visible immediately after refresh or restart instead of falling back
 * to stale Next.js fetch cache. Ported from upstream decolua/9router#951.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Response headers applied to every successful GET/PATCH on /api/settings. */
const SETTINGS_RESPONSE_HEADERS = { "Cache-Control": "no-store" } as const;

function settingsResponseHeaders(settingsRevision: number): Record<string, string> {
  return {
    ...SETTINGS_RESPONSE_HEADERS,
    ETag: String(settingsRevision),
  };
}

const RadarAdminOwnerSubjectSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("dashboard_session"), id: z.literal("dashboard") }).strict(),
  z.object({ kind: z.literal("anonymous"), id: z.literal("anonymous") }).strict(),
]);

export async function resolveOwnerRadarAdminUrl(request: Request): Promise<string | null> {
  const subject = RadarAdminOwnerSubjectSchema.safeParse({
    kind: request.headers.get(AUTHZ_HEADER_AUTH_KIND),
    id: request.headers.get(AUTHZ_HEADER_AUTH_ID),
  });
  if (!subject.success) return null;
  if (subject.data.kind === "dashboard_session") return getRadarAdminUrl();

  // Fresh local installs can intentionally run without login. In that mode,
  // only the pipeline's non-forgeable loopback verdict represents the owner;
  // CLI/internal/manage-scope credentials must not receive the private URL.
  if (request.headers.get(AUTHZ_HEADER_PEER_LOCALITY) !== "loopback") return null;
  if (await isAuthRequired(request)) return null;
  return getRadarAdminUrl();
}

/** Parse opt-in CAS token from If-Match (preferred) or PATCH body. */
function parseExpectedRevision(
  request: Request,
  body: Record<string, unknown>
): number | undefined {
  const ifMatch = request.headers.get("If-Match");
  if (ifMatch !== null) {
    const trimmed = ifMatch.replace(/^W\/"/, "").replace(/"$/, "").trim();
    const parsed = Number(trimmed);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  }
  const fromBody = body.expectedRevision;
  if (typeof fromBody === "number" && Number.isInteger(fromBody) && fromBody >= 0) {
    return fromBody;
  }
  return undefined;
}

/** Deep-equality for diff detection. JSON round-trip handles plain settings. */
function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** Build per-key `{before, after}` diff for changed keys (top-level only). */
function computeSettingsDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  candidateKeys: string[]
): Record<string, { before: unknown; after: unknown }> {
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of candidateKeys) {
    if (!isDeepEqual(before[key], after[key])) {
      diff[key] = { before: before[key], after: after[key] };
    }
  }
  return diff;
}

/** 403 for API keys of any scope and `oma_` access tokens that touch a security-policy key. */
const SECURITY_POLICY_FORBIDDEN_MESSAGE =
  "Changing security-policy settings (login, OIDC, Entra SSO, CORS origins, brute-force protection) requires a signed-in dashboard session or the local CLI; API keys and access tokens cannot change them.";

/**
 * Settings that decide who reaches the dashboard: the re-auth-gated keys, every `oidc*` key
 * and the server-written session state. Only the instance operator may change them — a
 * delegated machine credential (manage-scoped API key, `oma_` token) is refused even when it
 * knows the password, on top of the password re-auth below.
 */
const OPERATOR_ONLY_SETTINGS_KEYS = new Set<string>([
  ...SECURITY_IMPACTING_SETTINGS_KEYS,
  ...DASHBOARD_SESSION_STATE_SETTINGS_KEYS,
]);

function touchesOperatorOnlySettings(body: Record<string, unknown>): boolean {
  return Object.keys(body).some(
    (key) => OPERATOR_ONLY_SETTINGS_KEYS.has(key) || key.startsWith("oidc")
  );
}

/** 403 (audited as OPERATOR_REQUIRED) when a machine credential touches security policy. */
async function rejectMachineSecurityPolicyWrite(
  request: Request,
  body: Record<string, unknown>,
  actor: string,
  attemptedKeys: string[]
): Promise<Response | null> {
  if (!touchesOperatorOnlySettings(body)) return null;
  const verdict = await requireOperatorCredential(request, {
    forbiddenMessage: SECURITY_POLICY_FORBIDDEN_MESSAGE,
  });
  if (verdict.ok === false) {
    emitSettingsFailureAudit(request, actor, "OPERATOR_REQUIRED", attemptedKeys);
    return verdict.response;
  }
  return null;
}

/** List of top-level body keys the operator attempted to change (audit context). */
function attemptedKeysOf(body: Record<string, unknown> | null | undefined): string[] {
  if (!body || typeof body !== "object") return [];
  return Object.keys(body).filter(
    (k) =>
      k !== "currentPassword" && k !== "newPassword" && k !== "password" && k !== "expectedRevision"
  );
}

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const settings = await getSettings();
    const settingsRevision = await getSettingsRevision();
    const {
      password,
      [SESSIONS_VALID_AFTER_SETTING]: _sessionsValidAfter,
      [REVOKED_SESSIONS_SETTING]: _revokedSessions,
      ...safeSettings
    } = settings;

    const runtimePorts = getRuntimePorts();
    const { CLOUD_URL } = await import("@/lib/cloudSync");
    const cloudUrl = CLOUD_URL || null;
    const machineId = await getConsistentMachineId();

    // Include cliproxyapi_model_mapping from upstream_proxy_config table
    let cliproxyapiModelMapping: Record<string, string> | null = null;
    try {
      const proxyConfig = await getUpstreamProxyConfig("cliproxyapi");
      if (proxyConfig?.cliproxyapiModelMapping) {
        cliproxyapiModelMapping = proxyConfig.cliproxyapiModelMapping as Record<string, string>;
      }
    } catch {
      // best effort — don't fail GET /api/settings if this lookup fails
    }

    return NextResponse.json(
      {
        ...maskSecretSettings(safeSettings),
        settingsRevision,
        hasPassword: hasManagementPasswordConfigured(settings),
        runtimePorts,
        apiPort: runtimePorts.apiPort,
        dashboardPort: runtimePorts.dashboardPort,
        cloudConfigured: Boolean(cloudUrl),
        cloudUrl,
        machineId,
        // Sidebar.tsx has no server-side feature-flag access (client component);
        // this piggy-backs the RADAR_ENABLED gate onto the settings payload the
        // sidebar already fetches on mount, so the "radar" item can hide itself
        // without a dedicated round trip. See sidebarVisibility.ts's
        // `isSidebarItemVisibleForFlags()`.
        radarEnabled: isFeatureFlagEnabled("RADAR_ENABLED"),
        // Owner-only operational link. This route is management-authenticated;
        // the URL has no public default and is omitted from static client code.
        radarAdminUrl: await resolveOwnerRadarAdminUrl(request),
        ...(cliproxyapiModelMapping !== null
          ? { cliproxyapi_model_mapping: cliproxyapiModelMapping }
          : {}),
      },
      { headers: settingsResponseHeaders(settingsRevision) }
    );
  } catch (error) {
    console.log("Error getting settings:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim() || null;
    }
  }
  return null;
}

type OidcPolicyError = { code: string; message: string };

/**
 * Cross-field OIDC admission rules for a settings PATCH: when OIDC is (or becomes) enabled the
 * admission claim policy must be well-formed, and at least one admission rule (an allowed
 * subject/email or a claim policy) must exist. Returns the error body, or null when valid.
 */
async function validateOidcPolicyPatch(
  body: Record<string, unknown>
): Promise<OidcPolicyError | null> {
  if (
    body.oidcEnabled === undefined &&
    body.oidcAllowedSubjects === undefined &&
    body.oidcAdmissionClaim === undefined
  ) {
    return null;
  }
  const current = await getSettings();
  const enabled = (body.oidcEnabled as boolean | undefined) ?? current.oidcEnabled === true;
  if (!enabled) return null;
  const subjects = Array.isArray(body.oidcAllowedSubjects)
    ? (body.oidcAllowedSubjects as unknown[])
    : ((current.oidcAllowedSubjects as unknown[] | undefined) ?? []);
  const hasAtLeastOne = subjects.some((s) => typeof s === "string" && s.trim().length > 0);
  const admissionClaim =
    body.oidcAdmissionClaim === undefined ? current.oidcAdmissionClaim : body.oidcAdmissionClaim;
  if (admissionClaim != null && !oidcAdmissionClaimSchema.safeParse(admissionClaim).success) {
    return {
      code: "OIDC_ADMISSION_CLAIM_INVALID",
      message: "Invalid OIDC admission claim policy",
    };
  }
  if (!hasAtLeastOne && !admissionClaim) {
    return {
      code: "OIDC_ALLOWED_SUBJECTS_REQUIRED",
      message: "OIDC requires at least one allowed subject/email or an admission claim policy",
    };
  }
  return null;
}

/** The key-group ids an Entra SSO config points at (mapping targets + the default group). */
function collectEntraKeyGroupIds(mappings: unknown, defaultKeyGroupId: string): string[] {
  const ids = Array.isArray(mappings)
    ? mappings
        .map((entry) =>
          entry && typeof entry === "object"
            ? String((entry as Record<string, unknown>).keyGroupId ?? "").trim()
            : ""
        )
        .filter((id) => id.length > 0)
    : [];
  if (defaultKeyGroupId) ids.push(defaultKeyGroupId);
  return ids;
}

/**
 * Refuse an Entra config that cannot authenticate anyone: without tenant + audience no token
 * verifies, and with neither a group mapping nor a default key group every user resolves to no
 * group and gets a 403. Both present as "SSO is broken" rather than "SSO is misconfigured".
 * Every referenced key group must also exist and be active: a typo'd id would otherwise leave
 * SSO users in zero groups, which checkKeyModelAccess reads as "no restrictions" — the
 * misconfiguration would widen access. Returns the error body, or null when valid.
 */
async function validateEntraSsoPatch(
  body: Record<string, unknown>
): Promise<OidcPolicyError | null> {
  if (body.entraSsoEnabled !== true) return null;
  const current = (await getSettings()) as Record<string, unknown>;
  const pick = (key: string): unknown => (key in body ? body[key] : current[key]);

  const tenantId = String(pick("entraTenantId") ?? "").trim();
  const audience = String(pick("entraApiAudience") ?? "").trim();
  if (!tenantId || !audience) {
    return {
      code: "ENTRA_SSO_INCOMPLETE",
      message: "entraTenantId and entraApiAudience are required when entraSsoEnabled is true",
    };
  }

  const mappings = pick("entraGroupMappings");
  const defaultKeyGroupId = String(pick("entraDefaultKeyGroupId") ?? "").trim();
  const referenced = collectEntraKeyGroupIds(mappings, defaultKeyGroupId);
  if (referenced.length > 0) {
    const { filterExistingActiveKeyGroupIds } = await import("@/lib/db/apiKeyGroups");
    const live = new Set(filterExistingActiveKeyGroupIds(referenced));
    const unknown = [...new Set(referenced)].filter((id) => !live.has(id));
    if (unknown.length > 0) {
      return {
        code: "ENTRA_SSO_UNKNOWN_KEY_GROUP",
        message:
          "entraGroupMappings/entraDefaultKeyGroupId reference key groups that do not " +
          `exist or are inactive: ${unknown.join(", ")}`,
      };
    }
  }

  const hasMapping = Array.isArray(mappings) && mappings.length > 0;
  if (!hasMapping && !defaultKeyGroupId) {
    return {
      code: "ENTRA_SSO_NO_GROUP_POLICY",
      message:
        "Configure at least one entraGroupMappings entry or an entraDefaultKeyGroupId " +
        "when entraSsoEnabled is true, otherwise every SSO user is denied",
    };
  }
  return null;
}

type PatchCtx = { request: Request; actor: string; attemptedKeys: string[] };
type PatchBody = z.infer<typeof updateSettingsSchema> & { password?: string };
type SessionPayload = Awaited<ReturnType<typeof verifyDashboardSessionToken>>;

/** Audit a rejected PATCH, then answer with the matching JSON error. */
function rejectPatch(
  ctx: PatchCtx,
  code: string,
  payload: unknown,
  status: number,
  headers?: Record<string, string>
): Response {
  emitSettingsFailureAudit(ctx.request, ctx.actor, code, ctx.attemptedKeys);
  return NextResponse.json(payload, headers ? { status, headers } : { status });
}

async function readJsonObjectBody(
  request: Request,
  actor: string
): Promise<{ rawBody: Record<string, unknown> } | { response: Response }> {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    // Malformed JSON — surface a zod-style failure path so the rejection
    // is auditable like every other 400.
    emitSettingsFailureAudit(request, actor, "INVALID_JSON", []);
    return {
      response: NextResponse.json(
        { error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } },
        { status: 400 }
      ),
    };
  }
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    // Valid JSON that is not an object (`null`, a string, a number): nothing to read keys from.
    emitSettingsFailureAudit(request, actor, "INVALID_BODY", []);
    return {
      response: NextResponse.json(
        { error: { code: "INVALID_BODY", message: "Request body must be a JSON object" } },
        { status: 400 }
      ),
    };
  }
  return { rawBody: rawBody as Record<string, unknown> };
}

async function validatePatchBody(
  ctx: PatchCtx,
  rawBody: Record<string, unknown>
): Promise<
  { response: Response } | { data: Record<string, unknown>; body: PatchBody; ignoredKeys: string[] }
> {
  const validation = validateBody(updateSettingsSchema, rawBody);
  if (isValidationFailure(validation)) {
    // Detect spawn-capable prefix rejection (spec AC-8) so the audit row
    // names the correct error code; otherwise fall back to the generic
    // validation-failure label.
    const isBypassPrefixRejection = (validation.error.details || []).some(
      (d) => typeof d.message === "string" && d.message.includes("BYPASS_PREFIX_NOT_ALLOWED")
    );
    const code = isBypassPrefixRejection ? "BYPASS_PREFIX_NOT_ALLOWED" : "VALIDATION_FAILED";
    return { response: rejectPatch(ctx, code, { error: validation.error }, 400) };
  }
  const body: PatchBody = { ...validation.data };
  // The schema strips keys it does not know. Name them in the 200 body so a typo or a stale
  // client never looks like a saved setting.
  const ignoredKeys = Object.keys(rawBody).filter((key) => !Object.hasOwn(validation.data, key));
  // GET returns stored secrets masked; a client that sends the mask back keeps the stored value.
  for (const key of unchangedSecretSettingKeys(validation.data)) {
    delete (validation.data as Record<string, unknown>)[key];
    delete (body as Record<string, unknown>)[key];
  }
  return { data: validation.data as Record<string, unknown>, body, ignoredKeys };
}

/** OIDC and Entra SSO business rules that need more than the Zod shape check. */
async function rejectInvalidSsoPolicy(ctx: PatchCtx, body: PatchBody): Promise<Response | null> {
  const oidcPolicyError = await validateOidcPolicyPatch(body);
  if (oidcPolicyError) {
    return rejectPatch(ctx, oidcPolicyError.code, { error: oidcPolicyError }, 400);
  }
  const entraPolicyError = await validateEntraSsoPatch(body);
  if (entraPolicyError) {
    return rejectPatch(ctx, entraPolicyError.code, { error: entraPolicyError }, 400);
  }
  return null;
}

/** Verify currentPassword against the stored hash; null when the caller may proceed. */
async function verifyCurrentPassword(
  ctx: PatchCtx,
  body: PatchBody,
  storedPasswordHash: string | null | undefined,
  touchedSecurityKeys: string[]
): Promise<Response | null> {
  if (!body.currentPassword) {
    return rejectPatch(
      ctx,
      "PASSWORD_REQUIRED",
      {
        error: {
          code: "PASSWORD_REQUIRED",
          message: "currentPassword required for security-impacting setting changes",
          keys: touchedSecurityKeys,
        },
      },
      400
    );
  }
  const isValid = await verifyManagementPassword(body.currentPassword, storedPasswordHash);
  if (!isValid) {
    return rejectPatch(
      ctx,
      "PASSWORD_MISMATCH",
      { error: { code: "PASSWORD_MISMATCH", message: "Invalid current password" } },
      401
    );
  }
  return null;
}

/**
 * Validated body only, so stray unknown keys never trip this. If any security key is present,
 * require currentPassword and verify it against the stored bcrypt hash. The password is verified
 * at most once per PATCH (this also covers the newPassword reauth).
 */
async function enforceSecurityReauth(
  ctx: PatchCtx,
  data: Record<string, unknown>,
  body: PatchBody
): Promise<Response | null> {
  const touchedSecurityKeys = SECURITY_IMPACTING_SETTINGS_KEYS.filter((k) => k in data);
  if (touchedSecurityKeys.length === 0) return null;

  const settings = await getSettings();
  // Lazy-hash any plaintext INITIAL_PASSWORD migration BEFORE we read the
  // stored hash, so the gate works on fresh deploys too.
  const passwordState = await ensurePersistentManagementPasswordHash({
    settings,
    source: "settings.security_impacting_update",
  });
  const storedPasswordHash = getStoredManagementPassword(passwordState.settings);
  // Cold-boot exception: when no password is configured yet AND login is currently disabled,
  // allow the first write to set policy (incl. the password itself). Once a hash exists the
  // gate always fires. #8950: also treat the request as cold boot when newPassword is present
  // without a stored hash, so the Security tab's two-step flow (enable requireLogin first, then
  // set password) does not deadlock.
  const isColdBoot =
    !storedPasswordHash &&
    (passwordState.settings.requireLogin === false || Boolean(body.newPassword));
  if (isColdBoot) return null;
  return verifyCurrentPassword(ctx, body, storedPasswordHash, touchedSecurityKeys);
}

/**
 * #6540: reject a paid-only webSearchRouteModel target when hidePaidModels is on. Business-rule
 * check (needs an async DB read), so it runs after Zod shape validation rather than as a Zod
 * .refine(). Fails open on "unknown" (aliases/combo names) — only a positively-identified paid
 * catalog entry is blocked.
 */
async function rejectPaidWebSearchTarget(ctx: PatchCtx, body: PatchBody): Promise<Response | null> {
  if (typeof body.webSearchRouteModel !== "string" || body.webSearchRouteModel.trim() === "") {
    return null;
  }
  const currentSettings = await getSettings();
  if ((currentSettings as Record<string, unknown>)?.hidePaidModels !== true) return null;
  if (isPaidModelTarget(body.webSearchRouteModel) !== "paid") return null;
  return rejectPatch(
    ctx,
    "PAID_MODEL_TARGET_BLOCKED",
    {
      error: {
        code: "PAID_MODEL_TARGET_BLOCKED",
        message: "This field cannot target a paid-only model while 'Hide paid models' is enabled.",
      },
    },
    400
  );
}

/**
 * The opencode server URL is checked BEFORE the write: the saved value reaches the executor
 * through applyRuntimeSettings() (run by updateSettings), so a rejected URL must never be
 * persisted, nor any other key of the same request. Clearing it back to the default applies at
 * once. Only the URL is a setting; the CLI binary is env-only (see
 * services/opencodeServerSettings.ts).
 */
function rejectInvalidOpencodeUrl(ctx: PatchCtx, rawBody: Record<string, unknown>) {
  const ocsUrl = rawBody.opencode_server_url as string | undefined;
  if (typeof ocsUrl !== "string" || ocsUrl.trim() === "") return null;
  const urlValidation = validateProxyUrl(ocsUrl.trim());
  if (urlValidation.valid !== false) return null;
  return rejectPatch(
    ctx,
    "OPENCODE_SERVER_URL_INVALID",
    { error: `Invalid opencode server URL: ${urlValidation.error}` },
    400
  );
}

/**
 * Password rotation: hash the new value AFTER the gate has accepted the currentPassword (or the
 * cold-boot exception fired). Strictly hashing + body rewriting; no separate verify happens here.
 * A password change also ends every dashboard session issued before it, so a copy of the old
 * cookie cannot outlive the password it was issued under. Returns the caller's own session so
 * its cookie can be re-issued.
 */
async function prepareWriteBody(request: Request, body: PatchBody): Promise<SessionPayload | null> {
  const passwordChanged = Boolean(body.newPassword);
  if (body.newPassword) {
    body.password = await hashManagementPassword(body.newPassword);
    body[SESSIONS_VALID_AFTER_SETTING] = Math.floor(Date.now() / 1000);
    delete body.newPassword;
  }
  const callerSession = passwordChanged
    ? await verifyDashboardSessionToken(readCookie(request, DASHBOARD_SESSION_COOKIE))
    : null;
  delete body.currentPassword;
  delete body.expectedRevision;
  return callerSession;
}

async function writeSettings(
  ctx: PatchCtx,
  body: PatchBody,
  expectedRevision: number | undefined
): Promise<{ settings: Awaited<ReturnType<typeof getSettings>> } | { response: Response }> {
  try {
    return { settings: await updateSettings(body, { expectedRevision }) };
  } catch (error) {
    if (!(error instanceof SettingsRevisionConflictError)) throw error;
    return {
      response: rejectPatch(
        ctx,
        "SETTINGS_REVISION_CONFLICT",
        {
          error: {
            code: "SETTINGS_REVISION_CONFLICT",
            message: "Settings changed since this snapshot; refresh and retry",
            currentRevision: error.currentRevision,
          },
        },
        409,
        settingsResponseHeaders(error.currentRevision)
      ),
    };
  }
}

/** One upstream_proxy_config row per active real provider, plus the "cliproxyapi" sentinel row. */
async function syncUpstreamProxyRows(
  rawBody: Record<string, unknown>,
  settings: Record<string, unknown>
) {
  const cpaFallback = rawBody.cliproxyapi_fallback_enabled as boolean | undefined;
  const cpaModelMapping = rawBody.cliproxyapi_model_mapping as Record<string, string> | undefined;
  const enabled = cpaFallback ?? settings.cliproxyapi_fallback_enabled;
  const mode = enabled ? "fallback" : "native";
  const mappingPart =
    cpaModelMapping !== undefined ? { cliproxyapiModelMapping: cpaModelMapping } : {};

  // Get all distinct active provider IDs so each one gets its own
  // upstream_proxy_config row. chatCore reads per-provider config
  // (e.g. getUpstreamProxyConfig("anthropic")), not a single global row.
  // Embedded service IDs are not real routing targets and must be skipped.
  const EMBEDDED_SERVICE_IDS = new Set(["cliproxyapi", "9router"]);
  const activeConnections = await getProviderConnections({ isActive: true });
  const activeProviderIds = [
    ...new Set(
      activeConnections
        .map((c: Record<string, unknown>) => c.provider as string)
        .filter((id: string) => !EMBEDDED_SERVICE_IDS.has(id))
    ),
  ];

  for (const providerId of activeProviderIds) {
    await upsertUpstreamProxyConfig({ providerId, mode, enabled: !!enabled, ...mappingPart });
  }

  // Update the "cliproxyapi" sentinel row used by GET /api/settings to
  // retrieve cliproxyapi_model_mapping. This row is NOT used for routing
  // (chatCore reads per-real-provider rows above); it exists solely as
  // storage for the global model-mapping blob.
  await upsertUpstreamProxyConfig({
    providerId: "cliproxyapi",
    mode,
    enabled: !!enabled,
    ...mappingPart,
  });
}

/** Sync CLIProxyAPI settings to the upstream_proxy_config table (runs after the write). */
async function syncCliproxyapi(
  ctx: PatchCtx,
  rawBody: Record<string, unknown>,
  settings: Record<string, unknown>
): Promise<Response | null> {
  const cpaUrl = rawBody.cliproxyapi_url as string | undefined;
  if (cpaUrl && typeof cpaUrl === "string") {
    const urlValidation = validateProxyUrl(cpaUrl);
    if (urlValidation.valid === false) {
      return rejectPatch(
        ctx,
        "CLIPROXY_URL_INVALID",
        { error: `Invalid CLIProxyAPI URL: ${urlValidation.error}` },
        400
      );
    }
    // Invalidate the executor's URL cache so it picks up the new URL immediately
    clearCliproxyapiUrlCache();
  }

  const touched =
    rawBody.cliproxyapi_fallback_enabled !== undefined ||
    cpaUrl !== undefined ||
    rawBody.cliproxyapi_model_mapping !== undefined;
  if (touched) await syncUpstreamProxyRows(rawBody, settings);
  return null;
}

/**
 * Audit success — diff of changed keys only. Idempotent PATCH (no diff)
 * intentionally writes NO row (spec §Observability + AC-9/AC-11).
 */
function auditSettingsUpdate(
  request: Request,
  actor: string,
  beforeSnapshot: Record<string, unknown>,
  settings: Record<string, unknown>,
  body: PatchBody
) {
  try {
    const diff = computeSettingsDiff(beforeSnapshot, settings, Object.keys(body));
    if (Object.keys(diff).length === 0) return;
    const { ipAddress, requestId } = getAuditRequestContext(request);
    logAuditEvent({
      action: "settings.update",
      actor,
      target: "settings",
      resourceType: "settings",
      status: "success",
      ipAddress: ipAddress || undefined,
      requestId: requestId || undefined,
      details: { diff },
    });
  } catch {
    // Audit failure must never break the write — swallow.
  }
}

/**
 * The browser that changed the password keeps its own session: swap its cookie for one issued
 * after the cutoff instead of signing the operator out of the page they are on.
 */
async function reissueCallerSessionCookie(request: Request, response: NextResponse) {
  const secret = getDashboardJwtSecret();
  if (!secret) return;
  const forwardedProto = (request.headers.get("x-forwarded-proto") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  response.cookies.set(DASHBOARD_SESSION_COOKIE, await mintDashboardSessionToken(secret), {
    httpOnly: true,
    secure:
      process.env.AUTH_COOKIE_SECURE === "true" ||
      forwardedProto === "https" ||
      new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function buildPatchResponse(
  request: Request,
  settings: Awaited<ReturnType<typeof getSettings>>,
  ignoredKeys: string[],
  callerSession: SessionPayload | null
): Promise<NextResponse> {
  const {
    password,
    [SESSIONS_VALID_AFTER_SETTING]: _sessionsValidAfter,
    [REVOKED_SESSIONS_SETTING]: _revokedSessions,
    // A JSON import can store an unknown setting named `ignoredKeys`. Only this request's
    // dropped keys may fill the response field.
    ignoredKeys: _storedIgnoredKeys,
    ...safeSettings
  } = settings;
  const settingsRevision = await getSettingsRevision();
  const response = NextResponse.json(
    {
      ...maskSecretSettings(safeSettings),
      settingsRevision,
      ...(ignoredKeys.length > 0 ? { ignoredKeys } : {}),
    },
    { headers: settingsResponseHeaders(settingsRevision) }
  );
  if (callerSession) await reissueCallerSessionCookie(request, response);
  return response;
}

export async function PATCH(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  // Derive actor + raw body once so the rejection paths can audit consistently.
  const actor = await deriveSettingsAuditActor(request);
  const parsedBody = await readJsonObjectBody(request, actor);
  if ("response" in parsedBody) return parsedBody.response;
  const { rawBody } = parsedBody;
  const ctx: PatchCtx = { request, actor, attemptedKeys: attemptedKeysOf(rawBody) };
  const expectedRevision = parseExpectedRevision(request, rawBody);

  try {
    const checked = await validatePatchBody(ctx, rawBody);
    if ("response" in checked) return checked.response;
    const { data, body, ignoredKeys } = checked;

    const operatorOnly = await rejectMachineSecurityPolicyWrite(
      request,
      data,
      actor,
      ctx.attemptedKeys
    );
    if (operatorOnly) return operatorOnly;

    // Sanitize model lockout settings: clamp values to valid bounds.
    if (body.modelLockout) {
      body.modelLockout = resolveModelLockoutSettings({
        modelLockout: body.modelLockout as Record<string, unknown>,
      }) as typeof body.modelLockout;
    }

    const rejection =
      (await rejectInvalidSsoPolicy(ctx, body)) ??
      (await enforceSecurityReauth(ctx, data, body)) ??
      (await rejectPaidWebSearchTarget(ctx, body)) ??
      rejectInvalidOpencodeUrl(ctx, rawBody);
    if (rejection) return rejection;

    const callerSession = await prepareWriteBody(request, body);
    // Snapshot BEFORE the write so the success row can record a real diff.
    const beforeSnapshot = (await getSettings()) as Record<string, unknown>;
    const written = await writeSettings(ctx, body, expectedRevision);
    if ("response" in written) return written.response;

    const settings = written.settings as Record<string, unknown>;
    const cliproxyRejection = await syncCliproxyapi(ctx, rawBody, settings);
    if (cliproxyRejection) return cliproxyRejection;

    auditSettingsUpdate(request, actor, beforeSnapshot, settings, body);
    return await buildPatchResponse(request, written.settings, ignoredKeys, callerSession);
  } catch (error) {
    console.log("Error updating settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  return PATCH(request);
}
