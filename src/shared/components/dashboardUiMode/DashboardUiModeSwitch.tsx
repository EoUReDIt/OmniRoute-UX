"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import Icon from "@/shared/components/Icon";
import { useDashboardUiMode } from "./DashboardUiModeProvider";

const COMPACT_QUERY = "(max-width: 1023px)";

function subscribeCompact(onChange: () => void) {
  const media = window.matchMedia(COMPACT_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const compactNow = () => window.matchMedia(COMPACT_QUERY).matches;
const compactOnServer = () => false;

/**
 * Header control for the instance-wide shell. The stored value "original" is
 * shown as Full view. Activating it writes only `dashboardUiMode`.
 */
export default function DashboardUiModeSwitch() {
  const t = useTranslations("header");
  const { mode, setMode } = useDashboardUiMode();
  const compact = useSyncExternalStore(subscribeCompact, compactNow, compactOnServer);
  const simple = mode === "simple";
  const label = simple ? t("simpleView") : t("fullView");

  return (
    <button
      type="button"
      data-testid="dashboard-ui-mode-switch"
      data-compact={compact ? "true" : "false"}
      aria-pressed={simple}
      onClick={() => void setMode(simple ? "original" : "simple")}
      className={
        compact
          ? "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-control border border-border bg-surface px-2 text-xs font-medium text-text-main hover:bg-surface-2"
          : "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-sm font-medium text-text-main hover:bg-surface-2"
      }
    >
      <Icon name={simple ? "grid_view" : "dashboard"} size={compact ? 16 : 18} />
      <span>{label}</span>
    </button>
  );
}
