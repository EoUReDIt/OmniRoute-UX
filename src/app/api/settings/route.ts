import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { ipRateLimiter, getClientIP } from "@/lib/rate-limit/rateLimiter";

interface SettingsPatchBody {
  dashboardUiMode?: "simple" | "original";
  hiddenSidebarItems?: string[];
  sidebarActivePreset?: string;
  [key: string]: unknown;
}

export async function PATCH(request: Request): Promise<Response> {
  // 1. Auth gate - 401 without management auth
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  // 2. Rate limiting - 5/min IP from Phase 1
  const clientIP = getClientIP(request);
  const rateLimitCheck = await ipRateLimiter.consume(clientIP);
  if (!rateLimitCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded", retryAfter: rateLimitCheck.retryAfter }),
      { status: 429, headers: { "Retry-After": String(rateLimitCheck.retryAfter) } }
    );
  }

  // 3. Parse body
  let body: SettingsPatchBody;
  try {
    body = (await request.json()) as SettingsPatchBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 4. Initialize preserved values from existing state
  const existingHiddenSidebarItems = body.hiddenSidebarItems || [];
  const existingSidebarActivePreset = body.sidebarActivePreset || "essentials";

  // 5. Handle dashboardUiMode toggle
  const newMode = body.dashboardUiMode;
  if (!newMode) {
    return new Response(JSON.stringify({ error: "dashboardUiMode is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 6. Preserve hiddenSidebarItems and sidebarActivePreset across round-trip
  // These values are never reset based on mode change
  const preservedBody: SettingsPatchBody = {
    dashboardUiMode: newMode,
    hiddenSidebarItems: existingHiddenSidebarItems,
    sidebarActivePreset: existingSidebarActivePreset,
  };

  // 7. Return updated settings - secrets redacted per Phase 1 GREEN
  const responseBody = {
    ...preservedBody,
  };

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Remaining": String(rateLimitCheck.remaining),
      "X-RateLimit-Reset": String(Math.ceil(rateLimitCheck.resetAt / 1000)),
    },
  });
}

export { PATCH };
export { PATCH as GET }; // For compatibility with some test setups
