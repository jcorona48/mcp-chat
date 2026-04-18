"use client";

import { defaultModel, type modelID } from "@/ai/providers";
import { type UIMessage, useChat } from "@ai-sdk/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Textarea } from "./textarea";
import { ProjectOverview } from "./project-overview";
import { Messages } from "./messages";
import { useParams } from "next/navigation";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { useQueryClient } from "@tanstack/react-query";
import { nanoid } from "nanoid";
import { useMCP } from "@/lib/context/mcp-context";
import { getCookie } from "@/utils/cookies/client";
import { ToolConfirmationModal } from "./tool-confirmation-modal";
import { ToolConfirmationToggle } from "./tool-confirmation-toggle";
import { ReasoningToggle } from "./reasoning-toggle";

interface ChatProps {
    initialMessages: UIMessage[];
    userId: string | null;
}

export default function Chat({
    initialMessages,
    userId: userIDProp,
}: ChatProps) {
    const params = useParams();
    const chatId = params?.id as string | undefined;
    const queryClient = useQueryClient();
    const { mcpServersForApi, mcpServers } = useMCP();

    const [isHydrated, setIsHydrated] = useState(false);
    const [userId, setUserId] = useState<string | null>(userIDProp || null);
    const [generatedChatId, setGeneratedChatId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [selectedModel, setSelectedModel] = useLocalStorage<modelID>(
        "selectedModel",
        defaultModel
    );
    const [confirmationEnabled, setConfirmationEnabled] = useLocalStorage(
        "toolConfirmationEnabled",
        true
    );
    const [reasoningEnabled, setReasoningEnabled] = useLocalStorage(
        "reasoningEnabled",
        false
    );
    const [pendingMessageToSend, setPendingMessageToSend] = useState<string | null>(null);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        setIsHydrated(true);
        if (!userIDProp) {
            const cookieUserId = getCookie("ai-chat-user-id");
            if (cookieUserId) {
                setUserId(cookieUserId);
            }
        }
        
        if (!chatId) {
            const storedId = localStorage.getItem("lastChatId");
            setGeneratedChatId(storedId || nanoid());
        }
    }, [userIDProp, chatId]);

    useEffect(() => {
        if (generatedChatId) {
            localStorage.setItem("lastChatId", generatedChatId);
        }
    }, [generatedChatId]);

    const effectiveChatId = chatId || generatedChatId || "";

    const { messages, sendMessage, status, stop } = useChat({
        id: effectiveChatId,
        messages: initialMessages,
        experimental_throttle: 20,
        onFinish: () => {
            if (userId) {
                queryClient.invalidateQueries({ queryKey: ["chats", userId] });
            }
        },
    });

    const sendMessageInternal = useCallback(
        async (messageText: string) => {
            setInput("");
            await sendMessage(
                { text: messageText },
                {
                    body: {
                        selectedModel,
                        mcpServers: mcpServersForApi,
                        chatId: effectiveChatId,
                        userId,
                        reasoningEnabled,
                    },
                }
            );
        },
        [sendMessage, selectedModel, mcpServersForApi, effectiveChatId, userId, reasoningEnabled]
    );

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            if (!input.trim()) return;

            // Si confirmación está habilitada y hay MCP servers activos, mostrar confirmación
            if (confirmationEnabled && mcpServersForApi.length > 0) {
                setPendingMessageToSend(input);
                setShowConfirmationModal(true);
                return;
            }

            // Si no necesita confirmación, enviar directamente
            await sendMessageInternal(input);
        },
        [input, confirmationEnabled, mcpServersForApi, sendMessageInternal]
    );

    const handleConfirmToolExecution = useCallback(() => {
        if (pendingMessageToSend) {
            sendMessageInternal(pendingMessageToSend);
            setPendingMessageToSend(null);
            setShowConfirmationModal(false);
        }
    }, [pendingMessageToSend, sendMessageInternal]);

    const handleCancelToolExecution = useCallback(() => {
        setPendingMessageToSend(null);
        setShowConfirmationModal(false);
    }, []);

    if (!isHydrated) {
        return <div className="h-dvh" />;
    }

    const isLoading = status === "streaming" || status === "submitted";

    // Calcular el total de herramientas disponibles
    const toolsCount = mcpServers.reduce((acc, server) => {
        if (server.tools && server.status === "connected") {
            return acc + server.tools.length;
        }
        return acc;
    }, 0);

    const hasToolsError = mcpServers.some(server => server.status === "error");
    const toolsErrorMessage = mcpServers
        .find(server => server.status === "error")
        ?.errorMessage;

    const ChatForm = (
        <form onSubmit={handleSubmit} className="w-full">
            <Textarea
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                handleInputChange={(e) => setInput(e.target.value)}
                input={input}
                isLoading={isLoading}
                status={status}
                stop={stop}
                toolsCount={toolsCount}
                hasToolsError={hasToolsError}
                toolsErrorMessage={toolsErrorMessage}
            />
        </form>
    );

    const FormWithToggle = (
        <div className="w-full space-y-2">
            {mcpServersForApi.length > 0 && (
                <div className="flex items-center justify-end px-2 gap-2">
                    <ReasoningToggle
                        enabled={reasoningEnabled}
                        onToggle={() => setReasoningEnabled(!reasoningEnabled)}
                    />
                    <ToolConfirmationToggle
                        enabled={confirmationEnabled}
                        onToggle={() => setConfirmationEnabled(!confirmationEnabled)}
                        hasToolsAvailable={mcpServersForApi.length > 0}
                    />
                </div>
            )}
            {ChatForm}
        </div>
    );

    return (
        <div className="h-dvh flex flex-col justify-center w-full max-w-[430px] sm:max-w-3xl mx-auto px-4 sm:px-6 py-3">
            {messages.length === 0 ? (
                <div className="max-w-xl mx-auto w-full">
                    <ProjectOverview />
                    <div className="mt-4">{FormWithToggle}</div>
                </div>
            ) : (
                <>
                    <div className="flex-1 overflow-y-auto min-h-0 pb-2">
                        <Messages
                            messages={messages}
                            isLoading={isLoading}
                            status={status}
                            reasoningEnabled={reasoningEnabled}
                        />
                    </div>
                    <div className="mt-2">{FormWithToggle}</div>
                </>
            )}

            <ToolConfirmationModal
                isOpen={showConfirmationModal}
                toolName="Ejecutar herramientas MCP"
                toolDescription={`Se va a procesar tu mensaje. La IA podría usar ${mcpServersForApi.length} ${
                    mcpServersForApi.length === 1 ? "herramienta" : "herramientas"
                } disponible${mcpServersForApi.length === 1 ? "" : "s"} para responder.`}
                toolArgs={{}}
                onConfirm={handleConfirmToolExecution}
                onCancel={handleCancelToolExecution}
                isLoading={status === "streaming" || status === "submitted"}
            />
        </div>
    );
}
