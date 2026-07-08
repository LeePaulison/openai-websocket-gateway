import { betterAuth } from "better-auth";
import { oAuthProxy } from "better-auth/plugins";

import { db } from "../lib/db/sqlite.js";

export const auth = betterAuth({
  database: db,

  trustedOrigins: [process.env.CORS_ORIGIN ?? "http://localhost:3001"],

  plugins: [
    oAuthProxy({
      productionURL: "https://saigely-server.fly.dev",
      secret: process.env.OAUTH_PROXY_SECRET,
    }),
  ],

  emailAndPassword: {
    enabled: false,
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
});
