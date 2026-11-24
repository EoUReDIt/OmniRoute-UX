import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
import { gotoDashboardRoute } from "./helpers/dashboardAuth";

const artifacts = "/opt/cursor/artifacts";

async function resetToFullView(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dashboardUiMode: "original" }),
    });
  });
  await page.reload();
}

test("switches Simple and Full view from the header, including the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoDashboardRoute(page, "/home");
  await resetToFullView(page);

  const sidebar = page.locator('aside[data-slot="sidebar"]');
  const switcher = page.getByTestId("dashboard-ui-mode-switch");
  await expect(switcher).toBeVisible();
  await expect(switcher).toHaveAttribute("aria-pressed", "false");
  await expect(switcher).toContainText("Full view");

  await sidebar.getByRole("searchbox").fill("Combos");
  await expect(sidebar.getByRole("link", { name: "Combos", exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, "full-view-desktop.png"), fullPage: false });
  await switcher.screenshot({ path: path.join(artifacts, "switch-full-desktop.png") });

  await switcher.focus();
  await expect(switcher).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(switcher).toContainText("Simple view");
  await expect(switcher).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("simple-home-checklist")).toBeVisible();
  await sidebar.getByRole("searchbox").fill("Combos");
  await expect(sidebar.getByRole("link", { name: "Combos", exact: true })).toHaveCount(0);
  await sidebar.getByRole("searchbox").fill("");
  await expect(sidebar.getByRole("link", { name: "Coding tool", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Try", exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, "simple-view-desktop.png"), fullPage: false });
  await switcher.screenshot({ path: path.join(artifacts, "switch-simple-desktop.png") });

  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog");
  await palette.getByRole("combobox", { name: /search pages/i }).fill("Combos");
  await palette.getByRole("option", { name: /^Combos/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/combos/);
  await expect(switcher).toContainText("Simple view");
  await expect(page.getByTestId("simple-advanced-banner")).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to Home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open in Full view" })).toBeVisible();

  await page.getByRole("button", { name: "Open in Full view" }).click();
  await expect(switcher).toContainText("Full view");
  await expect(page.getByTestId("simple-advanced-banner")).toHaveCount(0);
  await sidebar.getByRole("searchbox").fill("Combos");
  await expect(sidebar.getByRole("link", { name: "Combos", exact: true })).toBeVisible();
});

test("keeps the view switch on screen below 1024px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoDashboardRoute(page, "/home");
  await resetToFullView(page);

  const switcher = page.getByTestId("dashboard-ui-mode-switch");
  await expect(switcher).toBeVisible();
  await expect(switcher).toHaveAttribute("data-compact", "true");
  await expect(switcher).toContainText("Full view");
  await page.screenshot({ path: path.join(artifacts, "full-view-narrow.png"), fullPage: false });

  await switcher.focus();
  await page.keyboard.press("Space");
  await expect(switcher).toContainText("Simple view");
  await expect(page.getByTestId("simple-home-checklist")).toBeVisible();
  await page.screenshot({ path: path.join(artifacts, "simple-view-narrow.png"), fullPage: false });
  await switcher.screenshot({ path: path.join(artifacts, "switch-simple-narrow.png") });
});
