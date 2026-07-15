import { getServerConfiguration } from "../config.js";

export async function graphqlRequest({ token, query, variables = {} }) {
  const { apiOrigin } = getServerConfiguration();

  if (typeof token !== "string" || token.length === 0) {
    throw new Error("A JWT is required for GraphQL requests");
  }

  const response = await fetch(new URL("/api/graphql", apiOrigin), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const result = await response.json();

  if (result.errors?.length) {
    throw new Error(result.errors[0]?.message || "GraphQL request failed");
  }

  return result.data;
}
