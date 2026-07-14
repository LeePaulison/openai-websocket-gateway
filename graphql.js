import { createYoga, createSchema } from "graphql-yoga";

import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers/index.js";

export const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: "/graphql",
});
