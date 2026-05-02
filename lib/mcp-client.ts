import { createMCPClient } from "@ai-sdk/mcp"
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const DEFAULT_MCP_INIT_TIMEOUT_MS = 12000;
const CHAT_DEBUG_ENABLED = process.env.CHAT_DEBUG === '1';

function mcpDebugLog(stage: string, extra?: Record<string, unknown>) {
  if (!CHAT_DEBUG_ENABLED) {
    return;
  }

  console.log(
    JSON.stringify({
      scope: 'mcp-client',
      stage,
      ...extra,
    })
  );
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export interface KeyValuePair {
  key: string;
  value: string;
}

export interface MCPServerConfig {
  url: string;
  type: 'sse' | 'http';
  headers?: KeyValuePair[];
}

export interface MCPClientManager {
  tools: Record<string, any>;
  clients: any[];
  cleanup: () => Promise<void>;
}

function createToolNameAliases(tools: Record<string, any>): Record<string, any> {
  const aliasedTools: Record<string, any> = { ...tools };

  for (const [toolName, toolImpl] of Object.entries(tools)) {
    if (toolName.includes('-')) {
      const underscoreAlias = toolName.replace(/-/g, '_');
      if (!(underscoreAlias in aliasedTools)) {
        aliasedTools[underscoreAlias] = toolImpl;
      }
    }

    if (toolName.includes('_')) {
      const hyphenAlias = toolName.replace(/_/g, '-');
      if (!(hyphenAlias in aliasedTools)) {
        aliasedTools[hyphenAlias] = toolImpl;
      }
    }
  }

  return aliasedTools;
}

/**
 * Initialize MCP clients for API calls
 * This uses the already running persistent HTTP or SSE servers
 */
export async function initializeMCPClients(
  mcpServers: MCPServerConfig[] = [],
  abortSignal?: AbortSignal,
  initTimeoutMs: number = DEFAULT_MCP_INIT_TIMEOUT_MS
): Promise<MCPClientManager> {
  mcpDebugLog('init_started', {
    serverCount: mcpServers.length,
    initTimeoutMs,
  });

  // Initialize tools
  let tools = {};
  const mcpClients: any[] = [];

  // Process each MCP server configuration
  for (const mcpServer of mcpServers) {
    try {
      const serverStartedAt = Date.now();
      mcpDebugLog('server_init_started', {
        url: mcpServer.url,
        type: mcpServer.type,
      });

      const headers = mcpServer.headers?.reduce((acc, header) => {
        if (header.key) acc[header.key] = header.value || '';
        return acc;
      }, {} as Record<string, string>);

      const transport = mcpServer.type === 'sse'
        ? {
          type: 'sse' as const,
          url: mcpServer.url,
          headers,
        }
        : new StreamableHTTPClientTransport(new URL(mcpServer.url), {
          requestInit: {
            headers,
          },
        });

      const mcpClient = await withTimeout(
        createMCPClient({ transport }),
        initTimeoutMs,
        `MCP client initialization for ${mcpServer.url}`
      );
      mcpDebugLog('server_client_created', {
        url: mcpServer.url,
        elapsedMs: Date.now() - serverStartedAt,
      });
      mcpClients.push(mcpClient);

      const mcptools = await withTimeout(
        mcpClient.tools(),
        initTimeoutMs,
        `MCP tools discovery for ${mcpServer.url}`
      );
      mcpDebugLog('server_tools_discovered', {
        url: mcpServer.url,
        elapsedMs: Date.now() - serverStartedAt,
        toolCount: Object.keys(mcptools).length,
      });

      console.log(`MCP tools from ${mcpServer.url}:`, Object.keys(mcptools));

      // Add MCP tools to tools object
      tools = { ...tools, ...mcptools };
    } catch (error) {
      console.error("Failed to initialize MCP client:", error);
      mcpDebugLog('server_init_failed', {
        url: mcpServer.url,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with other servers instead of failing the entire request
    }
  }

  // Register cleanup for all clients if an abort signal is provided
  if (abortSignal && mcpClients.length > 0) {
    abortSignal.addEventListener('abort', async () => {
      mcpDebugLog('abort_received', {
        clientCount: mcpClients.length,
      });
      await cleanupMCPClients(mcpClients);
    });
  }

  const toolsWithAliases = createToolNameAliases(tools);

  mcpDebugLog('init_finished', {
    connectedClientCount: mcpClients.length,
    mergedToolCount: Object.keys(tools).length,
    mergedToolCountWithAliases: Object.keys(toolsWithAliases).length,
  });

  return {
    tools: toolsWithAliases,
    clients: mcpClients,
    cleanup: async () => await cleanupMCPClients(mcpClients)
  };
}

/**
 * Clean up MCP clients
 */
async function cleanupMCPClients(clients: any[]): Promise<void> {
  const cleanupStartedAt = Date.now();

  await Promise.all(
    clients.map(async (client) => {
      try {
        await client.disconnect?.();
      } catch (error) {
        console.error("Error during MCP client cleanup:", error);
        mcpDebugLog('client_cleanup_failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })
  );

  mcpDebugLog('cleanup_finished', {
    clientCount: clients.length,
    elapsedMs: Date.now() - cleanupStartedAt,
  });
} 