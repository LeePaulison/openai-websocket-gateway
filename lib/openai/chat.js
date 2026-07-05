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

  const request = {
    model: model.modelId,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: systemPrompt,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    ],
    stream: true,
  };

  if (model.supportsTemperature) {
    request.temperature = temperature;
  }

  if (model.supportsReasoning && reasoningLevel?.levelId) {
    request.reasoning = {
      effort: reasoningLevel.levelId,
    };
  }

  if (model.supportsVerbosity && verbosityLevel?.levelId) {
    request.text = {
      verbosity: verbosityLevel.levelId,
    };
  }

  return openai.responses.create(request);
}
