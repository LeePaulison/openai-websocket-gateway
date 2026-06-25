import { auth } from "../auth/auth.js";
import {
  createPreferences,
  getPreferencesByUserId,
} from "../repositories/preferencesRepository.js";

export async function createContext({ request }) {
  const authContext = await auth.api.getSession({
    headers: request.headers,
  });

  let preferences = null;

  if (authContext?.user) {
    preferences = await getPreferencesByUserId(authContext.user.id);

    if (!preferences) {
      preferences = await createPreferences(authContext.user.id);
    }
  }

  return {
    authenticated: !!authContext,
    session: authContext?.session ?? null,
    user: authContext?.user ?? null,
    preferences: preferences ?? null,
  };
}
