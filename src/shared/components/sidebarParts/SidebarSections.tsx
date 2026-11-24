"use client";

import { Fragment, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from "@omniroute/ui-kit/sidebar";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@omniroute/ui-kit/disclosure";
import type { SidebarSectionId } from "@/shared/constants/sidebarVisibility";
import Icon from "../Icon";
import { flattenSectionItems } from "./resolveSidebarSections";

export type RenderNavLink = (item: any, keyPrefix?: string, allowPin?: boolean) => ReactNode;

export type SectionsCtx = {
  renderNavLink: RenderNavLink;
  navigationId: string;
  collapsed: boolean;
  isSearching: boolean;
  activeHref: string | null | undefined;
  expandedGroups: Record<string, boolean>;
  setExpandedGroups: (
    update: (previous: Record<string, boolean>) => Record<string, boolean>
  ) => void;
  expandedSections: Set<SidebarSectionId>;
  pinnedSections: Set<SidebarSectionId>;
  pinnedSectionCollapsed: boolean;
  toggleSection: (sectionId: SidebarSectionId) => void;
  togglePin: (sectionId: SidebarSectionId) => void;
};

function SidebarGroupChild({
  child,
  sectionId,
  ctx,
}: {
  child: any;
  sectionId: string;
  ctx: SectionsCtx;
}) {
  const keyPrefix = sectionId === "pinned" ? "pinned" : undefined;
  if (child.type !== "group") return <>{ctx.renderNavLink(child, keyPrefix)}</>;
  if (child.items.length === 0) return null;
  const separatorHidden = child.separatorHidden === true;
  const groupExpanded =
    separatorHidden ||
    ctx.isSearching ||
    (ctx.expandedGroups[child.id] ?? child.items.some((item) => item.href === ctx.activeHref));
  const groupItems = (
    <SidebarMenu className={cn(!separatorHidden && "ms-3 border-s border-border ps-2")}>
      {child.items.map((item: any) => ctx.renderNavLink(item, keyPrefix))}
    </SidebarMenu>
  );
  // A group whose separator is hidden has no header: its items sit in the section, always open.
  if (separatorHidden) {
    return <SidebarMenuItem className="mt-1">{groupItems}</SidebarMenuItem>;
  }
  // Kit Disclosure (#19066): trigger and panel wired by the kit (aria-expanded/aria-controls);
  // the panel renders its links only while open; the kit chevron points right when closed and
  // down when open, as the legacy one did. The trigger keeps the compact sidebar row.
  return (
    <SidebarMenuItem className="mt-1">
      <Disclosure
        open={groupExpanded}
        onOpenChange={(open) =>
          ctx.setExpandedGroups((previous) => ({ ...previous, [child.id]: open }))
        }
      >
        <DisclosureTrigger className="min-h-9 px-3 py-0 text-xs font-semibold text-text-muted hover:bg-surface hover:text-text-main">
          {child.title}
        </DisclosureTrigger>
        <DisclosureContent>{groupItems}</DisclosureContent>
      </Disclosure>
    </SidebarMenuItem>
  );
}

/** Section header (toggle + hover-revealed pin) for a titled, expanded-capable section. */
function SectionHeader({
  section,
  isExpanded,
  ctx,
}: {
  section: any;
  isExpanded: boolean;
  ctx: SectionsCtx;
}) {
  const t = useTranslations("sidebar");
  const sectionId = section.id as SidebarSectionId;
  const isPinned = ctx.pinnedSections.has(sectionId);
  return (
    <SidebarGroupLabel className="group/header h-auto gap-1 px-0">
      {/* kit-exception: Native disclosure button on kit tokens (track F): a full-width section header
                      inside the kit SidebarGroupLabel. The kit Disclosure wraps trigger and panel in its own
                      element, which would split SidebarGroupLabel from SidebarGroup. */}
      <button
        type="button"
        onClick={() => ctx.toggleSection(sectionId)}
        aria-expanded={isExpanded}
        aria-controls={`${ctx.navigationId}-${section.id}`}
        className="flex min-h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-control px-2 text-start uppercase hover:bg-surface hover:text-text-main"
      >
        <span className="truncate">{section.title}</span>
        <Icon
          name="expand_more"
          size={16}
          className={cn("transition-transform", isExpanded && "rotate-180")}
        />
      </button>
      {sectionId !== "pinned" && (
        // kit-exception: Native button on kit tokens (track F): a hover-revealed pin inside the kit
        // SidebarGroupLabel. The kit SidebarGroupAction is positioned with a physical `right`
        // (wrong side in RTL) and turns the label into an ellipsized block.
        <button
          type="button"
          onClick={() => ctx.togglePin(sectionId)}
          aria-label={`${isPinned ? t("unpinSection") : t("pinSectionOpen")}: ${section.title}`}
          aria-pressed={isPinned}
          title={isPinned ? t("unpinSection") : t("pinSectionOpen")}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-control transition-opacity hover:bg-surface focus-visible:opacity-100",
            isPinned
              ? "text-text-main"
              : "text-text-muted opacity-0 group-hover/header:opacity-100 group-focus-within/header:opacity-100"
          )}
        >
          <Icon name="push_pin" size={14} fill={isPinned} />
        </button>
      )}
    </SidebarGroupLabel>
  );
}

function TitledSection({ section, ctx }: { section: any; ctx: SectionsCtx }) {
  const sectionId = section.id as SidebarSectionId;
  const isExpanded =
    ctx.isSearching ||
    (sectionId === "pinned" ? !ctx.pinnedSectionCollapsed : ctx.expandedSections.has(sectionId));
  return (
    <SidebarGroup>
      <SectionHeader section={section} isExpanded={isExpanded} ctx={ctx} />
      {isExpanded && (
        <SidebarGroupContent id={`${ctx.navigationId}-${section.id}`}>
          <SidebarMenu>
            {section.children.map((child: any, index: number) => (
              <SidebarGroupChild
                key={child.type === "group" ? child.id : (child.href ?? index)}
                child={child}
                sectionId={section.id}
                ctx={ctx}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}

function SidebarSection({
  section,
  isFirst,
  ctx,
}: {
  section: any;
  isFirst: boolean;
  ctx: SectionsCtx;
}) {
  const keyPrefix = section.id === "pinned" ? "pinned" : undefined;
  const sectionItems = flattenSectionItems(section);
  // Collapsed (icon rail): flat items, a separator between sections.
  if (ctx.collapsed) {
    return (
      <Fragment>
        {!isFirst && <SidebarSeparator />}
        <SidebarMenu>
          {sectionItems.map((item: any) => ctx.renderNavLink(item, keyPrefix))}
        </SidebarMenu>
      </Fragment>
    );
  }
  // Sections without a visible title (e.g. Home) render their items directly.
  if (section.showTitle === false) {
    return (
      <SidebarGroup>
        <SidebarMenu>
          {sectionItems.map((item: any) => ctx.renderNavLink(item, keyPrefix))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }
  return <TitledSection section={section} ctx={ctx} />;
}

export function SidebarSectionList({ sections, ctx }: { sections: any[]; ctx: SectionsCtx }) {
  return (
    <>
      {sections.map((section, idx) => (
        <SidebarSection key={section.id} section={section} isFirst={idx === 0} ctx={ctx} />
      ))}
    </>
  );
}
