/**
 * Per-stage latency of a real chat request through handleChat / the chat route.
 *
 * The mock upstream is a local HTTP server with a fixed sleep before headers.
 * Gateway time is what remains after that sleep. A 429 scenario keeps the
 * executor's real intra-retry delay. Nothing here is on unless this process
 * sets OMNIROUTE_STAGE_TIMING=1 before the app modules load.
 *
 *   node --import tsx/esm scripts/perf/chat-stage-latency.ts
 *   node --import tsx/esm scripts/perf/chat-stage-latency.ts --cold-once
 *   node --import tsx/esm scripts/perf/chat-stage-latency.ts --policy-compare
 *
 * --policy-compare measures the proposed defaults (100ms gap, hintless-429
 * failover) against the previous ones (350ms gap, always same-key retry).
 * It does not run the cold-process or live-provider probes.
 *
 * Prints one JSON document on stdout. Human-readable lines go to stderr.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { performance } from "node:perf_hooks";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

process.env.OMNIROUTE_STAGE_TIMING = "1";
process.env.REQUIRE_API_KEY = "true";
process.env.DASHBOARD_PASSWORD = "";
process.env.INITIAL_PASSWORD = "";
delete process.env.JWT_SECRET;
if (!process.env.API_KEY_SECRET) {
  process.env.API_KEY_SECRET = "stage-latency-bench-secret";
}
process.env.APP_LOG_LEVEL = process.env.APP_LOG_LEVEL || "error";
console.log = (...args: unknown[]) => {
  console.error(...args);
};

const MOCK_DELAY_MS = 200;
const SUCCESS_WARM = 24;
const STREAM_N = 8;
const FALLBACK_N = 8;
const RATE_LIMIT_N = 5;
const COLD_PROCESSES = 2;

interface StageSpan {
  stage: string;
  ms: number;
  at: number;
}

interface Hop {
  status: number;
  ttfbMs: number;
  at: number;
  sleepMs: number;
}

interface Sample {
  scenario: string;
  ok: boolean;
  status: number;
  totalMs: number;
  bodyMs: number;
  firstByteMs: number | null;
  hops: Hop[];
  spans: StageSpan[];
  error?: string;
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return round(sorted[index]);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function summarize(values: number[]) {
  return {
    n: values.length,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    min: values.length ? round(Math.min(...values)) : null,
    max: values.length ? round(Math.max(...values)) : null,
  };
}

interface MockBehavior {
  status: number;
  delayMs: number;
  body?: unknown;
  stream?: boolean;
  retryAfter?: string;
  /** Used for every request after the first for this token. */
  followedBy?: { status: number; delayMs: number; retryAfter?: string };
  /** Shared provider window. The request that exceeds maxPerWindow is a 429 with no Retry-After. */
  burst?: {
    id: string;
    maxPerWindow: number;
    windowMs: number;
    okDelayMs: number;
    limitDelayMs: number;
  };
}

async function startMock(): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
  setBehavior: (token: string, behavior: MockBehavior) => void;
  resetSequences: () => void;
  takeUpstreamCounts: () => Record<string, number>;
}> {
  const behaviors = new Map<string, MockBehavior>();
  const tokenHits = new Map<string, number>();
  const burstHits = new Map<string, number[]>();
  const upstreamCounts: Record<string, number> = {};
  const server = createServer((req, res) => {
    void handle(req, res);
  });

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const token = String(req.headers.authorization || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    if (req.method === "GET" && (req.url || "").startsWith("/v1/models")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "test-model" }] }));
      return;
    }
    const behavior = behaviors.get(token);
    if (!behavior) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "unknown token" } }));
      return;
    }
    const hit = tokenHits.get(token) ?? 0;
    tokenHits.set(token, hit + 1);
    let status = behavior.status;
    let delayMs = behavior.delayMs;
    let retryAfter = behavior.retryAfter;
    if (hit > 0 && behavior.followedBy) {
      status = behavior.followedBy.status;
      delayMs = behavior.followedBy.delayMs;
      retryAfter = behavior.followedBy.retryAfter;
    }
    const burst = behavior.burst;
    if (burst) {
      const now = Date.now();
      const previous = burstHits.get(burst.id) ?? [];
      const recent = previous.filter((at) => now - at < burst.windowMs);
      recent.push(now);
      burstHits.set(burst.id, recent);
      const limited = recent.length > burst.maxPerWindow;
      status = limited ? 429 : 200;
      delayMs = limited ? burst.limitDelayMs : burst.okDelayMs;
      retryAfter = undefined;
    }
    upstreamCounts[String(status)] = (upstreamCounts[String(status)] ?? 0) + 1;
    const slept = performance.now();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    const sleepMs = performance.now() - slept;
    const raw = Buffer.concat(chunks).toString("utf8");
    let stream = false;
    try {
      stream = JSON.parse(raw).stream === true;
    } catch {
      stream = false;
    }
    if (behavior.stream && stream && behavior.status === 200) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "x-mock-sleep-ms": String(Math.round(sleepMs)),
      });
      res.write(
        `data: ${JSON.stringify({
          choices: [{ index: 0, delta: { content: "hi" } }],
        })}\n\n`
      );
      await new Promise((resolve) => setTimeout(resolve, 30));
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-mock-sleep-ms": String(Math.round(sleepMs)),
    };
    if (retryAfter) headers["retry-after"] = retryAfter;
    res.writeHead(status, headers);
    res.end(
      JSON.stringify(
        behavior.body ??
          (status === 200
            ? {
                id: "chatcmpl_bench",
                object: "chat.completion",
                model: "test-model",
                choices: [
                  {
                    index: 0,
                    message: { role: "assistant", content: "ok" },
                    finish_reason: "stop",
                  },
                ],
                usage: { prompt_tokens: 4, completion_tokens: 1, total_tokens: 5 },
              }
            : { error: { message: `bench status ${status}` } })
      )
    );
  }

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("mock listen failed");
  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    setBehavior: (token, behavior) => behaviors.set(token, behavior),
    resetSequences: () => {
      tokenHits.clear();
      burstHits.clear();
      for (const key of Object.keys(upstreamCounts)) delete upstreamCounts[key];
    },
    takeUpstreamCounts: () => ({ ...upstreamCounts }),
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
      }),
  };
}

