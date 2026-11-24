"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DASHBOARD_UI_MODE_SETTING_KEY,
  normalizeDashboardUiMode,
  writeDashboardUiModeCookie,
  type DashboardUiMode,
} from "@/shared/constants/dashboardUiMode";
import { SIDEBAR_SETTINGS_UPDATED_EVENT } from "@/shared/constants/sidebarVisibility";

type DashboardUiModeContextValue = {
  mode: DashboardUiMode;
  /** Writes only `dashboardUiMode`. Returns false when the PATCH fails and the label reverts. */
  setMode: (next: DashboardUiMode) => Promise<boolean>;
};

const DashboardUiModeContext = createContext<DashboardUiModeContextValue | null>(null);

const fallbackValue: DashboardUiModeContextValue = {
  mode: "original",
  setMode: async () => false,
};

/**
 * Shell mode for the dashboard. `initialMode` comes from the settings row on the
 * server (the database wins over the cookie). Isolated renders without this
 * provider stay on Full view.
 */
export function DashboardUiModeProvider({
  initialMode,
  children,
}: {
  initialMode: DashboardUiMode;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<DashboardUiMode>(initialMode);

  useEffect(() => {
    writeDashboardUiModeCookie(mode);
  }, [mode]);

  useEffect(() => {
    const onSettings = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail ?? {};
      if (!(DASHBOARD_UI_MODE_SETTING_KEY in detail)) return;
      setModeState(normalizeDashboardUiMode(detail[DASHBOARD_UI_MODE_SETTING_KEY]));
    };
    window.addEventListener(SIDEBAR_SETTINGS_UPDATED_EVENT, onSettings);
    return () => window.removeEventListener(SIDEBAR_SETTINGS_UPDATED_EVENT, onSettings);
  }, []);

  const setMode = useCallback(async (next: DashboardUiMode) => {
    const normalized = normalizeDashboardUiMode(next);
    let previous: DashboardUiMode = normalized;
    setModeState((current) => {
      previous = current;
      return normalized;
    });
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [DASHBOARD_UI_MODE_SETTING_KEY]: normalized }),
      });
      if (!response.ok) throw new Error("settings update failed");
      writeDashboardUiModeCookie(normalized);
      window.dispatchEvent(
        new CustomEvent(SIDEBAR_SETTINGS_UPDATED_EVENT, {
          detail: { [DASHBOARD_UI_MODE_SETTING_KEY]: normalized },
        })
      );
      return true;
    } catch {
      setModeState(previous);
      return false;
    }
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return (
    <DashboardUiModeContext.Provider value={value}>{children}</DashboardUiModeContext.Provider>
  );
}

export function useDashboardUiMode(): DashboardUiModeContextValue {
  return useContext(DashboardUiModeContext) ?? fallbackValue;
}
