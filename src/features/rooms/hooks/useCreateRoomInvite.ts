import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiService } from '../../../services/api.service';
import { useAuthStore } from '../../../stores/authStore';

export const useCreateRoomInvite = () => {
  const queryClient = useQueryClient();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: (data: { roomId: string; targetId: string }) =>
      apiService.createRoomInvite(session?.access_token || '', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-invite-requests'] });
    },
  });
};
