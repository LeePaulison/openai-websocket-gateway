import { openai } from "./client.js";

export async function createChatStream(userMessage) {
  return openai.chat.completions.create({
    model: "gpt-4.1-mini",

    stream: true,

    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: userMessage,
      },
    ],
  });
}
