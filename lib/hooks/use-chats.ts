import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type Chat } from '@/lib/db/schema';
import { toast } from 'sonner';

export function useChats(userId: string) {
  const queryClient = useQueryClient();

  // Main query to fetch chats
  const {
    data: chats = [],
    isLoading,
    error,
    refetch
  } = useQuery<Chat[]>({
    queryKey: ['chats', userId],
    queryFn: async () => {
      if (!userId) return [];

      const response = await fetch('/api/chats', {
        headers: {
          'x-user-id': userId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

      return response.json();
    },
    enabled: !!userId, // Only run query if userId exists
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Mutation to delete a chat
  const deleteChat = useMutation({
    mutationFn: async (chatId: string) => {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      return chatId;
    },
    onSuccess: (deletedChatId) => {
      // Update cache by removing the deleted chat
      queryClient.setQueryData<Chat[]>(['chats', userId], (oldChats = []) =>
        oldChats.filter(chat => chat.id !== deletedChatId)
      );

      toast.success('Chat deleted');
    },
    onError: (error) => {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  });

  // Mutation to rename a chat
  const renameChat = useMutation({
    mutationFn: async ({ chatId, title }: { chatId: string; title: string }) => {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });

      if (!response.ok) {
        throw new Error('Failed to rename chat');
      }

      return response.json();
    },
    onSuccess: (updated) => {
      // Update cache by replacing the renamed chat's title
      queryClient.setQueryData<Chat[]>(['chats', userId], (oldChats = []) =>
        oldChats.map(chat => chat.id === updated.id ? { ...chat, title: updated.title } : chat)
      );

      // Invalidate the individual chat query so the page metadata refreshes
      queryClient.invalidateQueries({ queryKey: ['chat', updated.id, userId] });

      toast.success('Chat renamed');
    },
    onError: (error) => {
      console.error('Error renaming chat:', error);
      toast.error('Failed to rename chat');
    }
  });

  // Function to invalidate chats cache for refresh
  const refreshChats = () => {
    queryClient.invalidateQueries({ queryKey: ['chats', userId] });
  };

  // Mutation to pin/unpin a chat
  const pinChat = useMutation({
    mutationFn: async ({ chatId, pinned }: { chatId: string; pinned: boolean }) => {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'x-user-id': userId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pinned })
      });

      if (!response.ok) {
        throw new Error('Failed to pin chat');
      }

      return response.json();
    },
    onSuccess: (updated) => {
      // Update cache by replacing the pinned chat's pinnedAt
      queryClient.setQueryData<Chat[]>(['chats', userId], (oldChats = []) =>
        oldChats
          .map(chat => chat.id === updated.id ? { ...chat, pinnedAt: updated.pinnedAt } : chat)
          .sort((a, b) => {
            const aTime = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
            const bTime = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
            if (aTime !== bTime) return bTime - aTime;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          })
      );
    },
    onError: (error) => {
      console.error('Error pinning chat:', error);
      toast.error('Failed to pin chat');
    }
  });

  return {
    chats,
    isLoading,
    error,
    deleteChat: deleteChat.mutate,
    isDeleting: deleteChat.isPending,
    renameChat: renameChat.mutate,
    isRenaming: renameChat.isPending,
    pinChat: pinChat.mutate,
    isPinning: pinChat.isPending,
    refreshChats,
    refetch
  };
} 