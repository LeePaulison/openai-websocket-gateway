const MARKDOWN_RULES = `
## Markdown Formatting

- Format all responses as valid GitHub-Flavored Markdown.
- Wrap all source code in fenced Markdown code blocks.
- Always specify the language after the opening fence.
- Never present multi-line source code as plain text.
- Use \`bash\` code blocks for terminal commands.
`.trim();

export function buildSystemPrompt(agentPrompt) {
  return `
${agentPrompt}

${MARKDOWN_RULES}
`.trim();
}
