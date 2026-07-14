export async function graphqlRequest({ token, query, variables = {} }) {
  const nextjsOrigin = process.env.NEXTJS_ORIGIN?.replace(/\/$/, "");

  if (!nextjsOrigin) {
    throw new Error("NEXTJS_ORIGIN is not defined");
  }

  if (typeof token !== "string" || token.length === 0) {
    throw new Error("A JWT is required for GraphQL requests");
  }

  const response = await fetch(new URL("/api/graphql", nextjsOrigin), {
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
