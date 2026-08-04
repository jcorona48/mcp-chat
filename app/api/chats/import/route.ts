import { NextResponse } from "next/server";
import { saveChat, saveMessages, convertToDBMessage } from "@/lib/chat-store";
import { sanitizePartsForStorage } from "@/lib/chat/message-utils";
import type { MessagePart } from "@/lib/db/schema";

type ImportedMessage = {
  id?: string;
  role: string;
  content?: unknown;
  parts?: MessagePart[];
  createdAt?: string | number | Date;
};

function isImportedMessage(value: unknown): value is ImportedMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as ImportedMessage;
  return (
    typeof message.role === "string" &&
    ["user", "assistant", "tool"].includes(message.role) &&
    (Array.isArray(message.parts) || message.content !== undefined)
  );
}

export async function POST(request: Request) {
  try {
    const userId = request.headers.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    let body: { messages?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const raw = Array.isArray(body?.messages) ? body.messages : null;
    if (!raw || raw.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const importedMessages = raw.filter(isImportedMessage);
    if (importedMessages.length === 0) {
      return NextResponse.json({ error: "No valid messages found" }, { status: 400 });
    }

    const { id: chatId } = await saveChat({
      userId,
      messages: importedMessages as unknown as Array<Record<string, unknown>>,
    });

    const dbMessages = importedMessages.map((message) => {
      const dbMessage = convertToDBMessage(
        message as unknown as Parameters<typeof convertToDBMessage>[0],
        chatId,
      );
      const createdAt = message.createdAt
        ? new Date(message.createdAt)
        : undefined;

      return {
        ...dbMessage,
        parts: sanitizePartsForStorage(dbMessage.parts),
        createdAt:
          createdAt && !isNaN(createdAt.getTime()) ? createdAt : dbMessage.createdAt,
      };
    });

    await saveMessages({ messages: dbMessages });

    return NextResponse.json({ id: chatId });
  } catch (error) {
    console.error("Error importing chat:", error);
    return NextResponse.json({ error: "Failed to import chat" }, { status: 500 });
  }
}
