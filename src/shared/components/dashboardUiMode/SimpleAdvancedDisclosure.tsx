"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Icon from "@/shared/components/Icon";
import { useDashboardUiMode } from "./DashboardUiModeProvider";

/**
 * In Full view the children render exactly as they do today. In Simple view
 * they stay on the same page, behind a disclosure, until the operator opens it.
 */
export default function SimpleAdvancedDisclosure({
  children,
  labelKey,
}: {
  children: React.ReactNode;
  labelKey: string;
}) {
  const { mode } = useDashboardUiMode();
  const t = useTranslations("header");
  const [open, setOpen] = useState(false);

  if (mode !== "simple") return <>{children}</>;

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* kit-exception: full-width aria-expanded disclosure header on kit tokens; the row is the
          whole click target. */}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm text-text-main"
      >
        <span className="font-medium">{t(labelKey)}</span>
        <Icon name={open ? "expand_less" : "expand_more"} size={18} />
      </button>
      {open ? <div className="border-t border-border p-3">{children}</div> : null}
    </div>
  );
}
