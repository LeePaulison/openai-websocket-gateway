import { auth } from "../auth/auth.js";

export async function createContext({ request }) {
  const authContext = await auth.api.getSession({
    headers: request.headers,
  });

  return {
    authenticated: !!authContext,
    session: authContext?.session ?? null,
    user: authContext?.user ?? null,
  };
}
