/**
 * Opt-in per-stage timers for the chat benchmark.
 *
 * Off unless `OMNIROUTE_STAGE_TIMING=1` is set before this module is first
 * imported. The default path is a null check and then the original function,
 * so request results do not change when the flag is absent.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { performance } from "node:perf_hooks";

export interface StageSpan {
  stage: string;
  /** Inclusive duration of this span. Nested spans are also recorded. */
  ms: number;
  /** `performance.now()` when the span started. */
  at: number;
}

interface Store {
  spans: StageSpan[];
}

interface Slot {
  enabled: boolean;
  storage: AsyncLocalStorage<Store> | null;
}

const SLOT = Symbol.for("omniroute.stageTiming.v1");

function slot(): Slot {
  const host = globalThis as typeof globalThis & { [SLOT]?: Slot };
  if (!host[SLOT]) {
    const enabled = process.env.OMNIROUTE_STAGE_TIMING === "1";
    host[SLOT] = {
      enabled,
      storage: enabled ? new AsyncLocalStorage<Store>() : null,
    };
  }
  return host[SLOT];
}

const storage = slot().storage;

export function stageTimingEnabled(): boolean {
  return slot().enabled;
}

export function runWithStageTiming<T>(fn: () => Promise<T>): Promise<T> {
  if (!storage) return fn();
  return storage.run({ spans: [] }, fn);
}

export async function timeStage<T>(stage: string, fn: () => Promise<T> | T): Promise<T> {
  if (!storage) return fn();
  const store = storage.getStore();
  if (!store) return fn();
  const at = performance.now();
  try {
    return await fn();
  } finally {
    store.spans.push({ stage, ms: performance.now() - at, at });
  }
}

export function timeStageSync<T>(stage: string, fn: () => T): T {
  if (!storage) return fn();
  const store = storage.getStore();
  if (!store) return fn();
  const at = performance.now();
  try {
    return fn();
  } finally {
    store.spans.push({ stage, ms: performance.now() - at, at });
  }
}

export function takeStageSpans(): StageSpan[] {
  const store = storage?.getStore();
  if (!store) return [];
  return store.spans.splice(0, store.spans.length);
}
