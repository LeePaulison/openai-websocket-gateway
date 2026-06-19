import { createYoga, createSchema } from "graphql-yoga";

import { typeDefs } from "./graphql/schema.js";
import { resolvers } from "./graphql/resolvers/index.js";

import { createContext } from "./graphql/context.js";

export const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  context: createContext,
  graphqlEndpoint: "/graphql",
});
