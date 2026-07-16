import assert from "node:assert/strict";
import test from "node:test";

import { graphqlRequest } from "../lib/graphql/request.js";

test("GraphQL requests require a JWT before making a network call", async () => {
  await assert.rejects(
    graphqlRequest({ token: "", query: "query Test { test }" }),
    /JWT is required/,
  );
});

test("GraphQL HTTP failures and GraphQL errors are surfaced", async (t) => {
  const originalFetch = globalThis.fetch;
  const originalApiOrigin = process.env.API_ORIGIN;
  const originalClientOrigin = process.env.CLIENT_ORIGIN;
  process.env.API_ORIGIN = "https://api.example.test";
  process.env.CLIENT_ORIGIN = "https://client.example.test";
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalApiOrigin === undefined) delete process.env.API_ORIGIN;
    else process.env.API_ORIGIN = originalApiOrigin;
    if (originalClientOrigin === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = originalClientOrigin;
  });

  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(
    graphqlRequest({ token: "token", query: "query Test { test }" }),
    /status 503/,
  );

  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ errors: [{ message: "Unauthorized" }] }),
  });
  await assert.rejects(
    graphqlRequest({ token: "token", query: "query Test { test }" }),
    /Unauthorized/,
  );
});
