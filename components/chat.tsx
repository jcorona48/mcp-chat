"use client";

import { defaultModel, type modelID } from "@/ai/providers";
import { UIMessage, useChat } from "@ai-sdk/react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { toast } from "sonner";
import { useParams } from "next/navigation";
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
import { DefaultChatTransport } from "ai";
import { fetchWithErrorHandlers } from "@/lib/utils";
import { useDataStream } from "@/providers/data-stream-provider";
import { ChatMessage } from "@/lib/types";
import { useRouter } from "next/navigation";
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
    const params = useParams();
    const chatId = params?.id as string | undefined;
    const queryClient = useQueryClient();
    const [isMounted, setIsMounted] = useState(false);

    const [selectedModel, setSelectedModel] = useLocalStorage<modelID>(
        "selectedModel",
        defaultModel,
    );
    const [userId, setUserId] = useState<string>(() => getUserId());
    const [generatedChatId] = useState<string>(() =>
        typeof window === "undefined" ? "" : nanoid(),
    );
    const [input, setInput] = useState("");
    const hydratedChatIdRef = useRef<string | null>(null);
    const activeChatId = chatId || generatedChatId;
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (!userId) {
            const newUserId = getUserId();
            setUserId(newUserId);
        }
    }, [userId]);

    const handleInputChange = (
        event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        setInput(event.target.value);
    };

    // Get MCP server data from context
    const { mcpServersForApi } = useMCP();

    // Use React Query to fetch chat history
    const {
        data: chatData,
        isLoading: isLoadingChat,
        error,
    } = useQuery({
        queryKey: ["chat", chatId, userId] as const,
        queryFn: async ({ queryKey }) => {
            const [_, chatId, userId] = queryKey;
            if (!chatId || !userId) return null;

            const response = await fetch(`/api/chats/${chatId}`, {
                headers: {
                    "x-user-id": userId,
                },
            });

            if (!response.ok) {
                // For 404, return empty chat data instead of throwing
                if (response.status === 404) {
                    return {
                        id: chatId,
                        messages: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                }
                throw new Error("Failed to load chat");
            }

            return response.json() as Promise<ChatData>;
        },
        enabled: isMounted && !!chatId && !!userId,
        retry: 1,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
    });

    // Handle query errors
    useEffect(() => {
        if (error) {
            console.error("Error loading chat history:", error);
            toast.error("Failed to load chat history");
        }
    }, [error]);

    // Prepare initial messages from query data
    const initialMessages = useMemo(() => {
        if (!chatData || !chatData.messages || chatData.messages.length === 0) {
            return [];
        }

        // Convert DB messages to UI format, then ensure it matches the Message type from @ai-sdk/react
        const uiMessages = convertToUIMessages(chatData.messages);
        return uiMessages.map(
            (msg) =>
                ({
                    id: msg.id,
                    role: msg.role as UIMessage["role"], // Ensure role is properly typed
                    content: msg.content,
                    parts: msg.parts,
                }) as UIMessage,
        );
    }, [chatData]);

    const transportConfigRef = useRef({
        selectedModel,
        mcpServers: mcpServersForApi,
        chatId: activeChatId,
        userId,
    });

    transportConfigRef.current = {
        selectedModel,
        mcpServers: mcpServersForApi,
        chatId: activeChatId,
        userId,
    };

    useEffect(() => {
        console.log("[chat-ui] model changed", transportConfigRef.current.selectedModel);
    }, [selectedModel]);

    const {
        messages,
        setMessages,
        sendMessage,
        status,
        stop,
        regenerate,
        resumeStream,
        addToolApprovalResponse,
    } = useChat<ChatMessage>({
        id: activeChatId,
        generateId: () => nanoid(),
        sendAutomaticallyWhen: ({ messages: currentMessages }) => {
            const lastMessage = currentMessages.at(-1);
            return (
                lastMessage?.parts?.some(
                    (part) =>
                        "state" in part &&
                        part.state === "approval-responded" &&
                        "approval" in part &&
                        (part.approval as { approved?: boolean })?.approved ===
                            true,
                ) ?? false
            );
        },
        transport: new DefaultChatTransport({
            api: "/api/chat",
            fetch: fetchWithErrorHandlers,
            prepareSendMessagesRequest: ({ messages }) => {
                const config = transportConfigRef.current;
                console.log("[chat-ui] sendMessages", {
                    selectedModel: config.selectedModel,
                    activeChatId: config.chatId,
                    userId: config.userId,
                    messageCount: messages.length,
                });
                return {
                    body: {
                        selectedModel: config.selectedModel,
                        mcpServers: config.mcpServers,
                        chatId: config.chatId,
                        userId: config.userId,
                        messages,
                    },
                };
            },
        }),
        experimental_throttle: 100,
        onFinish: () => {
            if (userId) {
                // Refresh the chats list (sidebar)
                queryClient.invalidateQueries({ queryKey: ["chats", userId] });

                // Also invalidate the active chat metadata so title updates are fetched
                const activeKey = ["chat", activeChatId, userId] as const;
                queryClient.invalidateQueries({ queryKey: activeKey });
            }
        },
        onError: async (error) => {
            const message =
                error.message.length > 0
                    ? error.message
                    : "An error occured, please try again later.";
            toast.error(message, { position: "top-center", richColors: true });
        },
    });

    useEffect(() => {
        if (!isMounted || !chatId || initialMessages.length === 0) {
            return;
        }

        if (hydratedChatIdRef.current === chatId) {
            return;
        }

        if (messages.length === 0) {
            setMessages(initialMessages);
        }
        hydratedChatIdRef.current = chatId;
    }, [chatId, initialMessages, isMounted, messages.length, setMessages]);

    const handleSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!input.trim()) return;

            debugChatClient("submit", {
                inputLength: input.length,
                chatId,
                generatedChatId,
                status,
            });

            if (!chatId && generatedChatId && typeof window !== "undefined") {
                router.push(`/chat/${generatedChatId}`);
            }

            sendMessage({ text: input });
            setInput("");
        },
        [input, sendMessage, chatId, generatedChatId, status],
    );

    // Custom submit handler
    const handleFormSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            debugChatClient("submit_clicked", {
                hasInput: input?.trim().length > 0,
                currentChatId: chatId,
                generatedChatId,
                status,
            });

            handleSubmit(e);
        },
        [
            chatId,
            generatedChatId,
            input,
            handleSubmit,
            status,
        ],
    );

    const effectiveStatus = status;
    const isLoading =
        effectiveStatus === "streaming" ||
        effectiveStatus === "submitted" ||
        isLoadingChat;
    const showConversation = isMounted && (messages.length > 0 || isLoadingChat);

    return (
        <div className="h-dvh flex flex-col justify-center w-full max-w-107.5 sm:max-w-3xl mx-auto px-4 sm:px-6 py-3">
            {!showConversation ? (
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
                            stop={stop}
                        />
                    </form>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto min-h-0 pb-2">
                        <Messages
                            messages={messages}
                            isLoading={isLoading}
                            status={effectiveStatus}
                        />
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
                            stop={stop}
                        />
                    </form>
                </>
            )}
        </div>
    );
}
