import assert from "node:assert/strict";
import test from "node:test";

import { logger } from "../lib/logger.js";

test("structured logs redact secrets and neutralize log injection", (t) => {
  const original = console.log;
  let output;
  console.log = (value) => { output = value; };
  t.after(() => { console.log = original; });

  logger.info("line one\nline two", {
    requestId: "request-1",
    token: "secret-token",
    nested: { authorization: "Bearer secret", safe: "value\rnext" },
  });

  const record = JSON.parse(output);
  assert.equal(record.service, "openai-websocket-gateway");
  assert.equal(record.message, "line one line two");
  assert.equal(record.token, "[REDACTED]");
  assert.equal(record.nested.authorization, "[REDACTED]");
  assert.equal(record.nested.safe, "value next");
});
