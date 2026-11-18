import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_API_LIMITS,
  LEGACY_MIN_TIME_BETWEEN_REQUESTS_MS,
} from "../../open-sse/config/constants.ts";
import { BaseExecutor } from "../../open-sse/executors/base.ts";
import { DefaultExecutor } from "../../open-sse/executors/default.ts";
import {
  DEFAULT_RESILIENCE_SETTINGS,
  resolveResilienceSettings,
} from "../../src/lib/resilience/settings.ts";

test("proposed queue defaults are 100ms and hintless-429 failover, with the old values restorable", () => {
  assert.equal(DEFAULT_API_LIMITS.minTimeBetweenRequests, 100);
  assert.equal(LEGACY_MIN_TIME_BETWEEN_REQUESTS_MS, 350);
  assert.equal(DEFAULT_RESILIENCE_SETTINGS.requestQueue.minTimeBetweenRequestsMs, 100);
  assert.equal(DEFAULT_RESILIENCE_SETTINGS.requestQueue.failoverHintless429, true);
  assert.equal(DEFAULT_RESILIENCE_SETTINGS.requestQueue.requestsPerMinute, 60);
  assert.equal(DEFAULT_RESILIENCE_SETTINGS.requestQueue.concurrentRequests, 6);

  const fresh = resolveResilienceSettings({});
  assert.equal(fresh.requestQueue.minTimeBetweenRequestsMs, 100);
  assert.equal(fresh.requestQueue.failoverHintless429, true);

  const restored = resolveResilienceSettings({
    resilienceSettings: {
      requestQueue: { minTimeBetweenRequestsMs: 350, failoverHintless429: false },
    },
  });
  assert.equal(restored.requestQueue.minTimeBetweenRequestsMs, 350);
  assert.equal(restored.requestQueue.failoverHintless429, false);
  assert.equal(restored.requestQueue.requestsPerMinute, DEFAULT_API_LIMITS.requestsPerMinute);
});

async function execute429(input: {
  deferHintless429?: boolean;
  responses: () => Response;
  delayMs?: number;
}) {
  const originalFetch = globalThis.fetch;
  const originalDelay = BaseExecutor.RETRY_CONFIG.delayMs;
  let calls = 0;
  const at: number[] = [];
  if (input.delayMs !== undefined) {
    (BaseExecutor.RETRY_CONFIG as { delayMs: number }).delayMs = input.delayMs;
  }
  globalThis.fetch = (async () => {
    at.push(Date.now());
    calls += 1;
    return input.responses();
  }) as typeof fetch;
  const started = Date.now();
  try {
    const result = await new DefaultExecutor("openai").execute({
      model: "gpt-4o-mini",
      body: { messages: [{ role: "user", content: "hi" }] },
      stream: false,
      credentials: { apiKey: "synthetic-key", connectionId: "conn-a" },
      deferHintless429: input.deferHintless429,
    });
    return { status: result.response.status, calls, at, elapsed: Date.now() - started };
  } finally {
    globalThis.fetch = originalFetch;
    (BaseExecutor.RETRY_CONFIG as { delayMs: number }).delayMs = originalDelay;
  }
}

function hintless429() {
  return new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429 });
}

test("a hintless 429 still retries the same key when no alternate is declared", async () => {
  const absent = await execute429({ responses: hintless429, delayMs: 0 });
  assert.equal(absent.calls, 1 + BaseExecutor.RETRY_CONFIG.maxAttempts);
  const explicit = await execute429({
    responses: hintless429,
    delayMs: 0,
    deferHintless429: false,
  });
  assert.equal(explicit.calls, 1 + BaseExecutor.RETRY_CONFIG.maxAttempts);
});

test("a hintless 429 is returned after one call when an alternate was declared", async () => {
  const { status, calls } = await execute429({
    responses: hintless429,
    delayMs: 0,
    deferHintless429: true,
  });
  assert.equal(status, 429);
  assert.equal(calls, 1);
});

test("Retry-After inside the retry window is waited even when an alternate was declared", async () => {
  let step = 0;
  const { status, calls, elapsed } = await execute429({
    deferHintless429: true,
    responses: () => {
      step += 1;
      if (step === 1) {
        return new Response(JSON.stringify({ error: { message: "slow down" } }), {
          status: 429,
          headers: { "retry-after": "0.25" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });
  assert.equal(status, 200);
  assert.equal(calls, 2);
  assert.ok(elapsed >= 180, `expected the 250ms Retry-After to be honored, elapsed ${elapsed}ms`);
  assert.ok(
    elapsed < 900,
    `expected not to fall back to the 2000ms same-key delay, elapsed ${elapsed}ms`
  );
});
