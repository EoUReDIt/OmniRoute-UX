"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDisplayBaseUrl } from "@/shared/hooks/useDisplayBaseUrl";
import { copyToClipboard } from "@/shared/utils/clipboard";
import Button from "@/shared/components/Button";
import { useDashboardUiMode } from "./DashboardUiModeProvider";

/** The base URL a coding tool pastes. Visible in Simple view, absent in Full view. */
export default function SimpleApiKeyBaseUrl() {
  const { mode } = useDashboardUiMode();
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const endpoint = `${useDisplayBaseUrl()}/v1`;
  const [copied, setCopied] = useState(false);

  if (mode !== "simple") return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {t("apiKeyBaseUrl")}
        </p>
        <code className="mt-1 block truncate text-sm text-text-main">{endpoint}</code>
      </div>
      <Button
        variant="secondary"
        size="sm"
        icon="content_copy"
        onClick={() => {
          void copyToClipboard(endpoint).then((ok) => {
            if (!ok) return;
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
      >
        {copied ? tc("copied") : tc("copy")}
      </Button>
    </div>
  );
}
