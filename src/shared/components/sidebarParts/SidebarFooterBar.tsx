"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";
import { SidebarFooter } from "@omniroute/ui-kit/sidebar";
import Button from "../Button";
import CloudSyncStatus from "../CloudSyncStatus";

const isE2EMode = process.env.NEXT_PUBLIC_OMNIROUTE_E2E_MODE === "1";

type SidebarFooterBarProps = {
  collapsed: boolean;
  isMacElectron: boolean;
  onRestart: () => void;
  onShutdown: () => void;
};

export function SidebarFooterBar({
  collapsed,
  isMacElectron,
  onRestart,
  onShutdown,
}: SidebarFooterBarProps) {
  const t = useTranslations("sidebar");

  return (
    <SidebarFooter
      style={{
        paddingBottom: isMacElectron ? "calc(0.5rem + var(--desktop-safe-bottom))" : undefined,
      }}
    >
      {!isE2EMode && <CloudSyncStatus collapsed={collapsed} />}
      {/* One full-width row per action: side by side, "Shutdown" truncated at the 16 rem width
            (and longer locales truncate both). */}
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          icon="restart_alt"
          onClick={onRestart}
          title={t("restart")}
          aria-label={t("restart")}
          className={cn("w-full", collapsed ? "px-0" : "justify-start")}
        >
          {!collapsed && t("restart")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon="power_settings_new"
          onClick={onShutdown}
          title={t("shutdown")}
          aria-label={t("shutdown")}
          className={cn("w-full hover:text-error", collapsed ? "px-0" : "justify-start")}
        >
          {!collapsed && t("shutdown")}
        </Button>
      </div>
    </SidebarFooter>
  );
}
