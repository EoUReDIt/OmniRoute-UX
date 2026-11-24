import {
  SIMPLE_NAV_ITEM_IDS,
  SIMPLE_NAV_LABEL_FALLBACKS,
  SIMPLE_NAV_LABEL_KEYS,
  type SimpleNavItemId,
} from "@/shared/constants/dashboardUiMode";
import { getActiveSidebarHref } from "@/shared/utils/sidebarRouteMatch";
import { filterSidebarSectionsByQuery } from "@/shared/utils/sidebarSearch";
import {
  SIDEBAR_SECTIONS,
  applyItemOrder,
  applySectionOrder,
  getSectionItems,
  isSidebarItemVisibleForFlags,
  resolveRuntimeSidebarSections,
  type SidebarItemDefinition,
  type SidebarItemGroup,
  type SidebarItemOrder,
  type SidebarSectionId,
} from "@/shared/constants/sidebarVisibility";

import type { useSidebarSettings } from "./useSidebarSettings";

export type LabelFn = (key: string, fallback: string) => string;
type LabeledItem = SidebarItemDefinition & { label: string };

/** Apply runtime gates and labels; only normal navigation passes the preset-hidden IDs. */
export function createItemResolver(getLabel: LabelFn, featureFlags: Record<string, boolean>) {
  return (item: SidebarItemDefinition, hidden?: Set<string>) => {
    if (hidden?.has(item.id)) return null;
    if (!isSidebarItemVisibleForFlags(item, featureFlags)) return null;
    const subtitle = item.subtitleKey
      ? getLabel(item.subtitleKey, item.subtitleFallback ?? "")
      : item.subtitleFallback;
    return {
      ...item,
      label: getLabel(item.i18nKey, item.labelFallback ?? item.id),
      subtitle: subtitle || undefined,
    };
  };
}

type ItemResolver = ReturnType<typeof createItemResolver>;

/** A section's items with group wrappers flattened away. */
export function flattenSectionItems(section: { children: any[] }): any[] {
  return section.children.flatMap((child: any) => (child.type === "group" ? child.items : [child]));
}

type ResolveContext = {
  resolveItem: ItemResolver;
  getLabel: LabelFn;
  hiddenItems: Set<string>;
  hiddenGroupLabels: Set<string>;
};

function resolveChild(child: any, ctx: ResolveContext) {
  if ("type" in child && child.type === "group") {
    const items = child.items
      .map((item: SidebarItemDefinition) => ctx.resolveItem(item, ctx.hiddenItems))
      .filter(Boolean) as LabeledItem[];
    if (items.length === 0) return null;
    // Smart-grouping: single visible item → inline flat (no group header)
    if (items.length === 1) return items[0];
    return {
      ...child,
      title: ctx.getLabel(child.titleKey, child.titleFallback),
      separatorHidden: ctx.hiddenGroupLabels.has(child.id),
      items,
    } as SidebarItemGroup & {
      title: string;
      separatorHidden: boolean;
      items: LabeledItem[];
    };
  }
  return ctx.resolveItem(child as SidebarItemDefinition, ctx.hiddenItems);
}

export function buildVisibleSections(
  orderedSections: any[],
  sidebarItemOrder: SidebarItemOrder,
  ctx: ResolveContext
) {
  return orderedSections
    .map((section) => {
      const orderedChildren = applyItemOrder(
        section.children,
        sidebarItemOrder[section.id as SidebarSectionId] ?? []
      );
      const children = orderedChildren.map((child) => resolveChild(child, ctx)).filter(Boolean);
      return {
        ...section,
        title: ctx.getLabel(section.titleKey, section.titleFallback),
        children,
      };
    })
    .filter((section) => flattenSectionItems(section).length > 0);
}

export type VisibleSection = ReturnType<typeof buildVisibleSections>[number];

/** Pins are explicit shortcuts, independent of the sidebar preset's hidden entries. */
export function buildPinnedItemList(
  pinnedItems: Set<string>,
  orderedSections: any[],
  resolveItem: ItemResolver
) {
  // Resolve against the runtime catalog so feature gates and private URLs still apply.
  const pinnableItems = orderedSections.flatMap(getSectionItems);
  return Array.from(pinnedItems)
    .map((id) => {
      const item = pinnableItems.find((entry) => entry.id === id);
      return item ? resolveItem(item) : null;
    })
    .filter(Boolean) as (SidebarItemDefinition & { label: string; subtitle?: string })[];
}

