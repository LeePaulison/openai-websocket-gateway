# OpenAI WebSocket Gateway

An authenticated WebSocket gateway for streaming responses from the OpenAI Responses API. It delegates identity, response configuration, and conversation persistence to a required GraphQL API, keeping the streaming service independent from any one frontend.

The gateway was originally built for Saigely, which remains its reference implementation and production consumer. Its contracts are application-neutral so another project can provide the same API and use the gateway without adopting Saigely-specific code.

## Responsibilities

The gateway:

- accepts WebSocket connections at `/ws` from one configured browser origin;
- requires a JWT as the first client message;
- verifies JWTs against a remote JWKS endpoint;
- obtains the user's response preferences, model capabilities, and agent prompt from GraphQL;
- streams OpenAI text deltas to the client; and
- persists the completed user and assistant turn through GraphQL.

It also exposes `GET /health`, which returns:

```json
{"status":"ok"}
```

## Requirements

- Node.js 22+
- an OpenAI API key
- a JWT issuer with a remotely accessible JWKS endpoint
- a GraphQL API implementing the contract below

Install dependencies and start the development server:

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | OpenAI API key used by the gateway. |
| `API_ORIGIN` | Yes | Origin hosting `/api/graphql`. |
| `CLIENT_ORIGIN` | Yes | Exact browser origin allowed to open WebSocket connections. |
| `JWT_ISSUER` | Yes | Expected JWT `iss` claim. Defaults to `CLIENT_ORIGIN` for compatibility. |
| `JWT_AUDIENCE` | Yes | Expected JWT `aud` claim. Defaults to `CLIENT_ORIGIN` for compatibility. |
| `JWKS_URL` | Yes | Full JWKS URL or its origin. An origin resolves to `/api/auth/jwks`. |
| `CORS_ORIGIN` | No | HTTP CORS origin. Defaults to `CLIENT_ORIGIN`. |
| `HOST` | No | Listen address. Defaults to `0.0.0.0`. |
| `PORT` | No | Listen port. Defaults to `8080`. |
| `NEXTJS_ORIGIN` | No | Legacy fallback for `API_ORIGIN` and `CLIENT_ORIGIN`. |

Values ending with `/` are normalized. WebSocket origin matching remains exact after normalization.

## WebSocket protocol

Connect to `wss://your-gateway.example/ws`. The client must authenticate within 10 seconds, and authentication must be its first message.

### Authenticate

```json
{
  "type": "authenticate",
  "payload": {
    "token": "<jwt>"
  }
}
```

Success:

```json
{"type":"authenticated"}
```

Failure produces `authentication_error` and closes the connection with code `1008`.

### Send a chat message

For a new conversation, use `null` as the conversation ID:

```json
{
  "type": "chat_message",
  "payload": {
    "content": "Explain WebSocket backpressure.",
    "conversationId": null
  }
}
```

For an existing conversation, send its non-empty string ID.

### Receive streamed output

Each OpenAI text delta is sent as:

```json
{
  "type": "chat_chunk",
  "payload": {
    "content": "WebSockets"
  }
}
```

After streaming finishes and the turn is persisted, the gateway sends:

```json
{
  "type": "chat_complete",
  "payload": {
    "conversationId": "conversation-id",
    "preview": "Explain WebSocket backpressure.",
    "updatedAt": "2026-07-15T18:00:00.000Z"
  }
}
```

Request failures use a common envelope:

```json
{
  "type": "error",
  "payload": {
    "message": "Invalid message content"
  }
}
```

The current protocol does not assign request IDs or correlate concurrent streams. Clients should wait for `chat_complete` or `error` before sending another chat message.

## Required GraphQL API

The authenticated JWT is forwarded as `Authorization: Bearer <token>` for each GraphQL request. The API must provide these operations and compatible response shapes.

### Response preferences

```graphql
query Preferences {
  preferences {
    userId
    theme
    defaultModelId
    temperature
    defaultReasoningId
    defaultVerbosityId
    defaultAgentId
  }
}
```

### Available models

```graphql
query AiModels {
  aiModels {
    modelId
    supportsTemperature
    supportsReasoning
    supportsVerbosity
  }
}
```

The gateway selects the model matching `preferences.defaultModelId`. Capability flags determine which optional OpenAI request fields are sent.

### Agent configuration

```graphql
query AiAgentConfiguration($agentId: String!) {
  aiAgentConfiguration(agentId: $agentId) {
    agentId
    systemPrompt
  }
}
```

### Conversation persistence

```graphql
mutation SaveConversationTurn($input: SaveConversationTurnInput!) {
  saveConversationTurn(input: $input) {
    conversationId
    preview
    updatedAt
  }
}
```

`SaveConversationTurnInput` receives `conversationId`, `userMessage`, and `assistantMessage`.

## OpenAI request mapping

The gateway uses the Responses API with streaming enabled. It builds `input` from the configured agent system prompt and the incoming user message. Depending on model capabilities, it also maps:

- the user's temperature to `temperature`;
- the reasoning preference to `reasoning.effort`; and
- the verbosity preference to `text.verbosity`.

All system prompts are extended with a small set of GitHub-Flavored Markdown formatting rules.

## Deployment

The included `Dockerfile` runs the production server on port `8080`. `fly.toml` is the reference Fly.io deployment and intentionally retains the existing `saigely-server` app identifier so the production endpoint remains stable.

Set secrets without committing `.env`:

```bash
flyctl secrets set \
  OPENAI_API_KEY=... \
  API_ORIGIN=... \
  CLIENT_ORIGIN=... \
  JWT_ISSUER=... \
  JWT_AUDIENCE=... \
  JWKS_URL=...
```

Then deploy:

```bash
flyctl deploy
```

## Current scope

This project is an opinionated OpenAI chat gateway, not a general-purpose WebSocket framework. It intentionally defines authentication, GraphQL integration, prompt construction, streaming events, and persistence behavior. Those explicit contracts are what allow multiple applications to share the service safely.
