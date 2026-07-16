import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import { createWebSocketConnectionHandler } from "../lib/websocket/connectionHandler.js";

class TestSocket extends EventEmitter {
  OPEN = 1;
  readyState = 1;
  sent = [];
  closed = null;

  send(value) {
    this.sent.push(JSON.parse(value));
  }

  close(code, reason) {
    this.closed = { code, reason };
    this.readyState = 3;
    this.emit("close");
  }
}

const request = { socket: { remoteAddress: "127.0.0.1" } };
const logger = { info() {}, warn() {}, error() {} };
const tick = () => new Promise((resolve) => setImmediate(resolve));

function dependencies(overrides = {}) {
  return {
    verifyAuthenticationToken: async () => ({ sub: "user-1" }),
    getPreferences: async () => ({
      defaultModelId: "gpt-test",
      defaultAgentId: "agent-test",
      defaultReasoningId: "medium",
      defaultVerbosityId: "medium",
      temperature: 0.5,
    }),
    getAiModelById: async () => ({ modelId: "gpt-test" }),
    getAiAgentById: async () => ({ systemPrompt: "Be helpful" }),
    createChatStream: async () => (async function* () {})(),
    saveConversationTurn: async () => ({ conversationId: "conversation-1" }),
    logger,
    ...overrides,
  };
}

async function connect(overrides = {}) {
  const socket = new TestSocket();
  createWebSocketConnectionHandler(dependencies(overrides))(socket, request);
  socket.emit("message", Buffer.from(JSON.stringify({
    type: "authenticate",
    payload: { token: "valid-token" },
  })));
  await tick();
  return socket;
}

function send(socket, type, payload) {
  socket.emit("message", Buffer.from(JSON.stringify({ type, payload })));
}

test("authentication must be the first valid client message", async () => {
  const socket = new TestSocket();
  createWebSocketConnectionHandler(dependencies())(socket, request);

  send(socket, "chat_message", { content: "hello", conversationId: null });
  await tick();

  assert.equal(socket.sent[0].type, "authentication_error");
  assert.deepEqual(socket.closed, { code: 1008, reason: "Authentication required" });
});

test("failed JWT verification rejects and closes the connection", async () => {
  const socket = new TestSocket();
  createWebSocketConnectionHandler(dependencies({
    verifyAuthenticationToken: async () => { throw new Error("bad signature"); },
  }))(socket, request);

  send(socket, "authenticate", { token: "invalid-token" });
  await tick();

  assert.equal(socket.sent[0].payload.message, "Authentication failed");
  assert.equal(socket.closed.code, 1008);
});

test("unauthenticated sockets time out", async () => {
  const socket = new TestSocket();
  createWebSocketConnectionHandler(dependencies({ authenticationTimeoutMs: 5 }))(socket, request);

  await new Promise((resolve) => setTimeout(resolve, 15));

  assert.equal(socket.sent[0].payload.message, "Authentication timed out");
  assert.equal(socket.closed.code, 1008);
});

test("invalid JSON and invalid chat payloads return protocol errors", async () => {
  const socket = await connect();

  socket.emit("message", Buffer.from("not json"));
  send(socket, "chat_message", { content: "  ", conversationId: null });
  send(socket, "chat_message", { content: "hello", conversationId: 123 });
  await tick();

  assert.deepEqual(socket.sent.slice(1).map((message) => message.payload.message), [
    "Failed to process websocket request.",
    "Invalid message content",
    "Invalid conversation ID",
  ]);
});

test("successful streams emit chunks, persist the complete turn, and finish", async () => {
  let savedInput;
  const socket = await connect({
    createChatStream: async () => (async function* () {
      yield { type: "response.output_text.delta", delta: "Hello" };
      yield { type: "response.output_text.delta", delta: " there" };
    })(),
    saveConversationTurn: async (input) => {
      savedInput = input;
      return { conversationId: "conversation-1", preview: "Hi" };
    },
  });

  send(socket, "chat_message", { content: "  Hi  ", conversationId: null });
  await tick();
  await tick();

  assert.deepEqual(socket.sent.slice(1).map((message) => message.type), [
    "chat_chunk",
    "chat_chunk",
    "chat_complete",
  ]);
  assert.equal(savedInput.token, "valid-token");
  assert.equal(savedInput.userMessage, "Hi");
  assert.equal(savedInput.assistantMessage, "Hello there");
});

test("upstream and persistence failures return a stable client error", async () => {
  const streamFailure = await connect({
    createChatStream: async () => (async function* () {
      yield { type: "response.failed", response: { error: { message: "provider unavailable" } } };
    })(),
  });
  send(streamFailure, "chat_message", { content: "Hi", conversationId: null });
  await tick();
  await tick();

  const persistenceFailure = await connect({
    saveConversationTurn: async () => { throw new Error("database unavailable"); },
  });
  send(persistenceFailure, "chat_message", { content: "Hi", conversationId: null });
  await tick();
  await tick();

  assert.equal(streamFailure.sent.at(-1).payload.message, "Failed to process websocket request.");
  assert.equal(persistenceFailure.sent.at(-1).payload.message, "Failed to process websocket request.");
});

test("a second message is rejected while a stream is active", async () => {
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  const socket = await connect({
    createChatStream: async () => {
      await blocked;
      return (async function* () {})();
    },
  });

  send(socket, "chat_message", { content: "first", conversationId: null });
  await tick();
  send(socket, "chat_message", { content: "second", conversationId: null });
  await tick();

  assert.equal(socket.sent.at(-1).payload.message, "A chat request is already in progress");
  release();
  await tick();
});

test("oversized messages close the connection before parsing", async () => {
  const socket = new TestSocket();
  createWebSocketConnectionHandler(dependencies({ maxPayloadBytes: 8 }))(socket, request);

  socket.emit("message", Buffer.from("123456789"));
  await tick();

  assert.deepEqual(socket.closed, { code: 1009, reason: "Message too large" });
});

test("message flooding is rate limited and closes the connection", async () => {
  const socket = await connect({ messagesPerMinute: 1 });

  send(socket, "unsupported", {});
  await tick();
  send(socket, "unsupported", {});
  await tick();

  assert.equal(socket.sent.at(-1).payload.message, "Message rate limit exceeded");
  assert.deepEqual(socket.closed, { code: 1008, reason: "Rate limit exceeded" });
});

test("a stalled OpenAI stream times out and releases the request", async () => {
  let cancelled = false;
  const socket = await connect({
    streamIdleTimeoutMs: 5,
    createChatStream: async () => ({
      [Symbol.asyncIterator]() {
        return {
          next: () => new Promise(() => {}),
          return: async () => {
            cancelled = true;
            return { done: true };
          },
        };
      },
    }),
  });

  send(socket, "chat_message", { content: "Hi", conversationId: null });
  await new Promise((resolve) => setTimeout(resolve, 15));

  assert.equal(socket.sent.at(-1).payload.message, "Failed to process websocket request.");
  assert.equal(cancelled, true);
});
