import { openai } from "./client.js";

export async function createChatStream({ message, preferences }) {
  const { model = "gpt-4.1-mini", temperature = 0.7 } = preferences ?? {};

  console.log("Creating chat stream:", preferences);

  return openai.chat.completions.create({
    model,
    temperature,
    stream: true,
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: message,
      },
    ],
  });
}
