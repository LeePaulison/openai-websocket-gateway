import assert from "node:assert/strict";
import test from "node:test";

import { createFixedWindowRateLimiter } from "../lib/rateLimiter.js";

test("rate limiter expires stale identities", () => {
  let currentTime = 0;
  const limiter = createFixedWindowRateLimiter({
    limit: 1,
    windowMs: 100,
    now: () => currentTime,
  });

  assert.equal(limiter.check("user-1").allowed, true);
  assert.equal(limiter.check("user-1").allowed, false);
  currentTime = 100;
  assert.equal(limiter.check("user-2").allowed, true);
  assert.equal(limiter.size(), 1);
});

test("rate limiter bounds identity storage", () => {
  const limiter = createFixedWindowRateLimiter({ limit: 1, maxEntries: 2, now: () => 0 });

  assert.equal(limiter.check("user-1").allowed, true);
  assert.equal(limiter.check("user-2").allowed, true);
  assert.deepEqual(limiter.check("user-3"), { allowed: false, reason: "capacity" });
  assert.equal(limiter.size(), 2);
});
