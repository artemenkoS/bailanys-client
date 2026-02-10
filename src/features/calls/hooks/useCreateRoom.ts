import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import type { CreateRoomPayload } from '../../../types/rooms';
import type { CallStatus } from './useCallManager';

interface UseCreateRoomOptions {
  callStatus: CallStatus;
  isInRoom: boolean;
  notifyError: (messageKey: string) => void;
  createRoom: (roomId: string, options: { name: string; isPrivate?: boolean; password?: string }) => void;
}

export const useCreateRoom = ({ callStatus, isInRoom, notifyError, createRoom }: UseCreateRoomOptions) => {
  const queryClient = useQueryClient();

  return useCallback(
    (payload: CreateRoomPayload) => {
      if (callStatus !== 'idle') {
        notifyError('rooms.errors.leaveCallToJoin');
        return null;
      }
      if (isInRoom) return null;
      const generated = uuidv4();
      const { avatarFile, ...roomPayload } = payload;
      void avatarFile;
      createRoom(generated, roomPayload);
      queryClient.invalidateQueries({ queryKey: ['my-rooms'] });
      return generated;
    },
    [callStatus, createRoom, isInRoom, notifyError, queryClient]
  );
};
