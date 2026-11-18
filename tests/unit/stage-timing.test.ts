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
