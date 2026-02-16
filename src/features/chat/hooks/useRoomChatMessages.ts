import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';
import type { RoomChatMessage } from '../../../types/roomChat';
import { useSocket, useSocketMessages } from '../../calls/hooks/useSocket';

const sortByCreatedAt = (messages: RoomChatMessage[]) =>
  messages.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

const mergeMessage = (messages: RoomChatMessage[], incoming: RoomChatMessage) => {
  if (messages.some((message) => message.id === incoming.id)) {
    return messages;
  }
  return sortByCreatedAt([...messages, incoming]);
};

export const useRoomChatMessages = (roomId: string | null) => {
  const accessToken = useAuthStore((state) => state.session?.access_token);
  const queryClient = useQueryClient();
  const { sendMessage, socket } = useSocket();

  const queryKey = useMemo(() => ['room-messages', roomId], [roomId]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(accessToken && roomId),
    queryFn: async () => {
      const data = await apiService.getRoomMessages(accessToken!, roomId!);
      return {
        messages: sortByCreatedAt(data.messages || []),
      };
    },
  });

  useEffect(() => {
    if (!roomId || !socket) return;
    const join = () => {
      if (socket.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'join-room-chat', roomId });
      }
    };
    join();
    const handleOpen = () => join();
    socket.addEventListener('open', handleOpen);
    return () => {
      socket.removeEventListener('open', handleOpen);
      if (socket.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'leave-room-chat', roomId });
      }
    };
  }, [roomId, sendMessage, socket]);

  const handleIncoming = useCallback(
    (data: unknown) => {
      if (!roomId) return;
      if (!data || typeof data !== 'object') return;
      const payload = data as Record<string, unknown>;

      if (payload.type === 'room-messages') {
        const payloadRoomId = typeof payload.roomId === 'string' ? payload.roomId : '';
        if (payloadRoomId !== roomId) return;
        const messages = Array.isArray(payload.messages) ? payload.messages : [];
        queryClient.setQueryData<{ messages: RoomChatMessage[] }>(queryKey, () => ({
          messages: sortByCreatedAt(messages as RoomChatMessage[]),
        }));
        return;
      }

      if (payload.type !== 'room-message' || !payload.message || typeof payload.message !== 'object') return;
      const payloadRoomId = typeof payload.roomId === 'string' ? payload.roomId : '';
      if (payloadRoomId !== roomId) return;

      const message = payload.message as Record<string, unknown>;
      if (
        typeof message.id !== 'string' ||
        typeof message.room_id !== 'string' ||
        typeof message.sender_id !== 'string' ||
        typeof message.body !== 'string' ||
        typeof message.created_at !== 'string'
      ) {
        return;
      }

      const typedMessage: RoomChatMessage = {
        id: message.id,
        room_id: message.room_id,
        sender_id: message.sender_id,
        body: message.body,
        created_at: message.created_at,
      };

      queryClient.setQueryData<{ messages: RoomChatMessage[] }>(queryKey, (prev) => {
        const existing = prev?.messages ?? [];
        return { messages: mergeMessage(existing, typedMessage) };
      });
    },
    [queryClient, queryKey, roomId]
  );

  useSocketMessages(handleIncoming);

  return {
    messages: query.data?.messages ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
};
