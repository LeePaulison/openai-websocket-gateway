import { graphqlRequest } from "../lib/graphql/request.js";

const PREFERENCES_FIELDS = `
  userId
  theme
  defaultModelId
  temperature
  defaultReasoningId
  defaultVerbosityId
  defaultAgentId
`;

export async function getPreferences({ token }) {
  const data = await graphqlRequest({
    token,
    query: `
      query Preferences {
        preferences {
          ${PREFERENCES_FIELDS}
        }
      }
    `,
  });

  return data.preferences;
}

export function createPreferences({ token }) {
  return getPreferences({ token });
}

export async function updatePreferences({ token, ...input }) {
  const data = await graphqlRequest({
    token,
    query: `
      mutation UpdatePreferences($input: UpdatePreferencesInput!) {
        updatePreferences(input: $input) {
          ${PREFERENCES_FIELDS}
        }
      }
    `,
    variables: { input },
  });

  return data.updatePreferences;
}
