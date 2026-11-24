/**
 * Instance-wide dashboard shell. Stored on the settings row as `dashboardUiMode`.
 * Any value other than the string "simple" is the original shell, shown as Full view.
 * Request handlers must not read this value.
 */

export const DASHBOARD_UI_MODES = ["original", "simple"] as const;

export type DashboardUiMode = (typeof DASHBOARD_UI_MODES)[number];

export const DASHBOARD_UI_MODE_SETTING_KEY = "dashboardUiMode";

/** First-paint copy of the settings row. The database wins when they disagree. */
export const DASHBOARD_UI_MODE_COOKIE = "omniroute_dashboard_ui_mode";

export function normalizeDashboardUiMode(value: unknown): DashboardUiMode {
  return value === "simple" ? "simple" : "original";
}

/** Short nav, in the order Simple view shows it. Ids match SIDEBAR_SECTIONS. */
export const SIMPLE_NAV_ITEM_IDS = [
  "home",
  "providers",
  "api-manager",
  "cli-code",
  "mcp",
  "playground",
  "health",
] as const;

export type SimpleNavItemId = (typeof SIMPLE_NAV_ITEM_IDS)[number];

export const SIMPLE_NAV_LABEL_KEYS: Record<SimpleNavItemId, string> = {
  home: "simpleNavHome",
  providers: "simpleNavProviders",
  "api-manager": "simpleNavApiKeys",
  "cli-code": "simpleNavCodingTool",
  mcp: "simpleNavMcp",
  playground: "simpleNavTry",
  health: "simpleNavHealth",
};

export const SIMPLE_NAV_LABEL_FALLBACKS: Record<SimpleNavItemId, string> = {
  home: "Home",
  providers: "Providers",
  "api-manager": "API keys",
  "cli-code": "Coding tool",
  mcp: "MCP",
  playground: "Try",
  health: "Health",
};

/** Coding-tool cards Simple view shows before "Show every tool". */
export const SIMPLE_CODING_TOOL_IDS = ["claude", "codex", "cursor", "cline", "continue"] as const;

const SIMPLE_EXACT_PATHS = new Set([
  "/home",
  "/dashboard/providers",
  "/dashboard/providers/new",
  "/dashboard/api-manager",
  "/dashboard/cli-code",
  "/dashboard/mcp",
  "/dashboard/playground",
  "/dashboard/health",
]);

function normalizePath(pathname: string): string {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

/**
 * Routes the short nav owns. Provider detail and the new-provider wizard stay
 * with Providers. A coding-tool card stays with Coding tool. Embedded services,
 * per-key access, and every other route are outside the short nav.
 */
export function isSimpleNavPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = normalizePath(pathname);
  if (SIMPLE_EXACT_PATHS.has(path)) return true;
  if (path.startsWith("/dashboard/cli-code/")) return true;
  if (
    path.startsWith("/dashboard/providers/") &&
    !path.startsWith("/dashboard/providers/services")
  ) {
    return true;
  }
  return false;
}

/**
 * Simple view still renders a route outside the short nav. The wizard is not
 * one of those screens: abandoning it must not look like a deep link.
 */
export function shouldShowAdvancedScreenBanner(
  mode: DashboardUiMode,
  pathname: string | null | undefined
): boolean {
  if (mode !== "simple" || !pathname) return false;
  const path = normalizePath(pathname);
  if (path === "/dashboard/onboarding" || path.startsWith("/dashboard/onboarding/")) return false;
  return !isSimpleNavPath(path);
}

/** Mirror the last successful mode so the next first paint can match it. */
export function writeDashboardUiModeCookie(mode: DashboardUiMode): void {
  if (typeof document === "undefined") return;
  document.cookie = `${DASHBOARD_UI_MODE_COOKIE}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
