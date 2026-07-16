import assert from "node:assert/strict";
import test from "node:test";

import { getServerConfiguration } from "../lib/config.js";

function withRequiredEnvironment(t) {
  const original = { ...process.env };
  process.env.API_ORIGIN = "https://api.example.test";
  process.env.CLIENT_ORIGIN = "https://client.example.test";
  t.after(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) delete process.env[key];
    }
    Object.assign(process.env, original);
  });
}

test("security configuration uses restrictive defaults", (t) => {
  withRequiredEnvironment(t);
  delete process.env.JWT_ALGORITHMS;

  const configuration = getServerConfiguration();

  assert.deepEqual(configuration.jwtAlgorithms, ["RS256"]);
  assert.equal(configuration.maxPayloadBytes, 640 * 1024);
  assert.equal(configuration.messagesPerMinute, 30);
  assert.equal(configuration.maxConnections, 1000);
  assert.equal(configuration.graphqlTimeoutMs, 10_000);
  assert.equal(configuration.streamIdleTimeoutMs, 120_000);
  assert.equal(configuration.heartbeatIntervalMs, 30_000);
  assert.equal(configuration.readinessTimeoutMs, 5_000);
  assert.equal(configuration.readinessCacheMs, 30_000);
});

test("unsupported JWT algorithms and invalid limits fail configuration", (t) => {
  withRequiredEnvironment(t);
  process.env.JWT_ALGORITHMS = "none";
  assert.throws(() => getServerConfiguration(), /unsupported algorithm/);

  process.env.JWT_ALGORITHMS = "RS256";
  process.env.MAX_PAYLOAD_BYTES = "0";
  assert.throws(() => getServerConfiguration(), /positive integer/);
});
