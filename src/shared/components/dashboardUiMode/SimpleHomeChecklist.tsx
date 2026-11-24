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
type Translate = ReturnType<typeof useTranslations>;

const LINK_CLASS =
  "inline-flex min-h-9 items-center rounded-control border border-border px-3 text-sm font-medium hover:bg-surface-2";

const CHECKLIST_LINKS = [
  { href: "/dashboard/providers", labelKey: "checklistOpenProviders" },
  { href: "/dashboard/api-manager", labelKey: "checklistOpenKeys" },
  { href: "/dashboard/cli-code", labelKey: "checklistOpenCoding" },
  { href: "/dashboard/mcp", labelKey: "checklistOpenMcp" },
  { href: "/dashboard/playground", labelKey: "checklistOpenTry" },
] as const;

function checkLabel(state: CheckState, t: Translate): string {
  if (state === "yes") return t("checklistYes");
  if (state === "no") return t("checklistNo");
  return t("checklistChecking");
}

/** Reads existing provider and key state once while Simple view is on. */
function useChecklistState(enabled: boolean) {
  const [provider, setProvider] = useState<CheckState>("unknown");
  const [clientKey, setClientKey] = useState<CheckState>("unknown");

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);

  return { provider, clientKey };
}

function EndpointRow({ endpoint }: { endpoint: string }) {
  const t = useTranslations("header");
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);

  return (
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
  );
}

function ChecklistLinks({ t }: { t: Translate }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHECKLIST_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={LINK_CLASS}>
          {t(link.labelKey)}
        </Link>
      ))}
    </div>
  );
}

/**
 * Simple view's home checklist. It reads existing provider and key state and
 * links to the existing screens. It does not create a connection or a key.
 */
export default function SimpleHomeChecklist() {
  const { mode } = useDashboardUiMode();
  const t = useTranslations("header");
  const baseUrl = useDisplayBaseUrl();
  const { provider, clientKey } = useChecklistState(mode === "simple");

  if (mode !== "simple") return null;

  return (
    <Card padding="md" className="mb-4" data-testid="simple-home-checklist">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-base text-text-main">
            <span className="font-semibold">{t("checklistTitle")}</span>
          </h2>
          <p className="mt-1 text-sm text-text-muted">{t("checklistIntro")}</p>
        </div>
        <EndpointRow endpoint={`${baseUrl}/v1`} />
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span>{t("checklistProvider")}</span>
            <span className="font-medium">{checkLabel(provider, t)}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>{t("checklistKey")}</span>
            <span className="font-medium">{checkLabel(clientKey, t)}</span>
          </li>
        </ul>
        <ChecklistLinks t={t} />
      </div>
    </Card>
  );
}
