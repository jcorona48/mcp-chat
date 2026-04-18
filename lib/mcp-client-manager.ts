import { initializeMCPClients, type MCPServerConfig, type MCPClientManager } from './mcp-client';

class MCPClientManagerSingleton {
  private static instance: MCPClientManagerSingleton;
  private clientsMap: Map<string, MCPClientManager> = new Map();
  private toolsCache: Map<string, Record<string, any>> = new Map();

  private constructor() {}

  static getInstance(): MCPClientManagerSingleton {
    if (!MCPClientManagerSingleton.instance) {
      MCPClientManagerSingleton.instance = new MCPClientManagerSingleton();
    }
    return MCPClientManagerSingleton.instance;
  }

  async getClients(
    mcpServers: MCPServerConfig[] = [],
    abortSignal?: AbortSignal
  ): Promise<MCPClientManager> {
    const cacheKey = mcpServers
      .map(s => `${s.type}:${s.url}`)
      .sort()
      .join('|');

    // Check if we have cached tools for this config
    if (cacheKey && this.toolsCache.has(cacheKey)) {
      const cachedTools = this.toolsCache.get(cacheKey)!;
      // Return cached tools without creating new clients
      return await initializeMCPClients(mcpServers, abortSignal, cachedTools);
    }

    // If clients exist in cache, return them
    if (cacheKey && this.clientsMap.has(cacheKey)) {
      const cached = this.clientsMap.get(cacheKey)!;
      if (abortSignal) {
        abortSignal.addEventListener('abort', async () => {
          await cached.cleanup();
          this.clientsMap.delete(cacheKey);
        });
      }
      return cached;
    }

    // Initialize new clients and tools
    const clientManager = await initializeMCPClients(mcpServers, abortSignal);

    if (cacheKey) {
      // Cache both clients and tools
      this.clientsMap.set(cacheKey, clientManager);
      this.toolsCache.set(cacheKey, clientManager.tools);
      
      if (abortSignal) {
        abortSignal.addEventListener('abort', async () => {
          await clientManager.cleanup();
          this.clientsMap.delete(cacheKey);
          // Keep tools cache for future requests
        });
      }
    }

    return clientManager;
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.clientsMap.values()).map(
      manager => manager.cleanup()
    );
    await Promise.all(cleanupPromises);
    this.clientsMap.clear();
    this.toolsCache.clear();
  }
}

export const mcpClientManager = MCPClientManagerSingleton.getInstance();
