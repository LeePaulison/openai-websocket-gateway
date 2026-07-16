const REDACTED_KEYS = /authorization|cookie|password|secret|token|content|prompt/i;

function sanitize(value, key = "") {
  if (REDACTED_KEYS.test(key)) return "[REDACTED]";
  if (typeof value === "string") return value.replace(/[\r\n\t]/g, " ");
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, sanitize(childValue, childKey)]),
    );
  }
  return value;
}

function write(level, message, meta = {}) {
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