/** Insert the Pinned section right after Home (or first) when anything is pinned. */
export function insertPinnedSection(
  visibleSections: VisibleSection[],
  pinnedItemList: any[],
  getLabel: LabelFn
): VisibleSection[] {
  if (pinnedItemList.length === 0) return visibleSections;
  const homeIndex = visibleSections.findIndex((s) => s.id === "home");
  const insertIndex = homeIndex >= 0 ? homeIndex + 1 : 0;
  // Same element type as visibleSections so the union keeps `showTitle` and the
  // other resolved-section fields the renderer reads.
  const pinnedSection: VisibleSection = {
    id: "pinned" as SidebarSectionId,
    titleKey: "pinnedSection",
    titleFallback: "Pinned",
    title: getLabel("pinnedSection", "Pinned"),
    children: pinnedItemList,
  };
  return [
    ...visibleSections.slice(0, insertIndex),
    pinnedSection,
    ...visibleSections.slice(insertIndex),
  ];
}

export function buildSimpleNavItems(orderedSections: any[], getLabel: LabelFn) {
  const catalogById = new Map(
    orderedSections.flatMap(getSectionItems).map((item) => [item.id, item])
  );
  return SIMPLE_NAV_ITEM_IDS.flatMap((id) => {
    const item = catalogById.get(id);
    if (!item) return [];
    const labelKey = SIMPLE_NAV_LABEL_KEYS[id as SimpleNavItemId];
    return [
      {
        ...item,
        label: getLabel(labelKey, SIMPLE_NAV_LABEL_FALLBACKS[id as SimpleNavItemId]),
        subtitle: undefined,
      },
    ];
  });
}

type SidebarModelInput = {
  settings: ReturnType<typeof useSidebarSettings>;
  pinnedItems: Set<string>;
  getLabel: LabelFn;
  dashboardUiMode: string;
  pathname: string;
  searchQuery: string;
};

/** Everything the sidebar renders, derived from settings, pins, the route and the search box. */
export function buildSidebarModel(input: SidebarModelInput) {
  const { settings, pinnedItems, getLabel, dashboardUiMode, pathname, searchQuery } = input;
  const resolveItem = createItemResolver(getLabel, settings.featureFlags);
  const runtimeSections = resolveRuntimeSidebarSections(SIDEBAR_SECTIONS, {
    radarAdminUrl: settings.radarAdminUrl,
  });
  const orderedSections = applySectionOrder(
    runtimeSections.filter((section) => section.visibility !== "debug" || settings.showDebug),
    settings.sidebarSectionOrder
  );
  const visibleSections = buildVisibleSections(orderedSections, settings.sidebarItemOrder, {
    resolveItem,
    getLabel,
    hiddenItems: new Set(settings.hiddenSidebarItems),
    hiddenGroupLabels: new Set(settings.hiddenSidebarGroupLabels),
  });
  const pinnedItemList = buildPinnedItemList(pinnedItems, orderedSections, resolveItem);
  const sectionsWithPinned = insertPinnedSection(visibleSections, pinnedItemList, getLabel);

  const simpleNavItems = buildSimpleNavItems(orderedSections, getLabel);
  const simpleQuery = searchQuery.trim().toLowerCase();
  const visibleSimpleNav = simpleQuery
    ? simpleNavItems.filter((item) => item.label.toLowerCase().includes(simpleQuery))
    : simpleNavItems;
  const allVisibleItems = visibleSections.flatMap(flattenSectionItems);
  const activeHref = getActiveSidebarHref(
    pathname,
    dashboardUiMode === "simple" ? simpleNavItems : [...allVisibleItems, ...pinnedItemList]
  );

  const isSearching = searchQuery.trim().length > 0;
  // Section master toggle: hidden sections drop out of the normal display,
  // but stay searchable — mirroring hidden items (#15508).
  const hiddenSectionSet = new Set<SidebarSectionId>(settings.hiddenSidebarSections);
  const displaySections = isSearching
    ? filterSidebarSectionsByQuery(sectionsWithPinned, searchQuery)
    : sectionsWithPinned.filter((s) => !hiddenSectionSet.has(s.id));

  return { visibleSections, visibleSimpleNav, activeHref, isSearching, displaySections };
}
