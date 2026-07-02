import { openai } from "./client.js";

export async function createChatStream({
  message,
  model = "gpt-4.1-mini",
  temperature = 0.7,
  systemPrompt = "You are a helpful assistant.",
}) {
  console.log(
    "Creating chat stream:",
    message,
    model,
    temperature,
    systemPrompt,
  );

  return openai.chat.completions.create({
    model,
    temperature,
    stream: true,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: message,
      },
    ],
  });
}
