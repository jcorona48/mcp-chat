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

    let initialMessages: UIMessage[] = [];
    
    try {
        const chat = await getChatById(chatId, userId);
        if (chat && chat.messages) {
            const converted = convertToUIMessages(chat.messages);
            initialMessages = converted as UIMessage[];
        }
    } catch (error) {
        console.log(`Chat ${chatId} not found yet - rendering empty chat`);
    }

    return <Chat initialMessages={initialMessages} userId={userId} />;
}
