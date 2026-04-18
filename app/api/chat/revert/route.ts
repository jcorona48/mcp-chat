import { revertChatToMessage } from '@/lib/chat-store';
import { checkBotId } from 'botid/server';

/**
 * POST /api/chat/revert
 * Revert a chat to a specific message index
 * Removes all messages after the specified index
 */
export async function POST(req: Request) {
  const { isBot, isVerifiedBot } = await checkBotId();

  if (isBot && !isVerifiedBot) {
    return new Response(
      JSON.stringify({ error: 'Bot is not allowed to access this endpoint' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { chatId, userId, messageIndex } = await req.json();

    if (!chatId || !userId || messageIndex === undefined) {
      return new Response(
        JSON.stringify({ error: 'chatId, userId, and messageIndex are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (typeof messageIndex !== 'number' || messageIndex < 0) {
      return new Response(
        JSON.stringify({ error: 'messageIndex must be a non-negative number' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await revertChatToMessage(chatId, userId, messageIndex);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: result.deletedCount,
        message: `Reverted chat to message ${messageIndex}`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Revert chat error:', error);
    
    if (error instanceof Error && error.message === 'Chat not found or unauthorized') {
      return new Response(
        JSON.stringify({ error: 'Chat not found or unauthorized' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to revert chat' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
