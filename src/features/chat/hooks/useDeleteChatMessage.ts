import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { ChatMessage, ChatMessagesResponse } from '../../../types/chat';

const replaceMessage = (messages: ChatMessage[], updated: ChatMessage) =>
  messages.map((message) => (message.id === updated.id ? { ...message, ...updated } : message));

export const useDeleteChatMessage = (peerId: string | null) => {
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (id: string) => {
      if (!accessToken || !peerId) {
        throw new Error('Missing session');
      }
      return apiService.deleteChatMessage(accessToken, id);
    },
    onSuccess: (response) => {
      const message = response.message;
      const queryKey = ['chat-messages', peerId];
      queryClient.setQueryData<ChatMessagesResponse>(queryKey, (prev) => {
        const existing = prev?.messages ?? [];
        return { messages: replaceMessage(existing, message) };
      });
    },
  });

  const deleteMessage = useCallback(
    (id: string) => {
      if (!peerId) return;
      mutation.mutate(id);
    },
    [mutation, peerId]
  );

  return {
    deleteMessage,
    isDeleting: mutation.isPending,
  };
};
