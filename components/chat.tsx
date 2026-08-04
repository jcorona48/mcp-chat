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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { convertToUIMessages } from "@/lib/chat-store";
import { type Message as DBMessage } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { useMCP } from "@/lib/context/mcp-context";
import { useAiProvider } from "@/lib/context/ai-provider-context";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { AI_SYSTEM_PROMPT_KEY } from "@/lib/ai/types";
import { useModelExecutionInfo } from "@/lib/hooks/use-model-execution-info";
import { ModelExecutionNotice } from "@/components/model-execution-notice";
import { useAutoModelRetry } from "@/lib/hooks/use-auto-model-retry";
import { DefaultChatTransport } from "ai";
import { fetchWithErrorHandlers } from "@/lib/utils";
import { useDataStream } from "@/providers/data-stream-provider";
import { ChatMessage } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { getChatUsage } from "@/lib/chat/usage";
import { TokenBadge } from "./token-badge";
import { SystemPromptDialog } from "./system-prompt-dialog";
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
    const [systemPrompt] = useLocalStorage<string>(AI_SYSTEM_PROMPT_KEY, "");
    const [userId, setUserId] = useState<string>(() => getUserId());
    const [generatedChatId] = useState<string>(() =>
        typeof window === "undefined" ? "" : nanoid(),
    );
    const [input, setInput] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [conversationSearch, setConversationSearch] = useState("");
    const [temperature, setTemperature] = useState<number | null>(null);
    const [maxTokens, setMaxTokens] = useState<number | null>(null);
    const [systemPromptOpen, setSystemPromptOpen] = useState(false);
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

    // Get AI provider credentials and custom models from context
    const { apiKeys, customModels } = useAiProvider();

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
        apiKeys,
        customModels,
        systemPrompt,
        temperature,
        maxTokens,
    });

    transportConfigRef.current = {
        selectedModel,
        mcpServers: mcpServersForApi,
        chatId: activeChatId,
        userId,
        apiKeys,
        customModels,
        systemPrompt,
        temperature,
        maxTokens,
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
                        apiKeys: config.apiKeys,
                        customModels: config.customModels,
                        systemPrompt: config.systemPrompt,
                        temperature: config.temperature,
                        maxTokens: config.maxTokens,
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

    const hasNavigatedRef = useRef(false);

    const handleSubmit = useCallback(
        (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!input.trim() && attachments.length === 0) return;

            debugChatClient("submit", {
                inputLength: input.length,
                attachments: attachments.length,
                chatId,
                generatedChatId,
                status,
            });

            const fileList = new DataTransfer();
            attachments.forEach((file) => fileList.items.add(file));

            sendMessage({
                text: input,
                ...(attachments.length > 0 ? { files: fileList.files } : {}),
            });
            setInput("");
            setAttachments([]);
        },
        [input, attachments, sendMessage, chatId, generatedChatId, status],
    );

    const handleAttachFiles = (files: FileList | null) => {
        if (!files) return;
        setAttachments((prev) => [...prev, ...Array.from(files)]);
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const navigateToNewChat = useCallback(() => {
        if (!chatId && generatedChatId && !hasNavigatedRef.current) {
            hasNavigatedRef.current = true;
            router.push(`/chat/${generatedChatId}`);
        }
    }, [chatId, generatedChatId, router]);

    const handleEditSubmit = useCallback(
        (text: string, messageId: string) => {
            sendMessage({ text, messageId });
        },
        [sendMessage],
    );

    useEffect(() => {
        if (status === "ready" && messages.length > 0 && !chatId) {
            navigateToNewChat();
        }
    }, [status, messages.length, chatId, navigateToNewChat]);

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

    const tChat = useTranslations("chat");

    const filteredMessages = useMemo(() => {
        const query = conversationSearch.trim().toLowerCase();
        if (!query) return messages;
        return messages.filter((m) =>
            m.parts.some(
                (p) =>
                    p.type === "text" &&
                    p.text.toLowerCase().includes(query),
            ),
        );
    }, [messages, conversationSearch]);

    const chatUsage = useMemo(() => getChatUsage(messages), [messages]);

    return (
        <div className="h-dvh flex flex-col justify-center w-full max-w-107.5 sm:max-w-3xl mx-auto px-4 sm:px-6 py-3">
            {!showConversation ? (
                <div className="max-w-xl mx-auto w-full">
                    <ProjectOverview
                        onSendSuggestion={(text) => sendMessage({ text })}
                    />
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
                            attachments={attachments}
                            onAttachFiles={handleAttachFiles}
                            onRemoveAttachment={handleRemoveAttachment}
                            temperature={temperature}
                            maxTokens={maxTokens}
                            onTemperatureChange={setTemperature}
                            onMaxTokensChange={setMaxTokens}
                            usage={chatUsage}
                            messages={messages}
                        />
                    </form>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-center mb-2">
                        {messages.length > 0 && (
                            <div className="relative w-full max-w-md">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
                                <input
                                    type="text"
                                    value={conversationSearch}
                                    onChange={(e) =>
                                        setConversationSearch(e.target.value)
                                    }
                                    placeholder={tChat("searchConversation")}
                                    className="w-full rounded-full border border-border/60 bg-background/50 py-1.5 pl-9 pr-14 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
                                />
                                {conversationSearch.trim() && (
                                    <>
                                        <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/70">
                                            {filteredMessages.length}/
                                            {messages.length}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setConversationSearch("")
                                            }
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground/70 hover:text-foreground hover:bg-foreground/5"
                                            title={tChat("clearSearch")}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0 pb-2">
                        <Messages
                            messages={filteredMessages}
                            isLoading={isLoading}
                            status={effectiveStatus}
                            onEditSubmit={handleEditSubmit}
                            onRegenerate={regenerate}
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
                            attachments={attachments}
                            onAttachFiles={handleAttachFiles}
                            onRemoveAttachment={handleRemoveAttachment}
                            temperature={temperature}
                            maxTokens={maxTokens}
                            onTemperatureChange={setTemperature}
                            onMaxTokensChange={setMaxTokens}
                            systemPromptActive={systemPrompt.trim().length > 0}
                            onSystemPromptClick={() => setSystemPromptOpen(true)}
                            tokenBadge={
                                <TokenBadge usage={chatUsage} messages={messages} />
                            }
                            usage={chatUsage}
                            messages={messages}
                        />
                    </form>
                </>
            )}

            <SystemPromptDialog
                open={systemPromptOpen}
                onOpenChange={setSystemPromptOpen}
            />
        </div>
    );
}
