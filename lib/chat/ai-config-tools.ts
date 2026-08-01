import { tool } from "ai";
import { z } from "zod";

export const ADD_MCP_SERVER_TOOL = "addMcpServer";

export interface ProposedMcpServer {
  id: string;
  name: string;
  url: string;
  type: "http" | "sse";
  description?: string;
  headers?: { key: string; value: string }[];
}

const headerSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

interface ExistingServerInfo {
  name?: string;
  url: string;
  type: "sse" | "http";
  headers?: { key: string; value: string }[];
}

function normalizeUrl(url: string): string {
  try {
    return new URL(url).toString().replace(/\/+$/, "");
  } catch {
    return url.trim().replace(/\/+$/, "");
  }
}

export function createAiConfigTools(existingServers: ExistingServerInfo[] = []) {
  return {
    [ADD_MCP_SERVER_TOOL]: tool({
      description:
        "Propose an MCP (Model Context Protocol) server configuration. Use this when the user asks to add, connect, set up, or UPDATE an MCP server, or wants to use tools from a new server. The result is a PROPOSAL ONLY: it is NOT applied and the server is NOT connected until the user clicks Apply in the chat. If the proposed name or URL matches a server that already exists, the result marks it as an update so the user can apply the changes in one click.",
      inputSchema: z.object({
        name: z.string().describe("A short, descriptive name for the server"),
        url: z
          .string()
          .url()
          .describe("Full HTTP(S) endpoint URL of the MCP server"),
        type: z
          .enum(["http", "sse"])
          .optional()
          .describe(
            "Transport type. Prefer http (Streamable HTTP) unless the server only supports SSE."
          ),
        description: z
          .string()
          .optional()
          .describe("Optional short description of the server"),
        headers: z
          .array(headerSchema)
          .optional()
          .describe("Optional HTTP headers, e.g. an Authorization token"),
      }),
      execute: async ({ name, url, type, description, headers }) => {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return {
            ok: false as const,
            error: "The URL must use http or https.",
          };
        }

        const cleanHeaders = (headers ?? [])
          .map((h) => ({ key: h.key.trim(), value: h.value.trim() }))
          .filter((h) => h.key.length > 0);

        const server: ProposedMcpServer = {
          id: crypto.randomUUID(),
          name: name.trim(),
          url,
          type: type ?? "http",
          ...(description ? { description } : {}),
          headers: cleanHeaders,
        };

        const match = existingServers.find(
          (s) =>
            (s.name && s.name.toLowerCase() === server.name.toLowerCase()) ||
            normalizeUrl(s.url) === normalizeUrl(server.url)
        );

        const isUpdate = Boolean(match);

        return {
          ok: true as const,
          pending: true as const,
          server,
          isUpdate,
          existingServer: match
            ? {
                name: match.name ?? null,
                url: match.url,
                type: match.type,
                headers: match.headers ?? [],
              }
            : null,
          message: isUpdate
            ? `This server already exists (${
                match!.name ?? match!.url
              }). This is an UPDATE proposal and is NOT applied yet. Wait for the user to review and apply it before assuming the server is connected.`
            : "Proposal created, but it is NOT applied yet. The user must click Apply in the chat for it to take effect. Do not assume the server is connected and do not try to use its tools until the user confirms.",
        };
      },
    }),
  };
}
