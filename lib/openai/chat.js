import { openai } from "./client.js";

export async function createChatStream({
  message,
  model,
  temperature = 0.7,
  reasoningLevel = null,
  verbosityLevel = null,
  systemPrompt = "You are a helpful assistant.",
}) {
  if (!message) throw new Error("message is required");
  if (!model) throw new Error("model is required");
  if (!model.modelId) throw new Error("modelId is required");

  const messageObj = {
    model: model.modelId,
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
  };

  if (model.supportsTemperature) messageObj.temperature = temperature;
  if (model.supportsReasoning)
    messageObj.reasoning = {
      effort: reasoningLevel.levelId,
    };
  if (model.supportsVerbosity) messageObj.verbosity = verbosityLevel.levelId;
  if (model.supportsStreaming) messageObj.stream = true;

  return openai.chat.completions.create(messageObj);
}
