"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { shouldShowAdvancedScreenBanner } from "@/shared/constants/dashboardUiMode";
import Button from "@/shared/components/Button";
import { useDashboardUiMode } from "./DashboardUiModeProvider";

/**
 * Simple view still mounts the existing page. This banner is the way back,
 * not a second copy of the screen.
 */
export default function AdvancedScreenBanner() {
  const pathname = usePathname();
  const { mode, setMode } = useDashboardUiMode();
  const t = useTranslations("header");

  if (!shouldShowAdvancedScreenBanner(mode, pathname)) return null;

  return (
    <div
      role="status"
      data-testid="simple-advanced-banner"
      className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-text-main">{t("advancedScreen")}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/home"
          className="inline-flex min-h-9 items-center rounded-control border border-border px-3 text-sm font-medium text-text-main hover:bg-surface-2"
        >
          {t("backToHome")}
        </Link>
        <Button variant="secondary" size="sm" onClick={() => void setMode("original")}>
          {t("openInFullView")}
        </Button>
      </div>
    </div>
  );
}
