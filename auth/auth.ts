/**
 * This file exists solely for Better Auth CLI table generation.
 * The application runtime uses auth.js.
 * Keep the configuration in sync if authentication settings change.
 */

import { betterAuth } from "better-auth";

import { db } from "../lib/db/sqlite.js";

export const auth = betterAuth({
  database: db,

  trustedOrigins: [process.env.CORS_ORIGIN ?? "http://localhost:3001"],

  emailAndPassword: {
    enabled: false,
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
});
