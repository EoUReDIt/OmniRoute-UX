import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.NODE_ENV = "test";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-hintless-429-"));
process.env.DATA_DIR = TEST_DATA_DIR;

const core = await import("../../src/lib/db/core.ts");
const providersDb = await import("../../src/lib/db/providers.ts");
const { hasHealthyAlternateConnection } =
  await import("../../open-sse/services/hintless429Failover.ts");
const { clearAllModelLockouts, lockModel } =
  await import("../../open-sse/services/accountFallback.ts");

async function resetStorage() {
  clearAllModelLockouts();
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

test.after(async () => {
  clearAllModelLockouts();
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

async function connect(
  provider: string,
  name: string,
  extra: Record<string, unknown> = {}
): Promise<string> {
  const row = await providersDb.createProviderConnection({
    provider,
    authType: "apikey",
    name,
    apiKey: `key-${name}`,
    isActive: true,
    testStatus: "active",
    ...extra,
  });
  const id = (row as { id?: string } | null)?.id;
  if (!id) throw new Error(`connection ${name} was not created`);
  return id;
}

test("alternate detection follows health, allowlist, and model lock", async () => {
  await resetStorage();
  const provider = "openai";
  const current = await connect(provider, "current");
  assert.equal(
    await hasHealthyAlternateConnection({ provider, connectionId: current, model: "gpt-4o" }),
    false
  );

  const sibling = await connect(provider, "sibling");
  assert.equal(
    await hasHealthyAlternateConnection({ provider, connectionId: current, model: "gpt-4o" }),
    true
  );

  assert.equal(
    await hasHealthyAlternateConnection({
      provider,
      connectionId: current,
      model: "gpt-4o",
      allowedConnectionIds: [current],
    }),
    false
  );

  await providersDb.updateProviderConnection(sibling, {
    rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.equal(
    await hasHealthyAlternateConnection({ provider, connectionId: current, model: "gpt-4o" }),
    false
  );

  await providersDb.updateProviderConnection(sibling, {
    rateLimitedUntil: null,
    testStatus: "banned",
  });
  assert.equal(
    await hasHealthyAlternateConnection({ provider, connectionId: current, model: "gpt-4o" }),
    false
  );

  await providersDb.updateProviderConnection(sibling, { testStatus: "active" });
  lockModel(provider, sibling, "gpt-4o", "rate_limit", 60_000);
  assert.equal(
    await hasHealthyAlternateConnection({ provider, connectionId: current, model: "gpt-4o" }),
    false
  );
  clearAllModelLockouts();
  assert.equal(
    await hasHealthyAlternateConnection({ provider, connectionId: current, model: "gpt-4o" }),
    true
  );
});