async function readBody(response: Response, started: number) {
  if (!response.body) return { bodyMs: 0, firstByteMs: null as number | null };
  const reader = response.body.getReader();
  let firstByteMs: number | null = null;
  while (true) {
    const chunk = await reader.read();
    if (firstByteMs === null && !chunk.done) firstByteMs = performance.now() - started;
    if (chunk.done) break;
  }
  return { bodyMs: performance.now() - started, firstByteMs };
}

const POLICY_WARM_N = 24;
const POLICY_ALT_N = 8;
const POLICY_SOLO_N = 6;
const POLICY_RETRY_AFTER_N = 4;
const POLICY_BURST_N = 12;
const POLICY_SHARED_BURST_N = 6;
const POLICY_BURST_MAX_PER_WINDOW = 5;
const POLICY_BURST_WINDOW_MS = 1000;

async function runPolicyCompare(input: {
  mock: Awaited<ReturnType<typeof startMock>>;
  providersDb: {
    createProviderNode: (data: Record<string, unknown>) => Promise<unknown>;
    createProviderConnection: (data: Record<string, unknown>) => Promise<{ id: string }>;
    updateProviderConnection: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  };
  once: (scenario: string, model: string, stream?: boolean, content?: string) => Promise<Sample>;
  POST: (request: Request) => Promise<Response>;
  resetAllCircuitBreakers: () => void;
}) {
  const started = performance.now();
  const { mock, providersDb, once, POST, resetAllCircuitBreakers } = input;
  const resilience = await import("../../src/lib/resilience/settings.ts");
  const settingsDb = await import("../../src/lib/db/settings.ts");
  const rateLimitManager = await import("../../open-sse/services/rateLimitManager.ts");
  const { clearAllModelLockouts } = await import("../../open-sse/services/accountFallback.ts");
  const createdNodes = new Set<string>();

  async function seed(prefix: string, token: string, priority: number, email?: string) {
    const providerId = `openai-compatible-chat-bench-${prefix}`;
    if (!createdNodes.has(providerId)) {
      createdNodes.add(providerId);
      await providersDb.createProviderNode({
        id: providerId,
        type: "openai-compatible",
        name: `Bench ${prefix}`,
        prefix,
        apiType: "chat",
        baseUrl: mock.baseUrl,
      });
    }
    const connection = await providersDb.createProviderConnection({
      provider: providerId,
      authType: "apikey",
      name: `conn-${prefix}-${priority}-${token}`,
      apiKey: token,
      isActive: true,
      testStatus: "active",
      ...(email ? { email } : {}),
      priority,
      providerSpecificData: { baseUrl: mock.baseUrl, apiType: "chat" },
    });
    if (!connection?.id) throw new Error(`seed ${prefix} did not return a connection id`);
    return { model: `${prefix}/test-model`, connectionId: connection.id };
  }

  async function usePolicy(requestQueuePatch: {
    minTimeBetweenRequestsMs: number;
    failoverHintless429: boolean;
  }) {
    const requestQueue = {
      ...resilience.DEFAULT_RESILIENCE_SETTINGS.requestQueue,
      ...requestQueuePatch,
    };
    await settingsDb.updateSettings({
      resilienceSettings: {
        ...resilience.DEFAULT_RESILIENCE_SETTINGS,
        requestQueue,
      },
    });
    await rateLimitManager.applyRequestQueueSettings(requestQueue);
  }

  async function revive(connectionIds: string[]) {
    clearAllModelLockouts();
    for (const id of connectionIds) {
      await providersDb.updateProviderConnection(id, {
        rateLimitedUntil: null,
        backoffLevel: 0,
        testStatus: "active",
        isActive: true,
      });
    }
    resetAllCircuitBreakers();
    mock.resetSequences();
  }

  function count429(samples: Sample[]) {
    return samples.reduce(
      (sum, sample) => sum + sample.hops.filter((hop) => hop.status === 429).length,
      0
    );
  }

  function hopGaps(samples: Sample[]) {
    const values: number[] = [];
    for (const sample of samples) {
      for (let i = 1; i < sample.hops.length; i++) {
        const previous = sample.hops[i - 1];
        values.push(round(sample.hops[i].at - (previous.at + previous.ttfbMs)));
      }
    }
    return summarize(values);
  }

  function scenarioStats(samples: Sample[]) {
    const ok = samples.filter((sample) => sample.ok);
    return {
      attempted: samples.length,
      ok: ok.length,
      failed: samples.length - ok.length,
      successRate: samples.length === 0 ? null : round(ok.length / samples.length),
      upstream429: count429(samples),
      totalMs: summarize(ok.map((sample) => sample.totalMs)),
      totalMsAll: summarize(samples.map((sample) => sample.totalMs)),
      preUpstreamMs: summarize(
        ok
          .map((sample) => sample.hops[0]?.at)
          .filter((value): value is number => typeof value === "number")
      ),
      hopCount: summarize(samples.map((sample) => sample.hops.length)),
      gapBetweenHopsMs: hopGaps(samples),
    };
  }

  async function postDirect(model: string, content: string) {
    const startedAt = performance.now();
    const response = await POST(
      new Request("http://127.0.0.1/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${await clientKey()}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          stream: false,
        }),
      })
    );
    await readBody(response, startedAt);
    return {
      ok: response.ok,
      status: response.status,
      totalMs: round(performance.now() - startedAt),
    };
  }

  let apiKeyValue = "";
  async function clientKey() {
    if (apiKeyValue) return apiKeyValue;
    const apiKeysDb = await import("../../src/lib/db/apiKeys.ts");
    const created = await apiKeysDb.createApiKey("bench-policy", "machine-bench-policy");
    apiKeyValue = created.key;
    return apiKeyValue;
  }

  const policies = [
    {
      name: "old",
      minTimeBetweenRequestsMs: 350,
      failoverHintless429: false,
    },
    {
      name: "new",
      minTimeBetweenRequestsMs: 100,
      failoverHintless429: true,
    },
  ] as const;

  const results: Record<string, Record<string, unknown>> = {};

  for (const policy of policies) {
    console.error(`[policy-compare] ${policy.name}: seeding`);
    const tag = policy.name;
    const warm = await seed(`pc-${tag}-warm`, `pc-${tag}-warm-ok`, 1);
    const limited = await seed(`pc-${tag}-alt`, `pc-${tag}-alt-429`, 1);
    const backup = await seed(`pc-${tag}-alt`, `pc-${tag}-alt-ok`, 2);
    const solo = await seed(`pc-${tag}-solo`, `pc-${tag}-solo`, 1);
    const burstA = await seed(`pc-${tag}-burst`, `pc-${tag}-burst-a`, 1);
    const burstB = await seed(`pc-${tag}-burst`, `pc-${tag}-burst-b`, 2);
    const sharedA = await seed(
      `pc-${tag}-shared`,
      `pc-${tag}-shared-a`,
      1,
      `shared-${tag}@bench.example`
    );
    const sharedB = await seed(
      `pc-${tag}-shared`,
      `pc-${tag}-shared-b`,
      2,
      `shared-${tag}@bench.example`
    );
    const hinted = await seed(`pc-${tag}-hint`, `pc-${tag}-hint`, 1);

    mock.setBehavior(`pc-${tag}-warm-ok`, { status: 200, delayMs: MOCK_DELAY_MS });
    mock.setBehavior(`pc-${tag}-alt-429`, { status: 429, delayMs: 20 });
    mock.setBehavior(`pc-${tag}-alt-ok`, { status: 200, delayMs: MOCK_DELAY_MS });
    mock.setBehavior(`pc-${tag}-solo`, {
      status: 429,
      delayMs: 20,
      followedBy: { status: 200, delayMs: MOCK_DELAY_MS },
    });
    mock.setBehavior(`pc-${tag}-burst-a`, {
      status: 200,
      delayMs: 30,
      burst: {
        id: `burst-${tag}`,
        maxPerWindow: POLICY_BURST_MAX_PER_WINDOW,
        windowMs: POLICY_BURST_WINDOW_MS,
        okDelayMs: 30,
        limitDelayMs: 5,
      },
    });
    mock.setBehavior(`pc-${tag}-burst-b`, {
      status: 200,
      delayMs: 30,
      burst: {
        id: `burst-${tag}`,
        maxPerWindow: POLICY_BURST_MAX_PER_WINDOW,
        windowMs: POLICY_BURST_WINDOW_MS,
        okDelayMs: 30,
        limitDelayMs: 5,
      },
    });
    const sharedBurst = {
      id: `shared-${tag}`,
      maxPerWindow: POLICY_BURST_MAX_PER_WINDOW,
      windowMs: POLICY_BURST_WINDOW_MS,
      okDelayMs: 30,
      limitDelayMs: 5,
    };
    mock.setBehavior(`pc-${tag}-shared-a`, { status: 200, delayMs: 30, burst: sharedBurst });
    mock.setBehavior(`pc-${tag}-shared-b`, { status: 200, delayMs: 30, burst: sharedBurst });
    mock.setBehavior(`pc-${tag}-hint`, {
      status: 429,
      delayMs: 20,
      retryAfter: "1",
      followedBy: { status: 200, delayMs: MOCK_DELAY_MS },
    });

    await usePolicy({
      minTimeBetweenRequestsMs: policy.minTimeBetweenRequestsMs,
      failoverHintless429: policy.failoverHintless429,
    });

    console.error(`[policy-compare] ${policy.name}: warm n=${POLICY_WARM_N}`);
    const warmSamples: Sample[] = [];
    for (let i = 0; i < POLICY_WARM_N; i++) {
      warmSamples.push(await once("warm-success", warm.model, false, `warm ${tag} ${i}`));
    }

    console.error(`[policy-compare] ${policy.name}: 429 with alternate n=${POLICY_ALT_N}`);
    const altSamples: Sample[] = [];
    for (let i = 0; i < POLICY_ALT_N; i++) {
      await revive([limited.connectionId, backup.connectionId]);
      altSamples.push(await once("429-with-alternate", limited.model, false, `alt ${tag} ${i}`));
    }

    console.error(`[policy-compare] ${policy.name}: 429 without alternate n=${POLICY_SOLO_N}`);
    const soloSamples: Sample[] = [];
    for (let i = 0; i < POLICY_SOLO_N; i++) {
      await revive([solo.connectionId]);
      soloSamples.push(await once("429-without-alternate", solo.model, false, `solo ${tag} ${i}`));
    }

    console.error(`[policy-compare] ${policy.name}: Retry-After n=${POLICY_RETRY_AFTER_N}`);
    const hintSamples: Sample[] = [];
    for (let i = 0; i < POLICY_RETRY_AFTER_N; i++) {
      await revive([hinted.connectionId]);
      hintSamples.push(await once("retry-after", hinted.model, false, `hint ${tag} ${i}`));
    }

    console.error(`[policy-compare] ${policy.name}: burst n=${POLICY_BURST_N}`);
    await revive([burstA.connectionId, burstB.connectionId]);
    await clientKey();
    const beforeCounts = mock.takeUpstreamCounts();
    const burstRows = await Promise.all(
      Array.from({ length: POLICY_BURST_N }, (_, i) =>
        postDirect(burstA.model, `burst ${tag} ${i} ${started}`)
      )
    );
    const afterCounts = mock.takeUpstreamCounts();
    const burstOk = burstRows.filter((row) => row.ok);
    const upstream429 = Math.max(0, (afterCounts["429"] ?? 0) - (beforeCounts["429"] ?? 0));
    const upstream200 = Math.max(0, (afterCounts["200"] ?? 0) - (beforeCounts["200"] ?? 0));

    console.error(`[policy-compare] ${policy.name}: shared-email burst n=${POLICY_SHARED_BURST_N}`);
    await revive([sharedA.connectionId, sharedB.connectionId]);
    const beforeShared = mock.takeUpstreamCounts();
    const sharedRows = await Promise.all(
      Array.from({ length: POLICY_SHARED_BURST_N }, (_, i) =>
        postDirect(sharedA.model, `shared ${tag} ${i} ${started}`)
      )
    );
    const afterShared = mock.takeUpstreamCounts();
    const sharedOk = sharedRows.filter((row) => row.ok);

    results[policy.name] = {
      settings: {
        minTimeBetweenRequestsMs: policy.minTimeBetweenRequestsMs,
        failoverHintless429: policy.failoverHintless429,
        sameKeyRetryDelayMs: 2000,
        sameKeyMaxAttempts: 2,
      },
      warmSuccess: scenarioStats(warmSamples),
      first429WithAlternate: scenarioStats(altSamples),
      first429WithoutAlternate: scenarioStats(soloSamples),
      retryAfterHonored: scenarioStats(hintSamples),
      burstAboveFivePerSecond: {
        attempted: burstRows.length,
        ok: burstOk.length,
        failed: burstRows.length - burstOk.length,
        successRate: round(burstOk.length / burstRows.length),
        upstream429,
        upstream200,
        maxPerWindow: POLICY_BURST_MAX_PER_WINDOW,
        windowMs: POLICY_BURST_WINDOW_MS,
        keys: 2,
        totalMs: summarize(burstOk.map((row) => row.totalMs)),
        totalMsAll: summarize(burstRows.map((row) => row.totalMs)),
        statuses: burstRows.map((row) => row.status),
      },
      burstSharedEmail: {
        attempted: sharedRows.length,
        ok: sharedOk.length,
        failed: sharedRows.length - sharedOk.length,
        successRate: round(sharedOk.length / sharedRows.length),
        upstream429: Math.max(0, (afterShared["429"] ?? 0) - (beforeShared["429"] ?? 0)),
        upstream200: Math.max(0, (afterShared["200"] ?? 0) - (beforeShared["200"] ?? 0)),
        keys: 2,
        sharedEmail: true,
        totalMs: summarize(sharedOk.map((row) => row.totalMs)),
        totalMsAll: summarize(sharedRows.map((row) => row.totalMs)),
      },
    };
    void burstB;
  }

  return {
    kind: "policy-compare",
    measuredAt: new Date().toISOString(),
    elapsedMs: round(performance.now() - started),
    machine: { node: process.version, platform: process.platform, arch: process.arch },
    mockDelayMs: MOCK_DELAY_MS,
    n: {
      warmSuccess: POLICY_WARM_N,
      first429WithAlternate: POLICY_ALT_N,
      first429WithoutAlternate: POLICY_SOLO_N,
      retryAfterHonored: POLICY_RETRY_AFTER_N,
      burst: POLICY_BURST_N,
      burstSharedEmail: POLICY_SHARED_BURST_N,
    },
    proposal: {
      minTimeBetweenRequestsMs: { old: 350, new: 100 },
      failoverHintless429: { old: false, new: true },
      sameKeyRetryUnchanged: { maxAttempts: 2, delayMs: 2000 },
    },
    policies: results,
    notes: [
      "old is the shipped default: minTimeBetweenRequestsMs 350 and failoverHintless429 false.",
      "new is the opt-in proposal: minTimeBetweenRequestsMs 100 and failoverHintless429 true. It is not the default.",
      "Hintless failover asks credential selection with the current connection excluded, refuses a sibling that shares an email, org, workspace, account, or project, and does not defer again after the request has already switched accounts.",
      "Same-key RETRY_CONFIG stays maxAttempts 2 and delayMs 2000. Jitter draws from half of delayMs up to delayMs when no Retry-After is present.",
      "first429* samples each clear connection cooldown and model lockouts first, so every sample is a first 429, not a later request that already skipped the bad key.",
      "retryAfterHonored sends Retry-After: 1 on the first upstream response for that sample, then 200. gapBetweenHopsMs is the wait between those hops.",
      "burstAboveFivePerSecond fires 12 concurrent requests at two independent keys. The mock returns 429 with no Retry-After once more than 5 requests have started inside 1000ms, counting both keys together.",
      "burstSharedEmail is that window with both keys on one email, so opt-in failover must not treat the sibling as another quota.",
      "totalMs percentiles are successful responses only. totalMsAll includes failures. upstream429 counts mock 429 responses, including same-key retries.",
      "successRate is ok/attempted. null only when attempted is 0.",
    ],
  };
}

