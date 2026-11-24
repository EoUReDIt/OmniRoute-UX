"use client";

import type { DashboardUiMode } from "@/shared/constants/dashboardUiMode";
import DashboardShell from "./DashboardShell";

/** Dashboard chrome: the Keak CI UI Kit shell (KEA-7886). `sidebarDefaultOpen` comes from the
 *  server layout (`ci_sidebar_state` cookie) so the first paint matches the persisted state.
 *  `dashboardUiMode` comes from the settings row (the cookie is only a fallback). */
export default function DashboardLayout({
  children,
  sidebarDefaultOpen = true,
  dashboardUiMode = "original",
}: {
  children: React.ReactNode;
  sidebarDefaultOpen?: boolean;
  dashboardUiMode?: DashboardUiMode;
}) {
  return (
    <DashboardShell sidebarDefaultOpen={sidebarDefaultOpen} dashboardUiMode={dashboardUiMode}>
      {children}
    </DashboardShell>
  );
}
