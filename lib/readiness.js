const OPENAI_MODELS_URL = "https://api.openai.com/v1/models";

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  return fetchImpl(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function requireOk(response, dependency) {
  if (!response.ok) {
    throw new Error(`${dependency} returned status ${response.status}`);
  }
  await response.body?.cancel();
}

export function createReadinessCheck({
  configuration,
  fetchImpl = fetch,
  now = Date.now,
}) {
  let cached;
  let cacheExpiresAt = 0;
  let inFlight;

  async function checkOpenAi() {
    const response = await fetchWithTimeout(fetchImpl, OPENAI_MODELS_URL, {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    }, configuration.readinessTimeoutMs);
    await requireOk(response, "OpenAI");
  }

  async function checkJwks() {
    const response = await fetchWithTimeout(
      fetchImpl,
      configuration.jwksUrl,
      {},
      configuration.readinessTimeoutMs,
    );
    if (!response.ok) throw new Error(`JWKS returned status ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body.keys) || body.keys.length === 0) {
      throw new Error("JWKS did not contain signing keys");
    }
  }

  async function checkGraphql() {
    const response = await fetchWithTimeout(fetchImpl, new URL("/api/graphql", configuration.apiOrigin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "query Readiness { __typename }" }),
    }, configuration.readinessTimeoutMs);
    if (!response.ok) throw new Error(`GraphQL returned status ${response.status}`);
    const body = await response.json();
    if (body.errors?.length || !body.data?.__typename) {
      throw new Error("GraphQL readiness query failed");
    }
  }

  async function checkApplication() {
    const response = await fetchWithTimeout(
      fetchImpl,
      configuration.apiOrigin,
      {},
      configuration.readinessTimeoutMs,
    );
    await requireOk(response, "Application");
  }

  async function run() {
    const checks = { openai: checkOpenAi, jwks: checkJwks, graphql: checkGraphql, application: checkApplication };
    const entries = await Promise.all(Object.entries(checks).map(async ([name, check]) => {
      try {
        await check();
        return [name, { status: "ok" }];
      } catch (error) {
        return [name, { status: "error", error: error.message }];
      }
    }));
    const dependencies = Object.fromEntries(entries);
    const ready = Object.values(dependencies).every((dependency) => dependency.status === "ok");
    return {
      ready,
      checkedAt: new Date(now()).toISOString(),
      dependencies,
    };
  }

  return async function checkReadiness() {
    const currentTime = now();
    if (cached && currentTime < cacheExpiresAt) return cached;
    if (inFlight) return inFlight;

    inFlight = run().then((result) => {
      cached = result;
      cacheExpiresAt = now() + (result.ready ? configuration.readinessCacheMs : 5_000);
      return result;
    }).finally(() => { inFlight = undefined; });
    return inFlight;
  };
}
