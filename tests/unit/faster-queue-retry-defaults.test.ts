import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_API_LIMITS,
  OPT_IN_MIN_TIME_BETWEEN_REQUESTS_MS,
} from "../../open-sse/config/constants.ts";
import { BaseExecutor } from "../../open-sse/executors/base.ts";
import { DefaultExecutor } from "../../open-sse/executors/default.ts";
import {
  DEFAULT_RESILIENCE_SETTINGS,
  effectiveRequestQueueSnapshot,
  resolveResilienceSettings,
} from "../../src/lib/resilience/settings.ts";
import { shouldTripProviderBreakerForResult } from "../../src/sse/handlers/chatPredicates.ts";

test("the request gap stays 350 and hintless failover stays off unless the operator opts in", () => {
  assert.equal(DEFAULT_API_LIMITS.minTimeBetweenRequests, 350);
  assert.equal(OPT_IN_MIN_TIME_BETWEEN_REQUESTS_MS, 100);
  assert.equal(DEFAULT_RESILIENCE_SETTINGS.requestQueue.minTimeBetweenRequestsMs, 350);
  assert.equal(DEFAULT_RESILIENCE_SETTINGS.requestQueue.failoverHintless429, false);

  const fresh = resolveResilienceSettings({});
  assert.equal(fresh.requestQueue.minTimeBetweenRequestsMs, 350);
  assert.equal(fresh.requestQueue.failoverHintless429, false);
  assert.deepEqual(effectiveRequestQueueSnapshot({}), {
    minTimeBetweenRequestsMs: 350,
    failoverHintless429: false,
  });

  const optedIn = resolveResilienceSettings({
    resilienceSettings: {
      requestQueue: { minTimeBetweenRequestsMs: 100, failoverHintless429: true },
    },
  });
  assert.equal(optedIn.requestQueue.minTimeBetweenRequestsMs, 100);
  assert.equal(optedIn.requestQueue.failoverHintless429, true);
});

async function execute429(input: {
  deferHintless429?: boolean;
  resolveDeferHintless429?: () => Promise<boolean>;
  responses: () => Response;
  delayMs?: number;
}) {
  const originalFetch = globalThis.fetch;
  const originalDelay = BaseExecutor.RETRY_CONFIG.delayMs;
  let calls = 0;
  if (input.delayMs !== undefined) {
    (BaseExecutor.RETRY_CONFIG as { delayMs: number }).delayMs = input.delayMs;
  }
  globalThis.fetch = (async () => {
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
      resolveDeferHintless429: input.resolveDeferHintless429,
    });
    return {
      status: result.response.status,
      body: await result.response.text(),
      calls,
      elapsed: Date.now() - started,
    };
  } finally {
    globalThis.fetch = originalFetch;
    (BaseExecutor.RETRY_CONFIG as { delayMs: number }).delayMs = originalDelay;
  }
}

function hintless429() {
  return new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429 });
}

test("a hintless 429 still retries the same key when deferral is off", async () => {
  const absent = await execute429({ responses: hintless429, delayMs: 0 });
  assert.equal(absent.calls, 1 + BaseExecutor.RETRY_CONFIG.maxAttempts);
  const declined = await execute429({
    responses: hintless429,
    delayMs: 0,
    resolveDeferHintless429: async () => false,
  });
  assert.equal(declined.calls, 1 + BaseExecutor.RETRY_CONFIG.maxAttempts);
});

test("a live resolver that accepts at 429 time returns one upstream 429", async () => {
  const { status, body, calls } = await execute429({
    responses: hintless429,
    delayMs: 0,
    resolveDeferHintless429: async () => true,
  });
  assert.equal(status, 429);
  assert.match(body, /rate limited/);
  assert.equal(calls, 1);
  assert.equal(
    shouldTripProviderBreakerForResult({ status: 429, error: "rate limited" }, false, false),
    false
  );
});

test("a RetryInfo body hint is waited and the deferral resolver is not called", async () => {
  let asked = 0;
  let step = 0;
  const { status, calls, elapsed } = await execute429({
    resolveDeferHintless429: async () => {
      asked += 1;
      return true;
    },
    responses: () => {
      step += 1;
      if (step === 1) {
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: "slow down",
              status: "RESOURCE_EXHAUSTED",
              details: [
                { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "0.25s" },
              ],
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });
  assert.equal(asked, 0);
  assert.equal(status, 200);
  assert.equal(calls, 2);
  assert.ok(elapsed >= 180, `elapsed ${elapsed}`);
  assert.ok(elapsed < 900, `elapsed ${elapsed}`);
});

test("concurrent executors that are told not to defer each keep the same-key retry", async () => {
  const originalFetch = globalThis.fetch;
  const originalDelay = BaseExecutor.RETRY_CONFIG.delayMs;
  (BaseExecutor.RETRY_CONFIG as { delayMs: number }).delayMs = 0;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return hintless429();
  }) as typeof fetch;
  try {
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        new DefaultExecutor("openai").execute({
          model: "gpt-4o-mini",
          body: { messages: [{ role: "user", content: "hi" }] },
          stream: false,
          credentials: { apiKey: "synthetic-key", connectionId: "conn-a" },
          resolveDeferHintless429: async () => false,
        })
      )
    );
    assert.equal(results.length, 6);
    for (const result of results) assert.equal(result.response.status, 429);
    assert.equal(calls, 6 * (1 + BaseExecutor.RETRY_CONFIG.maxAttempts));
  } finally {
    globalThis.fetch = originalFetch;
    (BaseExecutor.RETRY_CONFIG as { delayMs: number }).delayMs = originalDelay;
  }
});
