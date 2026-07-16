import assert from "node:assert/strict";
import test from "node:test";

import { createReadinessCheck } from "../lib/readiness.js";

const configuration = {
  apiOrigin: "https://app.example.test",
  jwksUrl: "https://app.example.test/api/auth/jwks",
  readinessTimeoutMs: 100,
  readinessCacheMs: 30_000,
};

function successfulFetch(calls) {
  return async (url) => {
    const value = url.toString();
    calls.push(value);
    if (value === "https://api.openai.com/v1/models") {
      return new Response(JSON.stringify({ object: "list", data: [] }));
    }
    if (value.endsWith("/api/auth/jwks")) {
      return Response.json({ keys: [{ kty: "RSA" }] });
    }
    if (value.endsWith("/api/graphql")) {
      return Response.json({ data: { __typename: "Query" } });
    }
    return new Response("ok");
  };
}

test("readiness checks OpenAI, JWKS, GraphQL, and the application origin", async () => {
  const calls = [];
  const check = createReadinessCheck({ configuration, fetchImpl: successfulFetch(calls), now: () => 0 });

  const result = await check();

  assert.equal(result.ready, true);
  assert.deepEqual(Object.keys(result.dependencies), ["openai", "jwks", "graphql", "application"]);
  assert.equal(calls.length, 4);

  await check();
  assert.equal(calls.length, 4, "successful readiness result should be cached");
});

test("readiness fails without exposing dependency errors in its status model", async () => {
  const calls = [];
  const fetchImpl = successfulFetch(calls);
  const check = createReadinessCheck({
    configuration,
    fetchImpl: async (url, options) => {
      if (url.toString() === "https://api.openai.com/v1/models") {
        return new Response("unavailable", { status: 503 });
      }
      return fetchImpl(url, options);
    },
    now: () => 0,
  });

  const result = await check();

  assert.equal(result.ready, false);
  assert.equal(result.dependencies.openai.status, "error");
  assert.equal(result.dependencies.jwks.status, "ok");
});
