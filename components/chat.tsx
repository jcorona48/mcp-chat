"use client";

import { defaultModel, type modelID } from "@/ai/providers";
import { type UIMessage, useChat } from "@ai-sdk/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { useRouter, useParams } from "next/navigation";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type Message as DBMessage } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { useMCP } from "@/lib/context/mcp-context";
import { getCookie } from "@/utils/cookies/client";

// Type for chat data from DB
export interface ChatData {
    id: string;
    messages: DBMessage[];
    createdAt: string;
    updatedAt: string;
}

interface ChatProps {
    initialMessages: UIMessage[];
    userId: string | null;
}
export default function Chat({
    initialMessages,
    userId: userIDProp,
}: ChatProps) {
    const router = useRouter();
    const params = useParams();
    const chatId = params?.id as string | undefined;
    const queryClient = useQueryClient();
    const [userId, setUserId] = useState<string | null>(userIDProp || null);

    const [selectedModel, setSelectedModel] = useLocalStorage<modelID>(
        "selectedModel",
        defaultModel
    );
    const [generatedChatId, setGeneratedChatId] = useState<string>("");
    const [input, setInput] = useState<string>("");

    // Get MCP server data from context
    const { mcpServersForApi } = useMCP();

    useEffect(() => {
        if (!userIDProp) {
            const newId = getCookie("ai-chat-user-id");
            console.log("Using userId from cookie:", newId);
            setUserId(newId);
        }
    }, [userIDProp]);

    // Generate a chat ID if needed
    useEffect(() => {
        if (!chatId) {
            const newChatId = nanoid();
            setGeneratedChatId(newChatId);
        }
    }, [chatId]);
    // Handle query errors

    const { messages, sendMessage, status, stop } = useChat({
        id: chatId || generatedChatId, // Use generated ID if no chatId in URL
        messages: initialMessages,
        experimental_throttle: 100,
        onFinish: () => {
            // Invalidate the chats query to refresh the sidebar
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ["chats", userId] });
            }
        },
    });

    const handleSubmit = useCallback(
        async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setInput("");
            await sendMessage(
                {
                    text: input,
                },
                {
                    body: {
                        selectedModel,
                        mcpServers: mcpServersForApi,
                        chatId: chatId || generatedChatId, // Use generated ID if no chatId in URL
                        userId,
                    },
                }
            );
        },
        [input, sendMessage]
    );

    const handleInputChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setInput(event.target.value);
        },
        []
    );

    // Custom submit handler
    const handleFormSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            if (!chatId && generatedChatId && input.trim()) {
                // If this is a new conversation, redirect to the chat page with the generated ID
                const effectiveChatId = generatedChatId;

                // Submit the form
                await handleSubmit(e);

                // Redirect to the chat page with the generated ID
                router.push(`/chat/${effectiveChatId}`);
            } else {
                // Normal submission for existing chats
                handleSubmit(e);
            }
        },
        [chatId, generatedChatId, input, handleSubmit, router]
    );

    const isLoading = status === "streaming" || status === "submitted";
    return (
        <div className="h-dvh flex flex-col justify-center w-full max-w-[430px] sm:max-w-3xl mx-auto px-4 sm:px-6 py-3">
            {messages.length === 0 ? (
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
                            status={status}
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
                            status={status}
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
                            status={status}
                            stop={stop}
                        />
                    </form>
                </>
            )}
        </div>
    );
}
