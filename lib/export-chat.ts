import type { UIMessage } from "ai";

function messageToMarkdown(message: UIMessage): string {
  const role =
    message.role === "user" ? "**Usuario**" : "**Asistente**";
  const blocks: string[] = [];

  if (message.parts?.length) {
    for (const part of message.parts) {
      if (part.type === "text") {
        blocks.push(part.text);
      } else if (part.type === "reasoning") {
        const text =
          "text" in part && typeof part.text === "string"
            ? part.text
            : "reasoningText" in part && typeof part.reasoningText === "string"
              ? part.reasoningText
              : "";
        if (text) {
          blocks.push(`> *(Razonamiento)*\n>\n${text
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")}`);
        }
      } else if (part.type === "tool-invocation") {
        const invocation = (part as unknown as {
          toolInvocation: {
            toolName: string;
            state: string;
            args?: unknown;
            result?: unknown;
          };
        }).toolInvocation;
        blocks.push(`*[Herramienta: ${invocation.toolName}]*`);
        if (invocation.result !== undefined && invocation.result !== null) {
          blocks.push(
            `\`\`\`json\n${JSON.stringify(invocation.result, null, 2)}\n\`\`\``,
          );
        }
      } else if (
        part.type.startsWith("tool-") ||
        part.type === "dynamic-tool"
      ) {
        const toolPart = part as unknown as {
          toolName?: string;
          type: string;
          input?: unknown;
          output?: unknown;
        };
        const toolName = toolPart.toolName ?? part.type;
        blocks.push(`*[Herramienta: ${toolName}]*`);
        const output = toolPart.output;
        if (output !== undefined && output !== null) {
          blocks.push(
            `\`\`\`json\n${JSON.stringify(output, null, 2)}\n\`\`\``,
          );
        }
      }
    }
  }

  const body = blocks.filter(Boolean).join("\n\n");
  return `## ${role}\n\n${body}`;
}

export function conversationToMarkdown(messages: UIMessage[]): string {
  const header = `# Conversación exportada\n\n_Fecha: ${new Date().toLocaleString()}_\n\n---\n\n`;
  const body = messages
    .map(messageToMarkdown)
    .filter(Boolean)
    .join("\n\n---\n\n");
  return `${header}${body}\n`;
}

export function downloadConversation(
  messages: UIMessage[],
  format: "markdown" | "json" = "markdown",
  filename = `chat-${new Date().toISOString().slice(0, 10)}`,
): void {
  let content: string;
  let mime: string;
  let extension: string;

  if (format === "json") {
    content = JSON.stringify(messages, null, 2);
    mime = "application/json";
    extension = "json";
  } else {
    content = conversationToMarkdown(messages);
    mime = "text/markdown";
    extension = "md";
  }

  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
