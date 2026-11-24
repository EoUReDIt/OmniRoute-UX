"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";
import { SidebarMenuAction, SidebarMenuButton, SidebarMenuItem } from "@omniroute/ui-kit/sidebar";
import Icon from "../Icon";

export type SidebarNavLinkProps = {
  item: any;
  keyPrefix?: string;
  allowPin?: boolean;
  activeHref: string | null | undefined;
  pinnedItems: Set<string>;
  collapsed: boolean;
  onTogglePin: (id: string) => void;
};

export function navLinkKey(item: any, keyPrefix?: string) {
  return keyPrefix ? `${keyPrefix}-${item.href}` : item.href;
}

export function SidebarNavLink({
  item,
  keyPrefix,
  allowPin = true,
  activeHref,
  pinnedItems,
  collapsed,
  onTogglePin,
}: SidebarNavLinkProps) {
  const t = useTranslations("sidebar");
  const active = !item.external && activeHref === item.href;
  const isItemPinned = pinnedItems.has(item.id);
  const itemKey = navLinkKey(item, keyPrefix);
  const showPin = allowPin && !collapsed && item.id !== "home";
  const title = item.subtitle ? `${item.label} — ${item.subtitle}` : item.label;
  // On the active (accent) row the subtitle inherits the accent ink; elsewhere it is muted.
  const subtitleClassName = active
    ? "truncate text-[10px]"
    : "truncate text-[10px] text-text-muted";
  const content = (
    <>
      <Icon name={item.icon} size={18} fill={active} />
      {/* Icon rail: the label lives in the tooltip/aria-label. (The kit hides non-svg children
            when collapsed, but this span's `flex` utility would out-rank that rule.) */}
      {!collapsed && (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={cn("truncate text-sm", active ? "font-semibold" : "font-medium")}>
            {item.label}
          </span>
          {item.subtitle && <span className={subtitleClassName}>{item.subtitle}</span>}
        </span>
      )}
    </>
  );
  return (
    <SidebarMenuItem key={itemKey}>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
        {item.external ? (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={item.label}
            title={title}
          >
            {content}
          </a>
        ) : (
          <Link href={item.href} prefetch={false} aria-label={item.label} title={title}>
            {content}
          </Link>
        )}
      </SidebarMenuButton>
      {showPin && (
        // The kit action places itself at the row's inline end (RTL-safe), pads the row for it
        // and takes the active row's ink. A pin that is off shows on row hover or focus only.
        <SidebarMenuAction
          showOnHover={!isItemPinned}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin(item.id);
          }}
          title={isItemPinned ? t("unpinItem") : t("pinItem")}
          aria-label={isItemPinned ? t("unpinItem") : t("pinItem")}
        >
          <Icon name="push_pin" size={13} fill={isItemPinned} />
        </SidebarMenuAction>
      )}
    </SidebarMenuItem>
  );
}

/** Bind the shared row state once; the result renders a keyed row for any item. */
export function createNavLinkRenderer(
  shared: Omit<SidebarNavLinkProps, "item" | "keyPrefix" | "allowPin">
) {
  return function renderNavLink(item: any, keyPrefix?: string, allowPin = true) {
    return (
      <SidebarNavLink
        key={navLinkKey(item, keyPrefix)}
        item={item}
        keyPrefix={keyPrefix}
        allowPin={allowPin}
        {...shared}
      />
    );
  };
}
