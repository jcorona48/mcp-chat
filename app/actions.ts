"use server";

import { generateText } from "ai";
import { model } from "@/ai/providers";

// Helper to extract text content from a message regardless of format
function getMessageText(message: any): string {
    // Check if the message has parts (new format)
    if (message.parts && Array.isArray(message.parts)) {
        const textParts = message.parts.filter(
            (p: any) => p.type === "text" && p.text,
        );
        if (textParts.length > 0) {
            return textParts.map((p: any) => p.text).join("\n");
        }
    }

    // Fallback to content (old format)
    if (typeof message.content === "string") {
        return message.content;
    }

    // If content is an array (potentially of parts), try to extract text
    if (Array.isArray(message.content)) {
        const textItems = message.content.filter(
            (item: any) =>
                typeof item === "string" || (item.type === "text" && item.text),
        );

        if (textItems.length > 0) {
            return textItems
                .map((item: any) =>
                    typeof item === "string" ? item : item.text,
                )
                .join("\n");
        }
    }

    return "";
}


function sanitizeTitle(rawTitle: string): string {
    const normalized = rawTitle.replace(/\s+/g, " ").trim();
    const withoutWrappingPunctuation = normalized.replace(/^[\s\-:;,.!?"'`~()[\]{}]+|[\s\-:;,.!?"'`~()[\]{}]+$/g, "");

    const hasUsefulChars = /[\p{L}\p{N}]/u.test(withoutWrappingPunctuation);
    const wordCount = withoutWrappingPunctuation.split(/\s+/).filter(Boolean).length;

    if (!hasUsefulChars || wordCount === 0) {
        return "New Chat";
    }

    if (wordCount > 8) {
        return withoutWrappingPunctuation
            .split(/\s+/)
            .slice(0, 8)
            .join(" ");
    }

    return withoutWrappingPunctuation;
}

function fallbackTitle(messages: any[]): string {
    const userMessage = messages.find((m) => m.role === "user");
    if (!userMessage) {
        return "New Chat";
    }
    const text = getMessageText(userMessage);
    if (!text.trim()) {
        return "New Chat";
    }
    return text.length > 60 ? `${text.slice(0, 60)}...` : text;
}

export async function generateTitle(messages: any[]): Promise<string> {
    const fallback = fallbackTitle(messages);

    if (fallback === "New Chat") {
        return fallback;
    }

    try {
        const { text } = await generateText({
            model: model.languageModel("gpt-oss:20b"),
            temperature: 0.7,
            maxOutputTokens: 128,
            system: `You are a title generator for a chat application. Your only job is to produce a short, concise title that summarizes the topic of a conversation.

Strict rules:
- Output ONLY the title text, nothing else.
- No quotes, no punctuation at the start or end, no bullet points, no explanations, no emojis.
- Max 6 words.
- Match the language of the conversation.
- The title should capture the intent or main subject of the FIRST message.`,
            prompt: `Conversation preview (first user message):
"${getMessageText(messages.find((m) => m.role === "user")).slice(0, 300)}"

Title:`,
        });

        const cleaned = text.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
        const title = sanitizeTitle(cleaned);
        return title === "New Chat" ? fallback : title;
    } catch (error) {
        console.error("Error generating title:", error);
        return fallback;
    }
}
