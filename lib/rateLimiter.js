export function createFixedWindowRateLimiter({
  limit,
  windowMs = 60_000,
  maxEntries = 10_000,
  now = Date.now,
}) {
  const windows = new Map();
  let lastCleanupAt = now();

  function cleanup(currentTime) {
    if (currentTime - lastCleanupAt < windowMs) return;

    for (const [key, window] of windows) {
      if (currentTime - window.startedAt >= windowMs) {
        windows.delete(key);
      }
    }
    lastCleanupAt = currentTime;
  }

  return {
    check(key) {
      const currentTime = now();
      cleanup(currentTime);

      let window = windows.get(key);
      if (!window || currentTime - window.startedAt >= windowMs) {
        if (!window && windows.size >= maxEntries) {
          return { allowed: false, reason: "capacity" };
        }
        window = { startedAt: currentTime, count: 0 };
        windows.set(key, window);
      }

      window.count += 1;
      return {
        allowed: window.count <= limit,
        reason: window.count <= limit ? null : "limit",
      };
    },
    size() {
      return windows.size;
    },
  };
}
