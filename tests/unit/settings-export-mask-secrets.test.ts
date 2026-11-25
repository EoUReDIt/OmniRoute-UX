/**
 * JSON backup masking. The export uses the same mask as GET /api/settings. Importing that
 * mask keeps the stored secret. A real value replaces it. The mask string is never stored.
 */
import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeManagementSessionRequest } from "../helpers/managementSession.ts";
import { SETTINGS_SECRET_KEYS, SETTINGS_SECRET_MASK } from "../../src/lib/api/settingsSecrets.ts";

const PLAINTEXT: Record<(typeof SETTINGS_SECRET_KEYS)[number], string> = {
  oidcClientSecret: "oidc-export-plain-secret",
  entraGraphClientSecret: "entra-export-plain-secret",
  skillsmpApiKey: "skillsmp-export-plain-secret",
  cliproxyapi_api_key: "cliproxy-export-plain-secret",
  qdrantApiKey: "qdrant-export-plain-secret",
  ngrokAuthToken: "ngrok-export-plain-secret",
};

const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-export-mask-"));
const originalEnv = {
  DATA_DIR: process.env.DATA_DIR,
  API_KEY_SECRET: process.env.API_KEY_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  INITIAL_PASSWORD: process.env.INITIAL_PASSWORD,
  REQUIRE_API_KEY: process.env.REQUIRE_API_KEY,
};
process.env.DATA_DIR = testDataDir;
process.env.API_KEY_SECRET = "export-mask-api-key-secret";
process.env.JWT_SECRET = "export-mask-jwt-secret";
process.env.REQUIRE_API_KEY = "false";
delete process.env.INITIAL_PASSWORD;

const core = await import("../../src/lib/db/core.ts");
const { getSettings, updateSettings } = await import("../../src/lib/db/settings.ts");
const exportRoute = await import("../../src/app/api/settings/export-json/route.ts");
const importRoute = await import("../../src/app/api/settings/import-json/route.ts");

async function resetStorage() {
  core.resetDbInstance();
  fs.rmSync(testDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  fs.mkdirSync(testDataDir, { recursive: true });
}

beforeEach(async () => {
  await resetStorage();
  await updateSettings(PLAINTEXT);
});

after(async () => {
  core.resetDbInstance();
  fs.rmSync(testDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function exportBody(): Promise<{ text: string; settings: Record<string, unknown> }> {
  const response = await exportRoute.GET(
    await makeManagementSessionRequest("http://localhost/api/settings/export-json")
  );
  const text = await response.text();
  assert.equal(response.status, 200);
  const parsed = JSON.parse(text) as { settings: Record<string, unknown> };
  return { text, settings: parsed.settings };
}

async function importSettings(settings: Record<string, unknown>) {
  const response = await importRoute.POST(
    await makeManagementSessionRequest("http://localhost/api/settings/import-json", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings }),
    })
  );
  assert.equal(response.status, 200);
}

test("the JSON export contains no plaintext credential settings", async () => {
  const { text, settings } = await exportBody();
  for (const key of SETTINGS_SECRET_KEYS) {
    assert.equal(text.includes(PLAINTEXT[key]), false, key);
    assert.equal(settings[key], SETTINGS_SECRET_MASK, key);
  }
});

test("importing an export keeps the stored secrets", async () => {
  const { settings } = await exportBody();
  await importSettings(settings);
  const stored = await getSettings();
  for (const key of SETTINGS_SECRET_KEYS) {
    assert.equal(stored[key], PLAINTEXT[key], key);
    assert.notEqual(stored[key], SETTINGS_SECRET_MASK, key);
  }
});

test("a real secret on import overwrites the stored value", async () => {
  await importSettings({
    oidcClientSecret: "oidc-replaced-secret",
    skillsmpApiKey: "skillsmp-replaced-secret",
  });
  const stored = await getSettings();
  assert.equal(stored.oidcClientSecret, "oidc-replaced-secret");
  assert.equal(stored.skillsmpApiKey, "skillsmp-replaced-secret");
  assert.equal(stored.entraGraphClientSecret, PLAINTEXT.entraGraphClientSecret);
  assert.notEqual(stored.oidcClientSecret, SETTINGS_SECRET_MASK);
});
