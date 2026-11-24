"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useDisplayBaseUrl } from "@/shared/hooks/useDisplayBaseUrl";
import { copyToClipboard } from "@/shared/utils/clipboard";
import Button from "@/shared/components/Button";
import Card from "@/shared/components/Card";
import { useDashboardUiMode } from "./DashboardUiModeProvider";

type CheckState = "unknown" | "yes" | "no";

/**
 * Simple view's home checklist. It reads existing provider and key state and
 * links to the existing screens. It does not create a connection or a key.
 */
export default function SimpleHomeChecklist() {
  const { mode } = useDashboardUiMode();
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const baseUrl = useDisplayBaseUrl();
  const endpoint = `${baseUrl}/v1`;
  const [provider, setProvider] = useState<CheckState>("unknown");
  const [clientKey, setClientKey] = useState<CheckState>("unknown");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mode !== "simple") return;
    const ctrl = new AbortController();
    fetch("/api/providers", { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : { connections: [] }))
      .then((data) => {
        const connections = Array.isArray(data?.connections) ? data.connections : [];
        const connected = connections.some(
          (row: { isActive?: boolean }) => row?.isActive !== false
        );
        setProvider(connected ? "yes" : "no");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setProvider("no");
      });
    fetch("/api/keys", { signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : { keys: [] }))
      .then((data) => {
        const keys = Array.isArray(data?.keys) ? data.keys : [];
        setClientKey(keys.length > 0 ? "yes" : "no");
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setClientKey("no");
      });
    return () => ctrl.abort();
  }, [mode]);

  if (mode !== "simple") return null;

  const providerLabel =
    provider === "yes"
      ? t("checklistYes")
      : provider === "no"
        ? t("checklistNo")
        : t("checklistChecking");
  const keyLabel =
    clientKey === "yes"
      ? t("checklistYes")
      : clientKey === "no"
        ? t("checklistNo")
        : t("checklistChecking");

  return (
    <Card padding="md" className="mb-4" data-testid="simple-home-checklist">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base text-text-main">
            <span className="font-semibold">{t("checklistTitle")}</span>
          </h2>
          <p className="mt-1 text-sm text-text-muted">{t("checklistIntro")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {t("checklistEndpoint")}
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
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span>{t("checklistProvider")}</span>
            <span className="font-medium">{providerLabel}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>{t("checklistKey")}</span>
            <span className="font-medium">{keyLabel}</span>
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/providers"
            className="inline-flex min-h-9 items-center rounded-control border border-border px-3 text-sm font-medium hover:bg-surface-2"
          >
            {t("checklistOpenProviders")}
          </Link>
          <Link
            href="/dashboard/api-manager"
            className="inline-flex min-h-9 items-center rounded-control border border-border px-3 text-sm font-medium hover:bg-surface-2"
          >
            {t("checklistOpenKeys")}
          </Link>
          <Link
            href="/dashboard/cli-code"
            className="inline-flex min-h-9 items-center rounded-control border border-border px-3 text-sm font-medium hover:bg-surface-2"
          >
            {t("checklistOpenCoding")}
          </Link>
          <Link
            href="/dashboard/mcp"
            className="inline-flex min-h-9 items-center rounded-control border border-border px-3 text-sm font-medium hover:bg-surface-2"
          >
            {t("checklistOpenMcp")}
          </Link>
          <Link
            href="/dashboard/playground"
            className="inline-flex min-h-9 items-center rounded-control border border-border px-3 text-sm font-medium hover:bg-surface-2"
          >
            {t("checklistOpenTry")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
