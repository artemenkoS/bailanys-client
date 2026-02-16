import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { RoomChatMessage } from '../../../types/roomChat';

const sortByCreatedAt = (messages: RoomChatMessage[]) =>
  messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

const mergeMessage = (messages: RoomChatMessage[], incoming: RoomChatMessage) => {
  if (messages.some((message) => message.id === incoming.id)) {
    return messages;
  }
  return sortByCreatedAt([...messages, incoming]);
};

export const useSendRoomChatMessage = (roomId: string | null) => {
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (body: string) => {
      if (!accessToken || !roomId) {
        throw new Error('Missing session');
      }
      return apiService.sendRoomMessage(accessToken, { roomId, body });
    },
    onSuccess: (response) => {
      const message = response.message;
      const queryKey = ['room-messages', roomId];
      queryClient.setQueryData<{ messages: RoomChatMessage[] }>(queryKey, (prev) => {
        const existing = prev?.messages ?? [];
        return { messages: mergeMessage(existing, message) };
      });
    },
  });

  const sendMessage = useCallback(
    (body: string) => {
      if (!body.trim() || !roomId) return;
      mutation.mutate(body.trim());
    },
    [mutation, roomId]
  );

  return {
    sendMessage,
    isSending: mutation.isPending,
  };
};
