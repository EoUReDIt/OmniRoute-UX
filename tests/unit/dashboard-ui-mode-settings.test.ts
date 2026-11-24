import { describe, test, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeManagementSessionRequest } from "../helpers/managementSession.ts";
import {
  isSimpleNavPath,
  normalizeDashboardUiMode,
  shouldShowAdvancedScreenBanner,
} from "../../src/shared/constants/dashboardUiMode.ts";
import { updateSettingsSchema } from "../../src/shared/validation/settingsSchemas.ts";

async function createHarness() {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-dashboard-ui-mode-"));
  process.env.DATA_DIR = testDataDir;
  process.env.REQUIRE_API_KEY = "false";
  if (!process.env.API_KEY_SECRET) {
    process.env.API_KEY_SECRET = "test-dashboard-ui-mode-secret";
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-dashboard-ui-mode-jwt";
  }

  const core = await import("../../src/lib/db/core.ts");
  const settingsDb = await import("../../src/lib/db/settings.ts");
  const settingsRoute = await import("../../src/app/api/settings/route.ts");
  const exportRoute = await import("../../src/app/api/settings/export-json/route.ts");
  const importRoute = await import("../../src/app/api/settings/import-json/route.ts");

  async function resetStorage() {
    core.resetDbInstance();
    fs.rmSync(testDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  return { core, settingsDb, settingsRoute, exportRoute, importRoute, resetStorage, testDataDir };
}

const harness = await createHarness();

beforeEach(async () => {
  delete process.env.INITIAL_PASSWORD;
  await harness.resetStorage();
});

afterEach(async () => {
  delete process.env.INITIAL_PASSWORD;
  await harness.resetStorage();
});

after(() => {
  harness.core.resetDbInstance();
  fs.rmSync(harness.testDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

describe("dashboardUiMode", () => {
  test("a missing key is original, and only the string simple is simple", () => {
    assert.equal(normalizeDashboardUiMode(undefined), "original");
    assert.equal(normalizeDashboardUiMode(null), "original");
    assert.equal(normalizeDashboardUiMode("original"), "original");
    assert.equal(normalizeDashboardUiMode("full"), "original");
    assert.equal(normalizeDashboardUiMode("simple"), "simple");
  });

  test("the short nav owns its pages and leaves combos outside it", () => {
    assert.equal(isSimpleNavPath("/home"), true);
    assert.equal(isSimpleNavPath("/dashboard/providers/new"), true);
    assert.equal(isSimpleNavPath("/dashboard/providers/openai"), true);
    assert.equal(isSimpleNavPath("/dashboard/providers/services"), false);
    assert.equal(isSimpleNavPath("/dashboard/cli-code/claude"), true);
    assert.equal(isSimpleNavPath("/dashboard/api-manager"), true);
    assert.equal(isSimpleNavPath("/dashboard/api-manager/key-1/access"), false);
    assert.equal(isSimpleNavPath("/dashboard/combos"), false);
    assert.equal(shouldShowAdvancedScreenBanner("original", "/dashboard/combos"), false);
    assert.equal(shouldShowAdvancedScreenBanner("simple", "/dashboard/combos"), true);
    assert.equal(shouldShowAdvancedScreenBanner("simple", "/home"), false);
    assert.equal(shouldShowAdvancedScreenBanner("simple", "/dashboard/onboarding"), false);
  });

  test("the settings schema accepts the enum and leaves it optional", () => {
    assert.equal(updateSettingsSchema.safeParse({ dashboardUiMode: "simple" }).success, true);
    assert.equal(updateSettingsSchema.safeParse({ dashboardUiMode: "original" }).success, true);
    const omitted = updateSettingsSchema.safeParse({});
    assert.equal(omitted.success, true);
    if (omitted.success) assert.equal(omitted.data.dashboardUiMode, undefined);
    assert.equal(updateSettingsSchema.safeParse({ dashboardUiMode: "advanced" }).success, false);
  });

  test("getSettings defaults a fresh database to original", async () => {
    const settings = await harness.settingsDb.getSettings();
    assert.equal(settings.dashboardUiMode, "original");
  });

  test("a stored value other than simple reads as original", async () => {
    const db = harness.core.getDbInstance();
    db.prepare(
      "INSERT OR REPLACE INTO key_value (namespace, key, value) VALUES ('settings', 'dashboardUiMode', ?)"
    ).run(JSON.stringify("nope"));
    const settings = await harness.settingsDb.getSettings();
    assert.equal(settings.dashboardUiMode, "original");
  });

  test("INITIAL_PASSWORD completes setup and stays on original", async () => {
    process.env.INITIAL_PASSWORD = "deploy-password";
    const settings = await harness.settingsDb.getSettings();
    assert.equal(settings.setupComplete, true);
    assert.equal(settings.dashboardUiMode, "original");
  });

  test("PATCH, GET, export, and import round-trip without touching sidebar layout", async () => {
    await harness.settingsDb.updateSettings({
      hiddenSidebarItems: ["translator"],
      sidebarActivePreset: "essentials",
    });

    const patched = await harness.settingsRoute.PATCH(
      await makeManagementSessionRequest("http://localhost/api/settings", {
        method: "PATCH",
        body: { dashboardUiMode: "simple" },
      })
    );
    const patchedBody = (await patched.json()) as Record<string, unknown>;
    assert.equal(patched.status, 200);
    assert.equal(patchedBody.dashboardUiMode, "simple");
    assert.deepEqual(patchedBody.hiddenSidebarItems, ["translator"]);
    assert.equal(patchedBody.sidebarActivePreset, "essentials");

    const fetched = await harness.settingsRoute.GET(
      await makeManagementSessionRequest("http://localhost/api/settings")
    );
    const fetchedBody = (await fetched.json()) as Record<string, unknown>;
    assert.equal(fetched.status, 200);
    assert.equal(fetchedBody.dashboardUiMode, "simple");
    assert.deepEqual(fetchedBody.hiddenSidebarItems, ["translator"]);
    assert.equal(fetchedBody.sidebarActivePreset, "essentials");

    const exported = await harness.exportRoute.GET(
      await makeManagementSessionRequest("http://localhost/api/settings/export-json")
    );
    const exportedBody = (await exported.json()) as { settings: Record<string, unknown> };
    assert.equal(exported.status, 200);
    assert.equal(exportedBody.settings.dashboardUiMode, "simple");
    assert.equal("password" in exportedBody.settings, false);

    await harness.resetStorage();
    const imported = await harness.importRoute.POST(
      await makeManagementSessionRequest("http://localhost/api/settings/import-json", {
        method: "POST",
        body: JSON.stringify({ settings: exportedBody.settings }),
        headers: { "content-type": "application/json" },
      })
    );
    const importedBody = (await imported.json()) as Record<string, unknown>;
    assert.equal(imported.status, 200, JSON.stringify(importedBody));
    const afterImport = await harness.settingsDb.getSettings();
    assert.equal(afterImport.dashboardUiMode, "simple");

    const omitted = await harness.importRoute.POST(
      await makeManagementSessionRequest("http://localhost/api/settings/import-json", {
        method: "POST",
        body: JSON.stringify({ settings: { theme: "dark" } }),
        headers: { "content-type": "application/json" },
      })
    );
    assert.equal(omitted.status, 200);
    const afterOmitted = await harness.settingsDb.getSettings();
    assert.equal(afterOmitted.dashboardUiMode, "simple");
    assert.equal(afterOmitted.theme, "dark");

    const invalid = await harness.importRoute.POST(
      await makeManagementSessionRequest("http://localhost/api/settings/import-json", {
        method: "POST",
        body: JSON.stringify({ settings: { dashboardUiMode: "advanced" } }),
        headers: { "content-type": "application/json" },
      })
    );
    const invalidBody = (await invalid.json()) as { ignoredKeys?: string[] };
    assert.equal(invalid.status, 200);
    assert.ok(invalidBody.ignoredKeys?.includes("dashboardUiMode"));
    const afterInvalid = await harness.settingsDb.getSettings();
    assert.equal(afterInvalid.dashboardUiMode, "simple");
  });

  test("writing a non-simple value stores original and leaves sidebar settings alone", async () => {
    await harness.settingsDb.updateSettings({
      hiddenSidebarItems: ["logs"],
      sidebarActivePreset: "developer",
      dashboardUiMode: "not-a-mode",
    });
    const settings = await harness.settingsDb.getSettings();
    assert.equal(settings.dashboardUiMode, "original");
    assert.deepEqual(settings.hiddenSidebarItems, ["logs"]);
    assert.equal(settings.sidebarActivePreset, "developer");
  });

  test("GET and PATCH hide OIDC and Entra secrets, and a masked PATCH keeps them", async () => {
    await harness.settingsDb.updateSettings({
      oidcClientSecret: "oidc-real-secret-value",
      entraGraphClientSecret: "entra-real-secret-value",
    });

    const fetched = await harness.settingsRoute.GET(
      await makeManagementSessionRequest("http://localhost/api/settings")
    );
    const fetchedBody = (await fetched.json()) as Record<string, unknown>;
    const fetchedText = JSON.stringify(fetchedBody);
    assert.equal(fetched.status, 200);
    assert.equal(fetchedText.includes("oidc-real-secret-value"), false);
    assert.equal(fetchedText.includes("entra-real-secret-value"), false);
    assert.equal(fetchedBody.oidcClientSecret, "********");
    assert.equal(fetchedBody.entraGraphClientSecret, "********");

    const patched = await harness.settingsRoute.PATCH(
      await makeManagementSessionRequest("http://localhost/api/settings", {
        method: "PATCH",
        body: {
          oidcClientSecret: "********",
          entraGraphClientSecret: "********",
          dashboardUiMode: "simple",
        },
      })
    );
    const patchedBody = (await patched.json()) as Record<string, unknown>;
    const patchedText = JSON.stringify(patchedBody);
    assert.equal(patched.status, 200);
    assert.equal(patchedText.includes("oidc-real-secret-value"), false);
    assert.equal(patchedText.includes("entra-real-secret-value"), false);
    assert.equal(patchedBody.oidcClientSecret, "********");
    assert.equal(patchedBody.entraGraphClientSecret, "********");

    const stored = await harness.settingsDb.getSettings();
    assert.equal(stored.oidcClientSecret, "oidc-real-secret-value");
    assert.equal(stored.entraGraphClientSecret, "entra-real-secret-value");
    assert.equal(stored.dashboardUiMode, "simple");
  });

  test("chat request handlers do not read the dashboard view", () => {
    const files = [
      "src/app/api/v1/chat/completions/route.ts",
      "src/sse/handlers/chat.ts",
      "open-sse/handlers/chatCore.ts",
      "open-sse/executors/base.ts",
      "open-sse/services/combo/executeTargetGates.ts",
    ];
    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      assert.equal(source.includes("dashboardUiMode"), false, file);
    }
  });
});
