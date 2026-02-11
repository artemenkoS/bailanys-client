import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { ChatMessage, ChatMessagesResponse } from '../../../types/chat';

const replaceMessage = (messages: ChatMessage[], updated: ChatMessage) =>
  messages.map((message) => (message.id === updated.id ? { ...message, ...updated } : message));

export const useUpdateChatMessage = (peerId: string | null) => {
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: { id: string; body: string }) => {
      if (!accessToken || !peerId) {
        throw new Error('Missing session');
      }
      return apiService.updateChatMessage(accessToken, payload.id, payload.body);
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

  const updateMessage = useCallback(
    (id: string, body: string) => {
      if (!peerId) return;
      mutation.mutate({ id, body });
    },
    [mutation, peerId]
  );

  return {
    updateMessage,
    isUpdating: mutation.isPending,
  };
};
