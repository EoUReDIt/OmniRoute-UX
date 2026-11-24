"use client";

import Button from "@/shared/components/Button";
import Modal from "@/shared/components/Modal";
import SegmentedControl from "@/shared/components/SegmentedControl";

// src/app/(dashboard)/dashboard/playground/components/StudioTopBar.tsx

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useDashboardUiMode } from "@/shared/components/dashboardUiMode/DashboardUiModeProvider";
import TokenCostCounter from "./TokenCostCounter";
import ExportCodeModal from "./ExportCodeModal";
import type { StreamMetrics } from "@/shared/schemas/playground";
import type { PlaygroundState } from "@/lib/playground/codeExport";

export type StudioTab = "chat" | "compare" | "api" | "build";

interface StudioTopBarProps {
  metrics: StreamMetrics;
  /** Optional playground state for the Export code modal. If omitted, a minimal state is used. */
  exportState?: PlaygroundState;
}

interface TabConfig {
  id: StudioTab;
  labelKey: "tabChat" | "tabCompare" | "tabApi" | "tabBuild";
  icon: string;
}

const TABS: TabConfig[] = [
  { id: "chat", labelKey: "tabChat", icon: "chat" },
  { id: "compare", labelKey: "tabCompare", icon: "compare" },
  { id: "api", labelKey: "tabApi", icon: "api" },
  { id: "build", labelKey: "tabBuild", icon: "build" },
];

/**
 * Top bar with tab switcher, token/cost counter, and export code button. Sits inside the
 * `SegmentedTabs` that holds the active tab and its panels.
 * Export code modal uses ExportCodeModal (F7) when exportState is provided.
 */
export default function StudioTopBar({ metrics, exportState }: StudioTopBarProps) {
  const t = useTranslations("playground");
  const tHeader = useTranslations("header");
  const { mode } = useDashboardUiMode();
  const searchParams = useSearchParams();
  const [exportOpen, setExportOpen] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const requestedTab = searchParams.get("tab");
  const showAllModes =
    mode !== "simple" || showModes || (requestedTab != null && requestedTab !== "chat");
  const tabs = showAllModes ? TABS : TABS.filter((tab) => tab.id === "chat");

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-bg-alt shrink-0">
        {/* Tabs (kit capsule tabs via the SegmentedControl adapter) */}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SegmentedControl
            semantics="tabs"
            options={tabs.map((tab) => ({ value: tab.id, label: t(tab.labelKey), icon: tab.icon }))}
            aria-label={t("playgroundTabs")}
            size="sm"
          />
          {mode === "simple" && !showAllModes && (
            // kit-exception: compact text button beside the kit tab strip, shown only in Simple view.
            <button
              type="button"
              className="min-h-9 rounded-control border border-border px-2 text-xs text-text-main"
              onClick={() => setShowModes(true)}
            >
              <span className="font-medium">{tHeader("showPlaygroundModes")}</span>
            </button>
          )}
        </div>

        {/* Right side: token counter + export button */}
        <div className="flex items-center gap-3">
          <TokenCostCounter
            tokensIn={metrics.tokensIn}
            tokensOut={metrics.tokensOut}
            costUsd={metrics.costUsd}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
            className="gap-1 text-xs text-text-muted"
            title={t("exportCode")}
            aria-label={t("exportCode")}
          >
            <span className="font-mono text-[11px]" aria-hidden="true">
              &lt;/&gt;
            </span>
            <span>{t("exportShort")}</span>
          </Button>
        </div>
      </div>

      {/* Export code modal — uses ExportCodeModal (F7) */}
      {exportOpen && exportState != null && (
        <ExportCodeModal state={exportState} onClose={() => setExportOpen(false)} />
      )}
      <Modal
        isOpen={exportOpen && exportState == null}
        onClose={() => setExportOpen(false)}
        title={t("exportCodeTitle")}
      >
        <p className="text-sm text-text-muted">{t("noStateToExport")}</p>
      </Modal>
    </>
  );
}
