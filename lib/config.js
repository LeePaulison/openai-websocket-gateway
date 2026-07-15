function trimTrailingSlash(value) {
  return value?.replace(/\/$/, "");
}

function requireValue(name, value) {
  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
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
    jwksUrl: resolveJwksUrl(apiOrigin),
    host: process.env.HOST || "0.0.0.0",
    port: Number(process.env.PORT) || 8080,
  };
}
