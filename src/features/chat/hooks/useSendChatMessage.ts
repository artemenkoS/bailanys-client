import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { ChatMessage, ChatMessagesResponse } from '../../../types/chat';

const sortByCreatedAt = (messages: ChatMessage[]) =>
  messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

const mergeMessage = (messages: ChatMessage[], incoming: ChatMessage) => {
  if (messages.some((message) => message.id === incoming.id)) {
    return messages;
  }
  return sortByCreatedAt([...messages, incoming]);
};

export const useSendChatMessage = (peerId: string | null) => {
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (body: string) => {
      if (!accessToken || !peerId) {
        throw new Error('Missing session');
      }
      return apiService.sendChatMessage(accessToken, { peerId, body });
    },
    onSuccess: (response) => {
      const message = response.message;
      const queryKey = ['chat-messages', peerId];
      queryClient.setQueryData<ChatMessagesResponse>(queryKey, (prev) => {
        const existing = prev?.messages ?? [];
        return { messages: mergeMessage(existing, message) };
      });
    },
  });

  const sendMessage = useCallback(
    (body: string) => {
      if (!body.trim() || !peerId) return;
      mutation.mutate(body.trim());
    },
    [mutation, peerId]
  );

  return {
    sendMessage,
    isSending: mutation.isPending,
  };
};
