"use client";

import { useTranslations } from "next-intl";
import { SidebarContent, SidebarMenu } from "@omniroute/ui-kit/sidebar";
import Input from "../Input";
import { SidebarSectionList, type RenderNavLink, type SectionsCtx } from "./SidebarSections";

type SidebarNavigationProps = {
  collapsed: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  simple: boolean;
  isSearching: boolean;
  visibleSimpleNav: any[];
  displaySections: any[];
  renderNavLink: RenderNavLink;
  sectionsCtx: SectionsCtx;
};

/** The scrollable content: sticky search box and either the Simple short nav or the sections. */
export function SidebarNavigation({
  collapsed,
  searchQuery,
  onSearchChange,
  simple,
  isSearching,
  visibleSimpleNav,
  displaySections,
  renderNavLink,
  sectionsCtx,
}: SidebarNavigationProps) {
  const t = useTranslations("sidebar");
  const tc = useTranslations("common");
  const noResults = <p className="px-2 py-3 text-xs text-text-muted">{tc("noResults")}</p>;

  return (
    <SidebarContent className="custom-scrollbar">
      {/* Search at the top of the content (spec §3.7), sticky: SidebarContent is the scroll
            container, so the box stays in view while the 100+ items scroll under it. */}
      {!collapsed && (
        // -top-2 / -mt-2 pt-2 cover the content's 8 px top padding, so scrolled rows do not
        // peek through a strip above the box.
        <div className="sticky -top-2 z-10 -mt-2 bg-[var(--ci-color-background)] pt-2 pb-1">
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={tc("search")}
            aria-label={tc("search")}
            icon="search"
            className="gap-0"
            inputClassName="min-h-10 py-2 text-sm"
          />
        </div>
      )}
      {/* scroll-mt-14 (≈ the sticky search box) keeps a focused row clear of it on Shift+Tab. */}
      <nav
        aria-label={t("mainNavigation")}
        className="flex flex-col gap-3 [&_a]:scroll-mt-14 [&_button]:scroll-mt-14"
      >
        {simple ? (
          <SidebarMenu>
            {visibleSimpleNav.length === 0 && noResults}
            {visibleSimpleNav.map((item) => renderNavLink(item, "simple", false))}
          </SidebarMenu>
        ) : (
          <>
            {isSearching && displaySections.length === 0 && noResults}
            <SidebarSectionList sections={displaySections} ctx={sectionsCtx} />
          </>
        )}
      </nav>
    </SidebarContent>
  );
}
