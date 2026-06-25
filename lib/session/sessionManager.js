const sessions = new Map();

export const register = (userId, preferences) => {
  sessions.set(userId, preferences);
};

export const getPreferences = (userId) => {
  return sessions.get(userId);
};

export const remove = (userId) => {
  sessions.delete(userId);
};

export const update = (userId, preferences) => {
  sessions.set(userId, preferences);
};
