import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { ChatMessage, ChatMessagesResponse } from '../../../types/chat';
import { useSocketMessages } from '../../calls/hooks/useSocket';

const sortByCreatedAt = (messages: ChatMessage[]) =>
  messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

const mergeMessage = (messages: ChatMessage[], incoming: ChatMessage) => {
  if (messages.some((message) => message.id === incoming.id)) {
    return messages.map((message) => (message.id === incoming.id ? { ...message, ...incoming } : message));
  }
  return sortByCreatedAt([...messages, incoming]);
};

export const useChatMessages = (peerId: string | null) => {
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();

  const queryKey = useMemo(() => ['chat-messages', peerId], [peerId]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(accessToken && peerId),
    queryFn: async () => {
      const data = await apiService.getChatMessages(accessToken!, peerId!);
      return {
        messages: sortByCreatedAt(data.messages || []),
      };
    },
  });

  const handleIncoming = useCallback(
    (data: unknown) => {
      if (!peerId || !userId) return;
      if (!data || typeof data !== 'object') return;
      const payload = data as Record<string, unknown>;
      if (payload.type !== 'chat-message' || !payload.message || typeof payload.message !== 'object') return;

      const message = payload.message as Record<string, unknown>;
      if (
        typeof message.id !== 'string' ||
        typeof message.sender_id !== 'string' ||
        typeof message.receiver_id !== 'string' ||
        typeof message.body !== 'string' ||
        typeof message.created_at !== 'string'
      ) {
        return;
      }

      const typedMessage: ChatMessage = {
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        body: message.body,
        created_at: message.created_at,
        edited_at: typeof message.edited_at === 'string' ? message.edited_at : null,
        deleted_at: typeof message.deleted_at === 'string' ? message.deleted_at : null,
      };

      const isForThread =
        (typedMessage.sender_id === userId && typedMessage.receiver_id === peerId) ||
        (typedMessage.sender_id === peerId && typedMessage.receiver_id === userId);
      if (!isForThread) return;

      queryClient.setQueryData<ChatMessagesResponse>(queryKey, (prev) => {
        const existing = prev?.messages ?? [];
        return { messages: mergeMessage(existing, typedMessage) };
      });
    },
    [peerId, queryClient, queryKey, userId]
  );

  useSocketMessages(handleIncoming);

  return {
    messages: query.data?.messages ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};
