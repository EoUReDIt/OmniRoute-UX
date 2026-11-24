import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

import routeNamespaces from "@/i18n/routeNamespaces.generated.json";
import { normalizeComplianceEventTypes } from "@/i18n/request";
import { pickMessages } from "@/i18n/pickMessages";
import { DashboardLayout } from "@/shared/components";
import { getSettings } from "@/lib/db/settings";
import {
  DASHBOARD_UI_MODE_COOKIE,
  normalizeDashboardUiMode,
  type DashboardUiMode,
} from "@/shared/constants/dashboardUiMode";

/**
 * Dashboard chrome i18n provider — serves only the namespaces the shared
 * shell (Header, Sidebar, CommandPalette, …) uses. Each dashboard section
 * re-scopes the catalog again with its own SectionI18nProvider layout
 * (generated — see scripts/i18n/generate-route-namespaces.mjs).
 *
 * The kit sidebar's collapsed state comes from its `ci_sidebar_state` cookie,
 * read here on the server, so the first paint already matches the persisted state.
 */
async function resolveDashboardUiMode(): Promise<DashboardUiMode> {
  const cookieStore = await cookies();
  const cookieMode = normalizeDashboardUiMode(cookieStore.get(DASHBOARD_UI_MODE_COOKIE)?.value);
  try {
    const settings = await getSettings();
    // The settings row wins. The client rewrites the cookie when it disagrees.
    return normalizeDashboardUiMode(settings.dashboardUiMode);
  } catch {
    return cookieMode;
  }
}

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const messages = normalizeComplianceEventTypes(
    pickMessages((await getMessages()) as Record<string, unknown>, routeNamespaces.chrome)
  );
  const sidebarDefaultOpen = (await cookies()).get("ci_sidebar_state")?.value !== "0";
  const dashboardUiMode = await resolveDashboardUiMode();
  return (
    <NextIntlClientProvider messages={messages}>
      <DashboardLayout sidebarDefaultOpen={sidebarDefaultOpen} dashboardUiMode={dashboardUiMode}>
        {children}
      </DashboardLayout>
    </NextIntlClientProvider>
  );
}
