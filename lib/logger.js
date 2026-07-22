const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 500;

const REDACTED_KEY_NAMES = new Set([
  "address",
  "apikey",
  "apiKey",
  "authorization",
  "content",
  "conversationId",
  "cookie",
  "email",
  "ip",
  "jwt",
  "password",
  "phone",
  "prompt",
  "remoteAddress",
  "secret",
  "session",
  "token",
  "userId",
]);

const SECRET_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  /\bBasic\s+[A-Za-z0-9+/=-]+/gi,
  /\b(sk-[A-Za-z0-9_-]+)/g,
  /\b(eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g,
];

function sanitizeString(value) {
  let sanitized = value.replace(/[\r\n\t]/g, " ");
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, REDACTED);
  }
  if (sanitized.length > MAX_STRING_LENGTH) {
    return `${sanitized.slice(0, MAX_STRING_LENGTH)}...`;
  }
  return sanitized;
}

function shouldRedactKey(key) {
  if (!key) return false;
  if (REDACTED_KEY_NAMES.has(key)) return true;

  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    normalizedKey.endsWith("authorization") ||
    normalizedKey.endsWith("cookie") ||
    normalizedKey.endsWith("password") ||
    normalizedKey.endsWith("secret") ||
    normalizedKey.endsWith("token") ||
    normalizedKey.endsWith("content") ||
    normalizedKey.endsWith("prompt") ||
    normalizedKey.endsWith("email") ||
    normalizedKey.endsWith("phone") ||
    normalizedKey.endsWith("address") ||
    normalizedKey.endsWith("userid") ||
    normalizedKey.endsWith("conversationid") ||
    normalizedKey.endsWith("session") ||
    normalizedKey.endsWith("jwt") ||
    normalizedKey.endsWith("apikey")
  );
}

function sanitize(value, key = "", seen = new WeakSet()) {
  if (shouldRedactKey(key)) return REDACTED;
  if (typeof value === "string") return sanitizeString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return undefined;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, "", seen));
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, sanitize(childValue, childKey, seen)]),
    );
  }
  return value;
}

function write(level, message, meta = {}) {
  try {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      service: "openai-websocket-gateway",
      message: sanitize(message),
      ...sanitize(meta),
    };
    const output = JSON.stringify(record);
    if (level === "error") console.error(output);
    else if (level === "warn") console.warn(output);
    else console.log(output);
  } catch {
    // Logging must never interrupt request handling or server startup.
  }
}

export const logger = {
  info(message, meta = {}) {
    write("info", message, meta);
  },
  warn(message, meta = {}) {
    write("warn", message, meta);
  },
  error(message, error, meta = {}) {
    write("error", message, {
      ...meta,
      error: {
        name: error?.name,
        message: error?.message,
        ...(process.env.NODE_ENV !== "production" && { stack: error?.stack }),
      },
    });
  },
};
