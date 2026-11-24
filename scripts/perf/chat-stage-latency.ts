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

async function startMock(): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
  setBehavior: (
    token: string,
    behavior: { status: number; delayMs: number; body?: unknown; stream?: boolean }
  ) => void;
}> {
  const behaviors = new Map<
    string,
    { status: number; delayMs: number; body?: unknown; stream?: boolean }
  >();
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
    const slept = performance.now();
    if (behavior.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, behavior.delayMs));
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
    res.writeHead(behavior.status, {
      "Content-Type": "application/json",
      "x-mock-sleep-ms": String(Math.round(sleepMs)),
    });
    res.end(
      JSON.stringify(
        behavior.body ??
          (behavior.status === 200
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
            : { error: { message: `bench status ${behavior.status}` } })
      )
    );
  }

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("mock listen failed");
  return {
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    setBehavior: (token, behavior) => behaviors.set(token, behavior),
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

  async function once(scenario: string, model: string, stream = false): Promise<Sample> {
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
              messages: [{ role: "user", content: "ping" }],
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
