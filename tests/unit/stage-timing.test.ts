import assert from "node:assert/strict";
import test from "node:test";

import {
  runWithStageTiming,
  stageTimingEnabled,
  takeStageSpans,
  timeStage,
  timeStageSync,
} from "../../open-sse/utils/stageTiming.ts";

test("stage timing stays off unless the process was started with the flag", () => {
  assert.equal(process.env.OMNIROUTE_STAGE_TIMING, undefined);
  assert.equal(stageTimingEnabled(), false);
});

test("a disabled timer returns the original value and records no spans", async () => {
  const asyncValue = await timeStage("auth", async () => 7);
  const syncValue = timeStageSync("injection", () => "ok");
  await runWithStageTiming(async () => {
    await timeStage("combo.resolve", async () => 1);
  });

  assert.equal(asyncValue, 7);
  assert.equal(syncValue, "ok");
  assert.deepEqual(takeStageSpans(), []);
});

test("with OMNIROUTE_STAGE_TIMING unset, a Response is unchanged by the timer", async () => {
  assert.equal(process.env.OMNIROUTE_STAGE_TIMING, undefined);
  assert.equal(stageTimingEnabled(), false);

  const direct = new Response(JSON.stringify({ ok: true, source: "direct" }), {
    status: 201,
    headers: { "content-type": "application/json", "x-omniroute-test": "stage-timer" },
  });
  const throughAsync = await timeStage(
    "handleChat",
    async () =>
      new Response(JSON.stringify({ ok: true, source: "direct" }), {
        status: 201,
        headers: { "content-type": "application/json", "x-omniroute-test": "stage-timer" },
      })
  );
  const sameObject = new Response("ping", { status: 202 });
  const throughIdentity = await timeStage("upstream.fetch", () => sameObject);
  const throughSync = timeStageSync(
    "injection",
    () =>
      new Response(JSON.stringify({ ok: true, source: "direct" }), {
        status: 201,
        headers: { "content-type": "application/json", "x-omniroute-test": "stage-timer" },
      })
  );

  assert.equal(throughIdentity, sameObject);
  assert.equal(throughAsync.status, direct.status);
  assert.equal(throughSync.status, direct.status);
  assert.equal(
    throughAsync.headers.get("x-omniroute-test"),
    direct.headers.get("x-omniroute-test")
  );
  assert.equal(await throughAsync.text(), await direct.text());
  assert.equal(await throughSync.text(), JSON.stringify({ ok: true, source: "direct" }));
  assert.equal(await throughIdentity.text(), "ping");
  assert.deepEqual(takeStageSpans(), []);
});
