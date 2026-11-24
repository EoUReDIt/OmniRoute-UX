import { useEffect, useState } from "react";
import {
  HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY,
  normalizeHiddenSidebarGroupLabels,
} from "@/shared/constants/sidebarGroupVisibility";
import {
  HIDDEN_SIDEBAR_ITEMS_SETTING_KEY,
  HIDDEN_SIDEBAR_SECTIONS_SETTING_KEY,
  SIDEBAR_SETTINGS_UPDATED_EVENT,
  SIDEBAR_SECTION_ORDER_KEY,
  SIDEBAR_ITEM_ORDER_KEY,
  normalizeHiddenSidebarItems,
  normalizeHiddenSidebarSections,
  type SidebarSectionId,
  type SidebarItemOrder,
} from "@/shared/constants/sidebarVisibility";

type Setter<T> = (value: T | ((previous: T) => T)) => void;

type SettingsSetters = {
  setShowDebug: Setter<boolean>;
  setHiddenSidebarItems: Setter<string[]>;
  setHiddenSidebarSections: Setter<SidebarSectionId[]>;
  setHiddenSidebarGroupLabels: Setter<string[]>;
  setFeatureFlags: Setter<Record<string, boolean>>;
  setRadarAdminUrl: Setter<unknown>;
  setSidebarSectionOrder: Setter<SidebarSectionId[]>;
  setSidebarItemOrder: Setter<SidebarItemOrder>;
  setCustomAppName: Setter<string | null>;
  setCustomLogo: Setter<string | null>;
};

function applySettings(data: any, s: SettingsSetters) {
  s.setShowDebug(data?.debugMode === true);
  s.setHiddenSidebarItems(normalizeHiddenSidebarItems(data?.[HIDDEN_SIDEBAR_ITEMS_SETTING_KEY]));
  s.setHiddenSidebarSections(
    normalizeHiddenSidebarSections(data?.[HIDDEN_SIDEBAR_SECTIONS_SETTING_KEY])
  );
  s.setHiddenSidebarGroupLabels(
    normalizeHiddenSidebarGroupLabels(data?.[HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY])
  );
  s.setCustomAppName(data?.instanceName || null);
  s.setCustomLogo(data?.customLogoBase64 || data?.customLogoUrl || null);
  if (typeof data?.radarEnabled === "boolean") {
    s.setFeatureFlags((prev) => ({ ...prev, RADAR_ENABLED: data.radarEnabled }));
  }
  s.setRadarAdminUrl(data?.radarAdminUrl ?? null);
}

function applyOrderSettings(data: any, s: SettingsSetters) {
  if (Array.isArray(data?.[SIDEBAR_SECTION_ORDER_KEY])) {
    s.setSidebarSectionOrder(data[SIDEBAR_SECTION_ORDER_KEY] as SidebarSectionId[]);
  }
  if (data?.[SIDEBAR_ITEM_ORDER_KEY] && typeof data[SIDEBAR_ITEM_ORDER_KEY] === "object") {
    s.setSidebarItemOrder(data[SIDEBAR_ITEM_ORDER_KEY] as SidebarItemOrder);
  }
}

function applyVisibilityEvent(detail: Record<string, unknown>, s: SettingsSetters) {
  if ("debugMode" in detail) s.setShowDebug(detail.debugMode === true);
  if (HIDDEN_SIDEBAR_ITEMS_SETTING_KEY in detail) {
    s.setHiddenSidebarItems(normalizeHiddenSidebarItems(detail[HIDDEN_SIDEBAR_ITEMS_SETTING_KEY]));
  }
  if (HIDDEN_SIDEBAR_SECTIONS_SETTING_KEY in detail) {
    s.setHiddenSidebarSections(
      normalizeHiddenSidebarSections(detail[HIDDEN_SIDEBAR_SECTIONS_SETTING_KEY])
    );
  }
  if (HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY in detail) {
    s.setHiddenSidebarGroupLabels(
      normalizeHiddenSidebarGroupLabels(detail[HIDDEN_SIDEBAR_GROUP_LABELS_SETTING_KEY])
    );
  }
}

function applyOrderEvent(detail: Record<string, unknown>, s: SettingsSetters) {
  if (SIDEBAR_SECTION_ORDER_KEY in detail && Array.isArray(detail[SIDEBAR_SECTION_ORDER_KEY])) {
    s.setSidebarSectionOrder(detail[SIDEBAR_SECTION_ORDER_KEY] as SidebarSectionId[]);
  }
  if (
    SIDEBAR_ITEM_ORDER_KEY in detail &&
    detail[SIDEBAR_ITEM_ORDER_KEY] &&
    typeof detail[SIDEBAR_ITEM_ORDER_KEY] === "object"
  ) {
    s.setSidebarItemOrder(detail[SIDEBAR_ITEM_ORDER_KEY] as SidebarItemOrder);
  }
}

function applyBrandEvent(detail: Record<string, unknown>, s: SettingsSetters) {
  if ("instanceName" in detail) s.setCustomAppName((detail.instanceName as string) || null);
  if ("customLogoBase64" in detail) {
    s.setCustomLogo((detail.customLogoBase64 as string) || null);
  } else if ("customLogoUrl" in detail) {
    s.setCustomLogo((detail.customLogoUrl as string) || null);
  }
}

/** Persisted sidebar preferences from /api/settings, kept live by the settings-updated event. */
export function useSidebarSettings() {
  const [showDebug, setShowDebug] = useState(false);
  const [hiddenSidebarItems, setHiddenSidebarItems] = useState<string[]>([]);
  const [hiddenSidebarSections, setHiddenSidebarSections] = useState<SidebarSectionId[]>([]);
  const [hiddenSidebarGroupLabels, setHiddenSidebarGroupLabels] = useState<string[]>([]);
  // Feature-flag map for flag-gated items (e.g. "radar" -> RADAR_ENABLED).
  // Fails open (see isSidebarItemVisibleForFlags) so a missing key never
  // hides an unrelated item — only set once /api/settings resolves.
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [radarAdminUrl, setRadarAdminUrl] = useState<unknown>(null);
  const [sidebarSectionOrder, setSidebarSectionOrder] = useState<SidebarSectionId[]>([]);
  const [sidebarItemOrder, setSidebarItemOrder] = useState<SidebarItemOrder>({});
  const [customAppName, setCustomAppName] = useState<string | null>(null);
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    const setters: SettingsSetters = {
      setShowDebug,
      setHiddenSidebarItems,
      setHiddenSidebarSections,
      setHiddenSidebarGroupLabels,
      setFeatureFlags,
      setRadarAdminUrl,
      setSidebarSectionOrder,
      setSidebarItemOrder,
      setCustomAppName,
      setCustomLogo,
    };

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        applySettings(data, setters);
        applyOrderSettings(data, setters);
      })
      .catch(() => {});

    const handleSettingsUpdated = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail || {};
      applyVisibilityEvent(detail, setters);
      applyOrderEvent(detail, setters);
      applyBrandEvent(detail, setters);
    };

    window.addEventListener(SIDEBAR_SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
    return () =>
      window.removeEventListener(
        SIDEBAR_SETTINGS_UPDATED_EVENT,
        handleSettingsUpdated as EventListener
      );
  }, []);

  return {
    showDebug,
    hiddenSidebarItems,
    hiddenSidebarSections,
    hiddenSidebarGroupLabels,
    featureFlags,
    radarAdminUrl,
    sidebarSectionOrder,
    sidebarItemOrder,
    customAppName,
    customLogo,
  };
}
