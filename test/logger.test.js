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

test("structured logs redact private identifiers and embedded secrets", (t) => {
  const original = console.log;
  let output;
  console.log = (value) => { output = value; };
  t.after(() => { console.log = original; });

  logger.info("request used Bearer secret-token-value", {
    userId: "user-1",
    conversationId: "conversation-1",
    ip: "127.0.0.1",
    detail: "provider rejected sk-testsecret",
    description: "kept because it is not private",
  });

  const record = JSON.parse(output);
  assert.equal(record.message, "request used [REDACTED]");
  assert.equal(record.userId, "[REDACTED]");
  assert.equal(record.conversationId, "[REDACTED]");
  assert.equal(record.ip, "[REDACTED]");
  assert.equal(record.detail, "provider rejected [REDACTED]");
  assert.equal(record.description, "kept because it is not private");
});

test("structured logs never throw from unserializable metadata or console failures", (t) => {
  const original = console.log;
  const circular = {};
  circular.self = circular;
  let output;
  console.log = (value) => { output = value; };
  t.after(() => { console.log = original; });

  assert.doesNotThrow(() => logger.info("safe", { circular, count: 1n }));

  const record = JSON.parse(output);
  assert.equal(record.circular.self, "[Circular]");
  assert.equal(record.count, "1");

  console.log = () => { throw new Error("stdout unavailable"); };
  assert.doesNotThrow(() => logger.info("safe"));
});
