import { NextRequest, NextResponse } from "next/server";
import { getChatById, deleteChat, renameChat, pinChat } from "@/lib/chat-store";
import { checkBotId } from "botid/server";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { id } = await params;
    const chat = await getChatById(id, userId);

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { id } = await params;
    const body = await request.json();
    const pinned = typeof body?.pinned === "boolean" ? body.pinned : undefined;
    const title = typeof body?.title === "string" ? body.title.trim() : "";

    if (pinned !== undefined) {
      const updated = await pinChat(id, userId, pinned);
      return NextResponse.json(updated);
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const updated = await renameChat(id, userId, title);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error renaming chat:", error);
    return NextResponse.json(
      { error: "Failed to rename chat" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { id } = await params;
    await deleteChat(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
} 