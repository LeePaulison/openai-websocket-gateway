// lib/logger.js
export const logger = {
  info(message, meta = {}) {
    console.log(JSON.stringify({ level: "info", message, ...meta }));
  },

  warn(message, meta = {}) {
    console.warn(JSON.stringify({ level: "warn", message, ...meta }));
  },

  error(message, error, meta = {}) {
    console.error(
      JSON.stringify({
        level: "error",
        message,
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        },
        ...meta,
      }),
    );
  },
};
