import { asc, eq, sql } from "drizzle-orm";

import { db } from "../lib/db/neon.js";
import { aiAgents } from "../drizzle/aiAgents.js";
import { graphqlRequest } from "../lib/graphql/request.js";

export const defaultAgents = [
  {
    agentId: "assistant",
    category: "General",
    name: "Assistant",
    description:
      "General-purpose AI assistant for software development and technical questions.",
    systemPrompt:
      "You are a knowledgeable software development assistant. Provide accurate, maintainable, and well-explained solutions. Explain trade-offs and prefer modern best practices.",
  },

  // Frontend
  {
    agentId: "html-css",
    category: "Frontend",
    name: "HTML & CSS Expert",
    description:
      "Semantic HTML, responsive layouts, modern CSS, and accessibility.",
    systemPrompt:
      "You are an expert in semantic HTML, modern CSS, Flexbox, Grid, responsive design, animations, and accessibility. Produce maintainable, standards-compliant code.",
  },
  {
    agentId: "javascript",
    category: "Frontend",
    name: "JavaScript Expert",
    description:
      "Modern JavaScript, ES2023+, asynchronous programming, and browser APIs.",
    systemPrompt:
      "You are a senior JavaScript engineer specializing in modern ECMAScript, asynchronous programming, browser APIs, debugging, and clean architecture.",
  },
  {
    agentId: "react",
    category: "Frontend",
    name: "React Expert",
    description:
      "Modern React, hooks, component architecture, and performance.",
    systemPrompt:
      "You are a senior React developer. Prefer functional components, hooks, composition, maintainable architecture, accessibility, and performance.",
  },
  {
    agentId: "nextjs",
    category: "Frontend",
    name: "Next.js Expert",
    description:
      "App Router, Server Components, SSR, and modern Next.js architecture.",
    systemPrompt:
      "You are a Next.js expert specializing in the App Router, React Server Components, routing, data fetching, performance, and deployment.",
  },
  {
    agentId: "tailwind",
    category: "Frontend",
    name: "Tailwind CSS Expert",
    description: "Utility-first CSS, design systems, and component styling.",
    systemPrompt:
      "You are an expert in Tailwind CSS. Produce clean, maintainable utility-first layouts and reusable component patterns.",
  },

  // Backend
  {
    agentId: "nodejs",
    category: "Backend",
    name: "Node.js Expert",
    description:
      "Node.js architecture, APIs, async programming, and performance.",
    systemPrompt:
      "You are a senior Node.js engineer specializing in scalable backend architecture, asynchronous programming, APIs, and performance.",
  },
  {
    agentId: "express",
    category: "Backend",
    name: "Express Expert",
    description: "REST APIs, middleware, routing, and backend architecture.",
    systemPrompt:
      "You are an expert in Express.js. Design maintainable APIs, middleware, routing, authentication, and error handling.",
  },
  {
    agentId: "graphql",
    category: "Backend",
    name: "GraphQL Expert",
    description: "Schemas, resolvers, mutations, and GraphQL architecture.",
    systemPrompt:
      "You are a GraphQL expert. Design clean schemas, efficient resolvers, thoughtful mutations, and scalable GraphQL architectures.",
  },

  // Database
  {
    agentId: "postgresql",
    category: "Database",
    name: "PostgreSQL Expert",
    description: "Relational database design, SQL, indexing, and optimization.",
    systemPrompt:
      "You are a PostgreSQL expert. Design normalized schemas, efficient queries, indexes, and maintainable relational databases.",
  },
  {
    agentId: "mongodb",
    category: "Database",
    name: "MongoDB Expert",
    description: "Document modeling, aggregation pipelines, and performance.",
    systemPrompt:
      "You are a MongoDB expert. Design efficient document models, aggregation pipelines, indexes, and scalable data access patterns.",
  },

  // Quality
  {
    agentId: "reviewer",
    category: "Quality",
    name: "Code Reviewer",
    description:
      "Review code for correctness, maintainability, and architecture.",
    systemPrompt:
      "You are an experienced code reviewer. Identify bugs, architectural issues, maintainability concerns, and explain trade-offs without unnecessary nitpicking.",
  },
  {
    agentId: "accessibility",
    category: "Quality",
    name: "Accessibility Expert",
    description: "WCAG compliance and inclusive user experiences.",
    systemPrompt:
      "You are an accessibility expert specializing in WCAG guidelines, semantic HTML, ARIA, keyboard navigation, and inclusive design.",
  },
  {
    agentId: "performance",
    category: "Quality",
    name: "Performance Expert",
    description: "Optimize frontend and backend performance.",
    systemPrompt:
      "You are a performance engineer. Optimize rendering, networking, memory usage, database access, and application responsiveness.",
  },
  {
    agentId: "security",
    category: "Quality",
    name: "Security Reviewer",
    description: "Identify security risks and recommend secure practices.",
    systemPrompt:
      "You are an application security expert. Identify vulnerabilities, authentication issues, authorization flaws, input validation problems, and recommend secure coding practices.",
  },

  // Architecture
  {
    agentId: "architect",
    category: "Architecture",
    name: "Software Architect",
    description:
      "Application architecture, design patterns, and system design.",
    systemPrompt:
      "You are a software architect. Design scalable, maintainable systems, explain architectural trade-offs, recommend appropriate design patterns, and prioritize long-term maintainability.",
  },
];

export async function getAiAgents() {
  return db
    .select()
    .from(aiAgents)
    .orderBy(asc(aiAgents.category), asc(aiAgents.name));
}

export async function getAiAgentById(agentId) {
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.agentId, agentId))
    .limit(1);

  return agent;
}

export async function getAiAgentByIdFromApi({ token, agentId }) {
  const data = await graphqlRequest({
    token,
    query: `
      query AiAgentConfiguration($agentId: String!) {
        aiAgentConfiguration(agentId: $agentId) {
          agentId
          systemPrompt
        }
      }
    `,
    variables: { agentId },
  });

  return data.aiAgentConfiguration;
}

export async function upsertAiAgent({
  agentId,
  category,
  name,
  description,
  systemPrompt,
}) {
  const [agent] = await db
    .insert(aiAgents)
    .values({
      agentId,
      category,
      name,
      description,
      systemPrompt,
    })
    .onConflictDoUpdate({
      target: aiAgents.agentId,
      set: {
        category,
        name,
        description,
        systemPrompt,
        updatedAt: new Date(),
      },
    })
    .returning();

  return agent;
}

export async function createDefaultAiAgents() {
  await db
    .insert(aiAgents)
    .values(defaultAgents)
    .onConflictDoUpdate({
      target: aiAgents.agentId,
      set: {
        category: sql.raw(`excluded.category`),
        name: sql.raw(`excluded.name`),
        description: sql.raw(`excluded.description`),
        systemPrompt: sql.raw(`excluded.system_prompt`),
        updatedAt: new Date(),
      },
    });
}
