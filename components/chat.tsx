"use client";

import { defaultModel, type modelID } from "@/ai/providers";
import { Message, useChat } from "@ai-sdk/react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";
import { getUserId } from "@/lib/user-id";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { convertToUIMessages } from "@/lib/chat-store";
import { type Message as DBMessage } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { useMCP } from "@/lib/context/mcp-context";
import { useModelExecutionInfo } from "@/lib/hooks/use-model-execution-info";
import { ModelExecutionNotice } from "@/components/model-execution-notice";
import { useAutoModelRetry } from "@/lib/hooks/use-auto-model-retry";

// Type for chat data from DB
interface ChatData {
  id: string;
  messages: DBMessage[];
  createdAt: string;
  updatedAt: string;
}

const CHAT_DEBUG_ENABLED = process.env.NEXT_PUBLIC_CHAT_DEBUG === "1";

function debugChatClient(stage: string, extra?: Record<string, unknown>) {
  if (!CHAT_DEBUG_ENABLED) {
    return;
  }

  console.log("[chat-ui-debug]", {
    stage,
    ts: new Date().toISOString(),
    ...extra,
  });
}

export default function Chat() {
  const router = useRouter();
  const params = useParams();
  const chatId = params?.id as string | undefined;
  const queryClient = useQueryClient();
  
  const [selectedModel, setSelectedModel] = useLocalStorage<modelID>("selectedModel", defaultModel);
  const [userId, setUserId] = useState<string>('');
  const [generatedChatId, setGeneratedChatId] = useState<string>('');
  const [manualCancelRequested, setManualCancelRequested] = useState(false);
  const {
    modelExecutionInfo,
    handleModelExecutionResponse,
    resetModelExecutionInfo,
  } = useModelExecutionInfo();
  const previousStatusRef = useRef<"error" | "submitted" | "streaming" | "ready">("ready");
  const hadAssistantTextDuringRequestRef = useRef(false);
  
  // Get MCP server data from context
  const { mcpServersForApi } = useMCP();
  
  // Initialize userId
  useEffect(() => {
    setUserId(getUserId());
  }, []);
  
  // Generate a chat ID if needed
  useEffect(() => {
    if (!chatId) {
      setGeneratedChatId(nanoid());
    }
  }, [chatId]);
  
  // Use React Query to fetch chat history
  const { data: chatData, isLoading: isLoadingChat, error } = useQuery({
    queryKey: ['chat', chatId, userId] as const,
    queryFn: async ({ queryKey }) => {
      const [_, chatId, userId] = queryKey;
      if (!chatId || !userId) return null;
      
      const response = await fetch(`/api/chats/${chatId}`, {
        headers: {
          'x-user-id': userId
        }
      });
      
      if (!response.ok) {
        // For 404, return empty chat data instead of throwing
        if (response.status === 404) {
          return { id: chatId, messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        }
        throw new Error('Failed to load chat');
      }
      
      return response.json() as Promise<ChatData>;
    },
    enabled: !!chatId && !!userId,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false
  });
  
  // Handle query errors
  useEffect(() => {
    if (error) {
      console.error('Error loading chat history:', error);
      toast.error('Failed to load chat history');
    }
  }, [error]);
  
  // Prepare initial messages from query data
  const initialMessages = useMemo(() => {
    if (!chatData || !chatData.messages || chatData.messages.length === 0) {
      return [];
    }
    
    // Convert DB messages to UI format, then ensure it matches the Message type from @ai-sdk/react
    const uiMessages = convertToUIMessages(chatData.messages);
    return uiMessages.map(msg => ({
      id: msg.id,
      role: msg.role as Message['role'], // Ensure role is properly typed
      content: msg.content,
      parts: msg.parts,
    } as Message));
  }, [chatData]);
  
  const { messages, input, handleInputChange, handleSubmit, status, stop, reload } =
    useChat({
      id: chatId || generatedChatId, // Use generated ID if no chatId in URL
      initialMessages,
      maxSteps: 20,
      body: {
        selectedModel,
        mcpServers: mcpServersForApi,
        chatId: chatId || generatedChatId, // Use generated ID if no chatId in URL
        userId,
      },
      experimental_throttle: 100,
      onFinish: () => {
        resetRetryCycle();
        // Invalidate the chats query to refresh the sidebar
        if (userId) {
          queryClient.invalidateQueries({ queryKey: ['chats', userId] });
        }
      },
      onResponse: (response) => {
        handleModelExecutionResponse(response);
      },
      onError: async (error) => {
        const message =
          error.message.length > 0
            ? error.message
            : "An error occured, please try again later.";

        const retryResult = await tryAutoRetry(message);

        if (retryResult.handled && retryResult.nextModel) {
          toast.message(`Reintentando automaticamente con ${retryResult.nextModel}...`, {
            position: "top-center",
            richColors: true,
          });
          return;
        }

        if (retryResult.exhausted) {
          toast.error(
            "No se pudo completar la solicitud con ninguno de los modelos disponibles. Intenta nuevamente en unos segundos.",
            { position: "top-center", richColors: true },
          );
          return;
        }

        toast.error(message, { position: "top-center", richColors: true });
      },
    });

  const { beginRetryCycle, resetRetryCycle, tryAutoRetry } = useAutoModelRetry({
    setSelectedModel,
    reload,
  });

  useEffect(() => {
    if (status === "submitted") {
      setManualCancelRequested(false);
    }

    if (status === "submitted") {
      hadAssistantTextDuringRequestRef.current = false;
    }

    const hasAssistantText = messages.some((message) =>
      message.role === "assistant" &&
      (message.parts?.some((part) => part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0) ?? false)
    );

    if (status === "streaming" && hasAssistantText) {
      hadAssistantTextDuringRequestRef.current = true;
    }

    const wasWaiting = previousStatusRef.current === "submitted" || previousStatusRef.current === "streaming";
    const requestEndedWithoutAssistantText =
      wasWaiting &&
      status === "ready" &&
      !hadAssistantTextDuringRequestRef.current;

    debugChatClient("status_transition", {
      previousStatus: previousStatusRef.current,
      currentStatus: status,
      effectiveStatus: manualCancelRequested ? "ready" : status,
      messageCount: messages.length,
      hasAssistantText,
      requestEndedWithoutAssistantText,
      manualCancelRequested,
    });

    if (requestEndedWithoutAssistantText) {
      toast.error("La respuesta se interrumpió antes de completarse. Intenta nuevamente.", {
        position: "top-center",
        richColors: true,
      });
    }

    previousStatusRef.current = status;
  }, [status, messages]);

  const handleStop = useCallback(() => {
    setManualCancelRequested(true);
    debugChatClient("manual_stop_clicked", {
      statusBeforeStop: status,
      messageCount: messages.length,
    });
    stop();

    toast.message("Cancelando solicitud...", {
      position: "top-center",
      richColors: true,
    });
  }, [stop, status, messages.length]);
    
  // Custom submit handler
  const handleFormSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setManualCancelRequested(false);
    resetModelExecutionInfo();
    beginRetryCycle(selectedModel);
    debugChatClient("submit_clicked", {
      hasInput: input.trim().length > 0,
      currentChatId: chatId,
      generatedChatId,
      status,
    });
    
    if (!chatId && generatedChatId && input.trim()) {
      // If this is a new conversation, redirect to the chat page with the generated ID
      const effectiveChatId = generatedChatId;
      
      // Submit the form
      handleSubmit(e);
      
      // Redirect to the chat page with the generated ID
      router.push(`/chat/${effectiveChatId}`);
    } else {
      // Normal submission for existing chats
      handleSubmit(e);
    }
  }, [
    chatId,
    generatedChatId,
    input,
    handleSubmit,
    router,
    status,
    resetModelExecutionInfo,
    beginRetryCycle,
    selectedModel,
  ]);

  const effectiveStatus = manualCancelRequested ? "ready" : status;
  const isLoading = effectiveStatus === "streaming" || effectiveStatus === "submitted" || isLoadingChat;

  return (
    <div className="h-dvh flex flex-col justify-center w-full max-w-[430px] sm:max-w-3xl mx-auto px-4 sm:px-6 py-3">
      <ModelExecutionNotice info={modelExecutionInfo} />
      {messages.length === 0 && !isLoadingChat ? (
        <div className="max-w-xl mx-auto w-full">
          <ProjectOverview />
          <form
            onSubmit={handleFormSubmit}
            className="mt-4 w-full mx-auto"
          >
            <Textarea
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              handleInputChange={handleInputChange}
              input={input}
              isLoading={isLoading}
              status={effectiveStatus}
              stop={handleStop}
            />
          </form>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0 pb-2">
            <Messages messages={messages} isLoading={isLoading} status={effectiveStatus} />
          </div>
          <form
            onSubmit={handleFormSubmit}
            className="mt-2 w-full mx-auto"
          >
            <Textarea
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              handleInputChange={handleInputChange}
              input={input}
              isLoading={isLoading}
              status={effectiveStatus}
              stop={handleStop}
            />
          </form>
        </>
      )}
    </div>
  );
}
