import type { SidebarSectionId } from "@/shared/constants/sidebarVisibility";

export const DEFAULT_EXPANDED: SidebarSectionId = "omni-proxy";
export const EXPANDED_SECTIONS_KEY = "sidebar-expanded-sections";
export const PINNED_SECTIONS_KEY = "sidebar-pinned-sections";

export function parseStoredArray<T>(raw: string | null, fallback: T): T {
  try {
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T;
    }
  } catch {}
  return fallback;
}

export function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// useSyncExternalStore plumbing for the one-shot localStorage hydration reads:
// nothing to subscribe to (the values are only read once, before
// sidebarExpansionLoaded flips), and the server snapshot is always null so the
// SSR/hydration render matches the server output.
export const noopSubscribe = () => () => {};
export const getServerSnapshotNull = () => null;
export const getHydratedSnapshot = () => true;
export const getServerHydratedSnapshot = () => false;

export function readStoredExpandedRaw() {
  try {
    return localStorage.getItem(EXPANDED_SECTIONS_KEY);
  } catch {
    return null;
  }
}

export function readStoredPinnedRaw() {
  try {
    return localStorage.getItem(PINNED_SECTIONS_KEY);
  } catch {
    return null;
  }
}
