function trimTrailingSlash(value) {
  return value?.replace(/\/$/, "");
}

function requireValue(name, value) {
  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

function positiveInteger(name, value, fallback) {
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function jwtAlgorithms(value) {
  const supported = new Set(["EdDSA", "ES256", "RS256"]);
  const algorithms = (value || "RS256").split(",").map((item) => item.trim()).filter(Boolean);
  if (!algorithms.length || algorithms.some((algorithm) => !supported.has(algorithm))) {
    throw new Error("JWT_ALGORITHMS contains an unsupported algorithm");
  }
  return algorithms;
}

function resolveJwksUrl(apiOrigin) {
  const configuredUrl = new URL(process.env.JWKS_URL || apiOrigin);

  if (configuredUrl.pathname === "/") {
    return new URL("/api/auth/jwks", configuredUrl).href;
  }

  return configuredUrl.href;
}

export function getServerConfiguration() {
  const legacyOrigin = trimTrailingSlash(process.env.NEXTJS_ORIGIN);
  const apiOrigin = trimTrailingSlash(process.env.API_ORIGIN) || legacyOrigin;
  const clientOrigin =
    trimTrailingSlash(process.env.CLIENT_ORIGIN) || legacyOrigin;

  return {
    apiOrigin: requireValue("API_ORIGIN", apiOrigin),
    clientOrigin: requireValue("CLIENT_ORIGIN", clientOrigin),
    corsOrigin:
      trimTrailingSlash(process.env.CORS_ORIGIN) ||
      clientOrigin ||
      "http://localhost:3000",
    jwtIssuer: process.env.JWT_ISSUER || clientOrigin,
    jwtAudience: process.env.JWT_AUDIENCE || clientOrigin,
    jwtAlgorithms: jwtAlgorithms(process.env.JWT_ALGORITHMS),
    jwksUrl: resolveJwksUrl(apiOrigin),
    host: process.env.HOST || "0.0.0.0",
    port: Number(process.env.PORT) || 8080,
    maxPayloadBytes: positiveInteger("MAX_PAYLOAD_BYTES", process.env.MAX_PAYLOAD_BYTES, 640 * 1024),
    messagesPerMinute: positiveInteger("MESSAGES_PER_MINUTE", process.env.MESSAGES_PER_MINUTE, 30),
    maxConnections: positiveInteger("MAX_CONNECTIONS", process.env.MAX_CONNECTIONS, 1000),
    authenticationTimeoutMs: positiveInteger(
      "AUTHENTICATION_TIMEOUT_MS",
      process.env.AUTHENTICATION_TIMEOUT_MS,
      10_000,
    ),
    graphqlTimeoutMs: positiveInteger("GRAPHQL_TIMEOUT_MS", process.env.GRAPHQL_TIMEOUT_MS, 10_000),
    streamIdleTimeoutMs: positiveInteger(
      "STREAM_IDLE_TIMEOUT_MS",
      process.env.STREAM_IDLE_TIMEOUT_MS,
      120_000,
    ),
    heartbeatIntervalMs: positiveInteger(
      "HEARTBEAT_INTERVAL_MS",
      process.env.HEARTBEAT_INTERVAL_MS,
      30_000,
    ),
    readinessTimeoutMs: positiveInteger(
      "READINESS_TIMEOUT_MS",
      process.env.READINESS_TIMEOUT_MS,
      5_000,
    ),
    readinessCacheMs: positiveInteger(
      "READINESS_CACHE_MS",
      process.env.READINESS_CACHE_MS,
      30_000,
    ),
  };
}
