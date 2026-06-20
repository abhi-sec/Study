import test from "node:test";
import assert from "node:assert/strict";
import { REVISION_INTERVALS, addLocalDays, toLocalMidnightUtc } from "../lib/date.js";

test("revision intervals are fixed and ordered", () => {
  assert.deepEqual(REVISION_INTERVALS, [1, 3, 7, 15, 30, 60, 120]);
});

test("toLocalMidnightUtc normalizes to midnight boundary", () => {
  const date = new Date("2026-06-20T16:35:00.000Z");
  const normalized = toLocalMidnightUtc(date, "Asia/Kolkata");
  assert.equal(normalized.getUTCHours(), 0);
  assert.equal(normalized.getUTCMinutes(), 0);
});

test("addLocalDays adds exact day offsets", () => {
  const date = new Date("2026-01-01T10:00:00.000Z");
  const target = addLocalDays(date, "UTC", 7);
  assert.equal(target.toISOString(), "2026-01-08T00:00:00.000Z");
});
