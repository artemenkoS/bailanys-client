import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

export const useUpdateRoomMemberRole = () => {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: (data: { roomId: string; userId: string; action: 'promote' | 'demote' | 'remove' | 'leave' }) =>
      apiService.updateRoomMemberRole(session?.access_token || '', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room-members', variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ['my-rooms'] });
    },
  });
};