async function main() {
  const coldOnce = process.argv.includes("--cold-once");
  const importStarted = performance.now();
  const dataDir = mkdtempSync(join(tmpdir(), "omniroute-stage-latency-"));
  process.env.DATA_DIR = dataDir;

  const core = await import("../../src/lib/db/core.ts");
  const providersDb = await import("../../src/lib/db/providers.ts");
  const combosDb = await import("../../src/lib/db/combos.ts");
  const apiKeysDb = await import("../../src/lib/db/apiKeys.ts");
  const { initTranslators } = await import("../../open-sse/translator/index.ts");
  const { POST } = await import("../../src/app/api/v1/chat/completions/route.ts");
  const { runWithStageTiming, takeStageSpans } =
    await import("../../open-sse/utils/stageTiming.ts");
  const { resetAllCircuitBreakers } = await import("../../src/shared/utils/circuitBreaker.ts");
  const importMs = performance.now() - importStarted;

  initTranslators();
  const mock = await startMock();
  const dbStarted = performance.now();

  async function seedNode(prefix: string, token: string, priority = 1) {
    const providerId = `openai-compatible-chat-bench-${prefix}`;
    await providersDb.createProviderNode({
      id: providerId,
      type: "openai-compatible",
      name: `Bench ${prefix}`,
      prefix,
      apiType: "chat",
      baseUrl: mock.baseUrl,
    });
    await providersDb.createProviderConnection({
      provider: providerId,
      authType: "apikey",
      name: `conn-${prefix}-${priority}`,
      apiKey: token,
      isActive: true,
      testStatus: "active",
      priority,
      providerSpecificData: { baseUrl: mock.baseUrl, apiType: "chat" },
    });
    return { providerId, model: `${prefix}/test-model` };
  }

  const tokenOk = "bench-ok";
  const tokenFail = "bench-fail";
  const tokenSlow429 = "bench-429";
  const tokenAfter429 = "bench-429-ok";
  mock.setBehavior(tokenOk, { status: 200, delayMs: MOCK_DELAY_MS });
  mock.setBehavior(tokenFail, { status: 503, delayMs: 50 });
  mock.setBehavior(tokenSlow429, { status: 429, delayMs: 20 });
  mock.setBehavior(tokenAfter429, { status: 200, delayMs: MOCK_DELAY_MS });

  const single = await seedNode("s1", tokenOk, 1);
  const failNode = await seedNode("f1", tokenFail, 1);
  const okNode = await seedNode("f2", tokenOk, 1);
  await seedNode("r1", tokenSlow429, 1);
  await providersDb.createProviderConnection({
    provider: "openai-compatible-chat-bench-r1",
    authType: "apikey",
    name: "conn-r1-backup",
    apiKey: tokenAfter429,
    isActive: true,
    testStatus: "active",
    priority: 2,
    providerSpecificData: { baseUrl: mock.baseUrl, apiType: "chat" },
  });
  await combosDb.createCombo({
    name: "bench-fallback",
    strategy: "priority",
    config: { maxRetries: 0, retryDelayMs: 0 },
    models: [failNode.model, okNode.model],
  });
  const apiKey = await apiKeysDb.createApiKey("bench", "machine-bench");
  const dbInitMs = performance.now() - dbStarted;

  const hops: Hop[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const upstream = url.startsWith(mock.baseUrl);
    const at = performance.now();
    const response = await originalFetch(input, init);
    if (upstream) {
      const sleepHeader = Number(response.headers.get("x-mock-sleep-ms"));
      hops.push({
        status: response.status,
        ttfbMs: performance.now() - at,
        at,
        sleepMs: Number.isFinite(sleepHeader) ? sleepHeader : 0,
      });
    }
    return response;
  };

  async function once(
    scenario: string,
    model: string,
    stream = false,
    content = "ping"
  ): Promise<Sample> {
    hops.length = 0;
    const started = performance.now();
    try {
      const { response, spans } = await runWithStageTiming(async () => {
        const response = await POST(
          new Request("http://127.0.0.1/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${apiKey.key}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content }],
              stream,
            }),
          })
        );
        return { response, spans: takeStageSpans() };
      });
      const returned = performance.now() - started;
      const body = await readBody(response, started);
      return {
        scenario,
        ok: response.ok,
        status: response.status,
        totalMs: round(performance.now() - started),
        bodyMs: round(body.bodyMs),
        firstByteMs: body.firstByteMs === null ? round(returned) : round(body.firstByteMs),
        hops: hops.map((hop) => ({
          ...hop,
          ttfbMs: round(hop.ttfbMs),
          at: round(hop.at - started),
          sleepMs: hop.sleepMs,
        })),
        spans: spans.map((span) => ({
          stage: span.stage,
          ms: round(span.ms),
          at: round(span.at - started),
        })),
      };
    } catch (error) {
      return {
        scenario,
        ok: false,
        status: 0,
        totalMs: round(performance.now() - started),
        bodyMs: 0,
        firstByteMs: null,
        hops: [],
        spans: takeStageSpans(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (process.argv.includes("--policy-compare")) {
    const report = await runPolicyCompare({
      mock,
      providersDb,
      once,
      POST,
      resetAllCircuitBreakers,
    });
    globalThis.fetch = originalFetch;
    await mock.close();
    core.resetDbInstance();
    rmSync(dataDir, { recursive: true, force: true });
    process.stdout.write(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  const samples: Sample[] = [];
  const cold = await once("success-cold", single.model, false);
  samples.push(cold);

  if (coldOnce) {
    const payload = {
      machine: { node: process.version, platform: process.platform, arch: process.arch },
      startup: { importMs: round(importMs), dbInitMs: round(dbInitMs) },
      sample: cold,
    };
    process.stdout.write(JSON.stringify(payload));
    globalThis.fetch = originalFetch;
    await mock.close();
    core.resetDbInstance();
    rmSync(dataDir, { recursive: true, force: true });
    process.exit(cold.ok ? 0 : 1);
  }

  for (let i = 0; i < SUCCESS_WARM; i++)
    samples.push(await once("success-warm", single.model, false));
  resetAllCircuitBreakers();
  for (let i = 0; i < STREAM_N; i++) samples.push(await once("stream", single.model, true));
  resetAllCircuitBreakers();
  for (let i = 0; i < FALLBACK_N; i++) {
    samples.push(await once("combo-503-fallback", "bench-fallback", false));
    resetAllCircuitBreakers();
  }
  resetAllCircuitBreakers();
  for (let i = 0; i < RATE_LIMIT_N; i++) {
    samples.push(await once("rate-limit-fallback", "r1/test-model", false));
    resetAllCircuitBreakers();
  }

  const resilience = await import("../../src/lib/resilience/settings.ts");
  const settingsDb = await import("../../src/lib/db/settings.ts");
  await settingsDb.updateSettings({
    resilienceSettings: {
      ...resilience.DEFAULT_RESILIENCE_SETTINGS,
      requestQueue: {
        ...resilience.DEFAULT_RESILIENCE_SETTINGS.requestQueue,
        autoEnableApiKeyProviders: false,
        minTimeBetweenRequestsMs: 0,
      },
    },
  });
  const gapless = await seedNode("g1", tokenOk, 1);
  resetAllCircuitBreakers();
  for (let i = 0; i < 8; i++)
    samples.push(await once("success-warm-no-min-gap", gapless.model, false));

  const real = process.argv.includes("--no-extra")
    ? { skipped: true }
    : await measureRealProvider(providersDb, apiKeysDb, POST, runWithStageTiming, takeStageSpans);

  globalThis.fetch = originalFetch;
  await mock.close();
  core.resetDbInstance();
  rmSync(dataDir, { recursive: true, force: true });

  const coldProcesses = process.argv.includes("--no-extra") ? [] : await collectColdProcesses();
  const report = buildReport(
    samples,
    { importMs: round(importMs), dbInitMs: round(dbInitMs) },
    coldProcesses,
    real
  );
  process.stdout.write(JSON.stringify(report, null, 2));
  process.exit(0);
}

async function measureRealProvider(
  providersDb: { createProviderConnection: (data: Record<string, unknown>) => Promise<unknown> },
  apiKeysDb: { createApiKey: (name: string, machineId: string) => Promise<{ key: string }> },
  POST: (request: Request) => Promise<Response>,
  runWithStageTiming: <T>(fn: () => Promise<T>) => Promise<T>,
  takeStageSpans: () => StageSpan[]
) {
  const started = performance.now();
  try {
    const modelsResponse = await fetch("https://hermes.ai.unturf.com/v1/models", {
      signal: AbortSignal.timeout(8000),
    });
    if (!modelsResponse.ok) {
      return { reachable: false, status: modelsResponse.status, error: "models endpoint rejected" };
    }
    const catalog = (await modelsResponse.json()) as { data?: Array<{ id?: string }> };
    const modelId = catalog.data?.find((row) => typeof row.id === "string")?.id;
    if (!modelId) return { reachable: false, error: "models catalog was empty" };

    await providersDb.createProviderConnection({
      provider: "uncloseai",
      authType: "apikey",
      name: "bench-uncloseai",
      apiKey: "bench-anonymous",
      isActive: true,
      testStatus: "active",
      providerSpecificData: {},
    });
    const apiKey = await apiKeysDb.createApiKey("bench-real", "machine-bench");
    const requestStarted = performance.now();
    const { response, spans } = await runWithStageTiming(async () => {
      const response = await POST(
        new Request("http://127.0.0.1/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey.key}`,
          },
          body: JSON.stringify({
            model: `unc/${modelId}`,
            messages: [{ role: "user", content: "Reply with the single word pong." }],
            max_tokens: 16,
            stream: true,
          }),
        })
      );
      return { response, spans: takeStageSpans() };
    });
    let firstByteMs: number | null = null;
    if (response.body) {
      const reader = response.body.getReader();
      const chunk = await reader.read();
      if (!chunk.done) firstByteMs = performance.now() - requestStarted;
      await reader.cancel().catch(() => undefined);
    }
    return {
      reachable: true,
      provider: "uncloseai",
      model: modelId,
      status: response.status,
      ok: response.ok,
      totalMs: round(performance.now() - requestStarted),
      firstByteMs: firstByteMs === null ? null : round(firstByteMs),
      probeMs: round(performance.now() - started),
      spans: spans.map((span) => ({ stage: span.stage, ms: round(span.ms) })),
    };
  } catch (error) {
    return {
      reachable: false,
      error: error instanceof Error ? error.message : String(error),
      probeMs: round(performance.now() - started),
    };
  }
}

function collectColdProcesses(): Promise<Array<Record<string, unknown>>> {
  const script = pathToFileURL(join(process.cwd(), "scripts/perf/chat-stage-latency.ts")).pathname;
  const runs: Array<Promise<Record<string, unknown>>> = [];
  for (let i = 0; i < COLD_PROCESSES; i++) {
    runs.push(
      new Promise((resolve) => {
        const child = spawn(process.execPath, ["--import", "tsx/esm", script, "--cold-once"], {
          cwd: process.cwd(),
          env: process.env,
          stdio: ["ignore", "pipe", "pipe"],
        });
        let out = "";
        let err = "";
        child.stdout.on("data", (chunk) => {
          out += String(chunk);
        });
        child.stderr.on("data", (chunk) => {
          err += String(chunk);
        });
        child.on("close", (code) => {
          try {
            resolve(JSON.parse(out) as Record<string, unknown>);
          } catch {
            resolve({
              error: `cold process exit ${code}`,
              stderr: err.slice(-500),
              stdout: out.slice(-500),
            });
          }
        });
      })
    );
  }
  return Promise.all(runs);
}

function buildReport(
  samples: Sample[],
  startup: { importMs: number; dbInitMs: number },
  coldProcesses: Array<Record<string, unknown>>,
  real: unknown
) {
  const scenarios = [...new Set(samples.map((sample) => sample.scenario))];
  const byScenario = Object.fromEntries(
    scenarios.map((scenario) => {
      const rows = samples.filter((sample) => sample.scenario === scenario && sample.ok);
      const failed = samples.filter((sample) => sample.scenario === scenario && !sample.ok);
      const stageNames = [...new Set(rows.flatMap((row) => row.spans.map((span) => span.stage)))];
      const stages = Object.fromEntries(
        stageNames.map((stage) => [
          stage,
          summarize(
            rows.flatMap((row) =>
              row.spans.filter((span) => span.stage === stage).map((span) => span.ms)
            )
          ),
        ])
      );
      const hopCount = summarize(rows.map((row) => row.hops.length));
      const upstreamTtfb = summarize(rows.flatMap((row) => row.hops.map((hop) => hop.ttfbMs)));
      const upstreamSleep = summarize(rows.flatMap((row) => row.hops.map((hop) => hop.sleepMs)));
      const preUpstreamMs = summarize(
        rows
          .map((row) => row.hops[0]?.at)
          .filter((value): value is number => typeof value === "number")
      );
      const executorBeyondFetchMs = summarize(
        rows.map((row) => {
          const executor = row.spans.find((span) => span.stage === "core.upstream")?.ms ?? 0;
          const fetches = row.spans
            .filter((span) => span.stage === "upstream.fetch")
            .reduce((sum, span) => sum + span.ms, 0);
          return executor - fetches;
        })
      );
      const gaps: number[] = [];
      for (const row of rows) {
        for (let i = 1; i < row.hops.length; i++) {
          const previous = row.hops[i - 1];
          gaps.push(row.hops[i].at - (previous.at + previous.ttfbMs));
        }
      }
      return [
        scenario,
        {
          attempted: samples.filter((sample) => sample.scenario === scenario).length,
          ok: rows.length,
          failed: failed.length,
          failureStatuses: failed.map((row) => row.status),
          failureErrors: failed.map((row) => row.error).filter(Boolean),
          totalMs: summarize(rows.map((row) => row.totalMs)),
          firstByteMs: summarize(
            rows.map((row) => row.firstByteMs).filter((value): value is number => value !== null)
          ),
          upstream: {
            hopCount,
            ttfbMs: upstreamTtfb,
            mockSleepMs: upstreamSleep,
            preUpstreamMs,
            executorBeyondFetchMs,
            gapBetweenHopsMs: summarize(gaps),
          },
          stages,
          example: rows[0] ?? failed[0] ?? null,
        },
      ];
    })
  );

  return {
    measuredAt: new Date().toISOString(),
    machine: { node: process.version, platform: process.platform, arch: process.arch },
    mockDelayMs: MOCK_DELAY_MS,
    startup,
    coldProcesses,
    scenarios: byScenario,
    realProvider: real,
    notes: [
      "Stage spans are inclusive and nested. upstream.fetch is inside core.upstream, which is inside handleChatCore, which is inside handleChat.",
      "totalMs includes reading the response body. firstByteMs is when the caller sees the first body byte, or the handler return when the body is empty.",
      "gapBetweenHopsMs is the time after one upstream response's headers until the next upstream fetch starts. On 429 that gap is the executor retry sleep.",
      "Quota preflight and compression.apply are reported only when those code paths run.",
    ],
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
