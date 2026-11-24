import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  expandActiveSection,
  hydrateExpandedSections,
  toggleExpandedSection,
} from "@/shared/utils/sidebarExpansionState";
import { SIDEBAR_SECTIONS, type SidebarSectionId } from "@/shared/constants/sidebarVisibility";
import {
  DEFAULT_EXPANDED,
  EXPANDED_SECTIONS_KEY,
  PINNED_SECTIONS_KEY,
  getHydratedSnapshot,
  getServerHydratedSnapshot,
  getServerSnapshotNull,
  noopSubscribe,
  parseStoredArray,
  readStoredExpandedRaw,
  readStoredPinnedRaw,
  saveToStorage,
} from "./sidebarStorage";
import { flattenSectionItems, type VisibleSection } from "./resolveSidebarSections";

type ExpansionInput = {
  collapsed: boolean;
  activeHref: string | null | undefined;
  visibleSections: VisibleSection[];
};

/**
 * Expanded and pinned sections, hydrated from localStorage after the client mounts. A stored []
 * intentionally means "all sections collapsed". localStorage is read through useSyncExternalStore
 * snapshots (server snapshot: null) and the states are adjusted during render (react.dev "You
 * Might Not Need an Effect") so the stored expansion applies before paint without a synchronous
 * effect setState.
 */
function useHydratedSections() {
  const [expandedSections, setExpandedSections] = useState<Set<SidebarSectionId>>(
    new Set([DEFAULT_EXPANDED])
  );
  const [pinnedSections, setPinnedSections] = useState<Set<SidebarSectionId>>(new Set());
  const [sidebarExpansionLoaded, setSidebarExpansionLoaded] = useState(false);
  const [skipInitialActiveExpansion, setSkipInitialActiveExpansion] = useState(false);

  const hydrated = useSyncExternalStore(
    noopSubscribe,
    getHydratedSnapshot,
    getServerHydratedSnapshot
  );
  const storedExpandedRaw = useSyncExternalStore(
    noopSubscribe,
    readStoredExpandedRaw,
    getServerSnapshotNull
  );
  const storedPinnedRaw = useSyncExternalStore(
    noopSubscribe,
    readStoredPinnedRaw,
    getServerSnapshotNull
  );
  if (hydrated && !sidebarExpansionLoaded) {
    const storedExpanded = parseStoredArray<SidebarSectionId[]>(storedExpandedRaw, [
      DEFAULT_EXPANDED,
    ]);
    const storedPinned: SidebarSectionId[] =
      storedPinnedRaw !== null
        ? parseStoredArray<SidebarSectionId[]>(storedPinnedRaw, [])
        : (SIDEBAR_SECTIONS.filter((s) => s.defaultPinned).map((s) => s.id) as SidebarSectionId[]);

    const initialPinned = new Set<SidebarSectionId>(storedPinned);
    const initialExpanded = hydrateExpandedSections(storedExpanded, initialPinned);

    setSkipInitialActiveExpansion(storedExpanded.length === 0);
    setExpandedSections(initialExpanded);
    setPinnedSections(initialPinned);
    setSidebarExpansionLoaded(true);
  }

  return {
    expandedSections,
    setExpandedSections,
    pinnedSections,
    setPinnedSections,
    sidebarExpansionLoaded,
    skipInitialActiveExpansion,
    setSkipInitialActiveExpansion,
  };
}

export function useSidebarExpansion({ collapsed, activeHref, visibleSections }: ExpansionInput) {
  const {
    expandedSections,
    setExpandedSections,
    pinnedSections,
    setPinnedSections,
    sidebarExpansionLoaded,
    skipInitialActiveExpansion,
    setSkipInitialActiveExpansion,
  } = useHydratedSections();
  const [pinnedSectionCollapsed, setPinnedSectionCollapsed] = useState(false);

  // Keep the active page visible while preserving accordion semantics for
  // unpinned sections. Render-time adjustment (react.dev "You Might Not Need
  // an Effect"): the composite key mirrors the old effect's
  // [activeHref, collapsed, pinnedSections, sidebarExpansionLoaded] deps.
  const activeExpansionKey = `${collapsed}|${sidebarExpansionLoaded}|${activeHref ?? ""}|${[
    ...pinnedSections,
  ]
    .sort()
    .join(",")}`;
  const [prevActiveExpansionKey, setPrevActiveExpansionKey] = useState<string | null>(null);
  if (activeExpansionKey !== prevActiveExpansionKey) {
    setPrevActiveExpansionKey(activeExpansionKey);
    if (!collapsed && sidebarExpansionLoaded) {
      if (skipInitialActiveExpansion) {
        setSkipInitialActiveExpansion(false);
      } else {
        const owner = visibleSections.find((section) =>
          flattenSectionItems(section).some(
            (item: any) => !item.external && item.href === activeHref
          )
        );
        if (owner) {
          setExpandedSections((prev) => {
            const next = expandActiveSection(pinnedSections, owner.id as SidebarSectionId);
            if ([...next].every((id) => prev.has(id)) && next.size === prev.size) return prev;
            return next;
          });
        }
      }
    }
  }

  // Persist the expanded-section set whenever it changes after hydration —
  // single writer replacing the saveToStorage calls that used to run inside
  // setState updaters (side effects belong outside updaters).
  useEffect(() => {
    if (!sidebarExpansionLoaded) return;
    saveToStorage(EXPANDED_SECTIONS_KEY, [...expandedSections]);
  }, [expandedSections, sidebarExpansionLoaded]);

  // Accordion toggle: opening a section closes all non-pinned sections
  const toggleSection = useCallback(
    (sectionId: SidebarSectionId) => {
      if (sectionId === "pinned") {
        setPinnedSectionCollapsed((prev) => !prev);
        return;
      }
      setExpandedSections((prev) => toggleExpandedSection(prev, pinnedSections, sectionId));
    },
    [pinnedSections, setExpandedSections]
  );

  const togglePin = useCallback(
    (sectionId: SidebarSectionId) => {
      setPinnedSections((prev) => {
        const next = new Set(prev);
        if (next.has(sectionId)) {
          next.delete(sectionId);
        } else {
          next.add(sectionId);
          // Ensure the section is expanded when pinned
          setExpandedSections((prevExp) => {
            if (prevExp.has(sectionId)) return prevExp;
            const nextExp = new Set(prevExp);
            nextExp.add(sectionId);
            return nextExp;
          });
        }
        saveToStorage(PINNED_SECTIONS_KEY, [...next]);
        return next;
      });
    },
    [setPinnedSections, setExpandedSections]
  );

  return { expandedSections, pinnedSections, pinnedSectionCollapsed, toggleSection, togglePin };
}

/** Open/closed state of nested groups; it resets whenever the route changes. */
export function useGroupExpansion(pathname: string) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [groupPathname, setGroupPathname] = useState(pathname);
  if (groupPathname !== pathname) {
    setGroupPathname(pathname);
    setExpandedGroups({});
  }
  return { expandedGroups, setExpandedGroups };
}
