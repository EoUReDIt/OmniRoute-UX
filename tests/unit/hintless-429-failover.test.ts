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
const { shouldDeferHintless429, sharesQuotaIdentity } =
  await import("../../src/sse/services/hintless429Deferral.ts");
const { clearAllModelLockouts } = await import("../../open-sse/services/accountFallback.ts");
const { markAccountUnavailable } = await import("../../src/sse/services/auth.ts");

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

test("selection declines a plan-ineligible, model-excluded, or cooled sibling", async () => {
  await resetStorage();

  const paid = await connect("codex", "paid", {
    providerSpecificData: { workspacePlanType: "plus" },
    email: "paid@example.com",
  });
  await connect("codex", "free", {
    providerSpecificData: { workspacePlanType: "free" },
    email: "free@example.com",
  });
  const codexBase = {
    enabled: true,
    provider: "codex",
    currentConnectionId: paid,
    current: { email: "paid@example.com", providerSpecificData: { workspacePlanType: "plus" } },
  };
  assert.equal(await shouldDeferHintless429({ ...codexBase, model: "gpt-4o" }), true);
  assert.equal(await shouldDeferHintless429({ ...codexBase, model: "gpt-5.6-sol" }), false);

  await resetStorage();
  const current = await connect("openai", "current", { email: "a@example.com" });
  await connect("openai", "excluded-model", {
    email: "b@example.com",
    providerSpecificData: { excludedModels: ["gpt-4o"] },
  });
  assert.equal(
    await shouldDeferHintless429({
      enabled: true,
      provider: "openai",
      model: "gpt-4o",
      currentConnectionId: current,
      current: { email: "a@example.com" },
    }),
    false
  );

  await resetStorage();
  const holder = await connect("openai", "holder", { email: "holder@example.com" });
  await connect("openai", "cooled", {
    email: "cooled@example.com",
    rateLimitedUntil: new Date(Date.now() + 60_000).toISOString(),
  });
  assert.equal(
    await shouldDeferHintless429({
      enabled: true,
      provider: "openai",
      model: "gpt-4o",
      currentConnectionId: holder,
      current: { email: "holder@example.com" },
    }),
    false
  );
});

test("an eligible sibling defers, and a shared email, a pin, a prior failover, or a disabled flag does not", async () => {
  await resetStorage();
  const current = await connect("openai", "current", { email: "a@example.com" });
  const sibling = await connect("openai", "sibling", { email: "b@example.com" });
  const base = {
    enabled: true,
    provider: "openai",
    model: "gpt-4o",
    currentConnectionId: current,
    current: { email: "a@example.com" },
  };
  assert.equal(await shouldDeferHintless429(base), true);
  assert.equal(await shouldDeferHintless429({ ...base, enabled: false }), false);
  assert.equal(await shouldDeferHintless429({ ...base, forced: true }), false);
  assert.equal(await shouldDeferHintless429({ ...base, alreadyFailedOver: true }), false);

  await providersDb.updateProviderConnection(sibling, { email: "a@example.com" });
  assert.equal(sharesQuotaIdentity({ email: "a@example.com" }, { email: "a@example.com" }), true);
  assert.equal(await shouldDeferHintless429(base), false);
});

test("a handed-off 429 still marks the account unavailable", async () => {
  await resetStorage();
  const current = await connect("openai", "marked", { email: "marked@example.com" });
  const marked = await markAccountUnavailable(current, 429, "rate limited", "openai", "gpt-4o");
  assert.equal(marked.shouldFallback, true);
  const stored = await providersDb.getProviderConnectionById(current);
  assert.ok(stored?.rateLimitedUntil);
});
