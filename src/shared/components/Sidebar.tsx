"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePinnedSidebarItems } from "@/shared/hooks/usePinnedSidebarItems";
import { SidebarRail, useSidebar } from "@omniroute/ui-kit/sidebar";
import { useDashboardUiMode } from "@/shared/components/dashboardUiMode/DashboardUiModeProvider";
import { buildSidebarModel } from "./sidebarParts/resolveSidebarSections";
import { SidebarBrandHeader } from "./sidebarParts/SidebarBrandHeader";
import { SidebarFooterBar } from "./sidebarParts/SidebarFooterBar";
import { SidebarNavigation } from "./sidebarParts/SidebarNavigation";
import { createNavLinkRenderer } from "./sidebarParts/SidebarNavLink";
import { SidebarPowerModals, usePowerControls } from "./sidebarParts/SidebarPowerModals";
import { useGroupExpansion, useSidebarExpansion } from "./sidebarParts/useSidebarExpansion";
import { useSidebarSettings } from "./sidebarParts/useSidebarSettings";

function subscribeDir(callback: () => void) {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
  return () => observer.disconnect();
}

/** Kit Sidebar side: right-anchored under dir="rtl" (ar, fa, he, ur), left otherwise. */
export function useSidebarSide(): "left" | "right" {
  return useSyncExternalStore(
    subscribeDir,
    () => (document.documentElement.dir === "rtl" ? "right" : "left"),
    () => "left"
  );
}

type SidebarProps = {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMacElectron?: boolean;
};

/**
 * Dashboard navigation. Must render inside the kit `SidebarProvider` + `<Sidebar>` (DashboardShell
 * does that): the collapsed/mobile state comes from `useSidebar()`. `collapsed`, `onToggleCollapse`
 * and `onClose` stay in the props type for older callers and are ignored.
 */
export default function Sidebar({ isMacElectron = false }: SidebarProps) {
  const navigationId = useId();
  const pathname = usePathname();
  const t = useTranslations("sidebar");
  const { mode: dashboardUiMode } = useDashboardUiMode();
  const { state: sidebarState, isMobile } = useSidebar();
  const collapsed = sidebarState === "collapsed" && !isMobile;
  const settings = useSidebarSettings();
  const { pinnedItems, togglePinItem } = usePinnedSidebarItems();
  const [searchQuery, setSearchQuery] = useState("");
  const power = usePowerControls();
  const { expandedGroups, setExpandedGroups } = useGroupExpansion(pathname);

  const getLabel = (key: string, fallback: string) =>
    typeof t.has === "function" && t.has(key) ? t(key) : fallback;
  const model = buildSidebarModel({
    settings,
    pinnedItems,
    getLabel,
    dashboardUiMode,
    pathname,
    searchQuery,
  });
  const { activeHref, isSearching } = model;
  const expansion = useSidebarExpansion({
    collapsed,
    activeHref,
    visibleSections: model.visibleSections,
  });

  const renderNavLink = createNavLinkRenderer({
    activeHref,
    pinnedItems,
    collapsed,
    onTogglePin: togglePinItem,
  });

  return (
    <>
      {/* The skip link lives in DashboardShell, before the sidebar: below the mobile breakpoint
          this aside exists only inside the closed Sheet. */}
      <SidebarBrandHeader
        collapsed={collapsed}
        isMobile={isMobile}
        isMacElectron={isMacElectron}
        customAppName={settings.customAppName}
        customLogo={settings.customLogo}
      />
      <SidebarNavigation
        collapsed={collapsed}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        simple={dashboardUiMode === "simple"}
        isSearching={isSearching}
        visibleSimpleNav={model.visibleSimpleNav}
        displaySections={model.displaySections}
        renderNavLink={renderNavLink}
        sectionsCtx={{
          renderNavLink,
          navigationId,
          collapsed,
          isSearching,
          activeHref,
          expandedGroups,
          setExpandedGroups,
          ...expansion,
        }}
      />
      <SidebarFooterBar
        collapsed={collapsed}
        isMacElectron={isMacElectron}
        onRestart={power.openRestart}
        onShutdown={power.openShutdown}
      />
      {/* The kit rail straddles the outer edge (right: -0.25rem), which overflows the clipped aside
          (scrollWidth > clientWidth): keep it inside, on the edge that faces the content. `right-0`
          is that edge in LTR; under dir=rtl globals.css mirrors it to `inset-inline-end: 0` (the
          aside's left = content edge, the aside itself kept on the right by DashboardShell's
          `rtl:order-none`). */}
      <SidebarRail className="right-0" aria-label={t("toggleSidebar")} title={t("toggleSidebar")} />
      <SidebarPowerModals power={power} />
    </>
  );
}
