"use server";

import Chat from "@/components/chat";
import { getUserId } from "@/app/actions";
import { getChatById } from "@/actions/chat";
import { convertToUIMessages } from "@/lib/chat-store";
import { UIMessage } from "ai";

interface ChatPageProps {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
    params?: { id: string };
}

export default async function ChatPage(props: ChatPageProps) {
    const searchParams = await props.searchParams;
    const params = await props.params;
    const chatId = params?.id as string;
    const userId = await getUserId();

    const chat = await getChatById(chatId, userId);
    if (!chat) {
        console.error(
            "Chat not found or no messages available for chat ID:",
            chatId
        );
        return <div>Chat not found</div>;
    }

    const converted = convertToUIMessages(chat.messages);

    return <Chat initialMessages={converted as UIMessage[]} userId={userId} />;
}
